import { useWeb3React } from "@web3-react/core";
import { BigNumber, utils } from "ethers";
import { useCallback, useEffect, useState } from "react";
import { Button } from "../../components/button";
import { EstimateGas } from "../../components/estimateGas";
import { useDPoolContract } from "../../hooks/useContract";
import { useCallDPoolContract } from "../../hooks/useContractCall";
import { ActionState, DPoolEvent, PoolState, TokenMeta } from "../../type";
import { Pool } from "./PoolDetail";

interface ClaimProps {
  poolId: string
  poolMeta: Pool
  dPoolAddress: string
  tokenMeta: TokenMeta
  getPoolDetail: Function
}
export function Claim(props: ClaimProps) {
  const { poolMeta, tokenMeta, poolId, dPoolAddress, getPoolDetail } = props
  const dPoolContract = useDPoolContract(dPoolAddress)
  const callDPool = useCallDPoolContract(dPoolAddress)
  const { account, chainId } = useWeb3React()
  const [claimerIndex, setClaimerIndex] = useState<number>(-1)
  const [claimState, setClaimState] = useState<ActionState>(ActionState.WAIT)
  const [claimedAmount, setClaimedAmount] = useState<BigNumber>(BigNumber.from(0))
  useEffect(() => {
    const index = poolMeta.claimers.findIndex(address => address.toLowerCase() === account?.toLowerCase())
    setClaimerIndex(index)
  }, [account, poolMeta.claimers])

  useEffect(() => {
    if (!dPoolContract || !account) return
    dPoolContract.userClaimedAmount(account, poolId).then((claimedAmount: BigNumber) => {
      setClaimedAmount(claimedAmount)
    })
  }, [dPoolContract, account])

  const claim = useCallback(async () => {
    if (!poolId || !chainId || !account) return
    setClaimState(ActionState.ING)
    const result = await callDPool(
      'claimSinglePool',
      [poolId, claimerIndex],
      DPoolEvent.Claimed
    )
    if (!result.success) {
      setClaimState(ActionState.FAILED)
      return
    }
    const { logs } = result.data
    setClaimedAmount(poolMeta.amounts[claimerIndex])
    if (logs.length) {
      // last one
      if (poolMeta.totalAmount.sub(poolMeta.claimedAmount).eq(poolMeta.amounts[claimerIndex])) {
        getPoolDetail()
      }
    }
  }, [
    claimerIndex,
    chainId,
    poolId,
    poolMeta,
  ])
  if (poolMeta.state !== PoolState.Funded) return null
  if (poolMeta.startTime === 281474976710655) return null
  if (claimerIndex === -1) return null
  if (claimedAmount.gt(0)) return null
  return <div className='flex flex-col ml-5'>
    <div className='bg-white rounded-lg py-4 px-2'>
      <div className='flex gap-20 items-center justify-between px-2 border-b border-gray-200 border-solid'>
        <span className='text-lg font-semibold'>Claim</span>
        <div>
          <span className='text-2xl font-bold'>{utils.formatUnits(poolMeta.amounts[claimerIndex], tokenMeta.decimals)}</span>
          <span>{tokenMeta.symbol}</span>
        </div>
      </div>
      <Button
        loading={claimState === ActionState.ING}
        onClick={claim}
        className="bal-btn mt-8 px-4 h-12 text-base 
      font-bold
      bg-gradient-to-tr from-green-200 to-gray-300
      hover:from-green-400 hover:to-purple-300 transition-colors
     text-black border-none block w-full hover:text-black rounded-lg shadow hover:shadow-none cursor-pointer"
      >
        Claim
      </Button>
      <EstimateGas method="claimSinglePool" arg={[poolId, claimerIndex]} />
    </div>
  </div>
}