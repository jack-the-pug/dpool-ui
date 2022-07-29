import { useWeb3React } from '@web3-react/core'
import { BigNumber, ContractReceipt, ethers } from 'ethers'
import { useState, useCallback } from 'react'
import { toast } from 'react-toastify'
import { ActionState } from '../../components/action'
import { PoolState, DPoolEvent } from '../../type'
import { Pool } from './PoolDetail'
import useDPoolContract from '../../hooks/useDPool'
import dPoolABI from '../../abis/dPool.json'
import RenderActionButton from '../../components/action'

const contractIface = new ethers.utils.Interface(dPoolABI)

interface DistributeProps {
  poolMeta: Pool | undefined
  dPoolAddress: string | undefined
  poolId: string
  getPoolDetail: Function
  isTokensApproved: boolean
}
export function Distribute(props: DistributeProps) {
  const { account, chainId } = useWeb3React()
  const { poolMeta, dPoolAddress, isTokensApproved, poolId, getPoolDetail } =
    props
  if (!poolMeta || !account) return null
  if (poolMeta.state === PoolState.Closed) return null

  const distributor = BigNumber.from(poolMeta.distributor)
  if (!distributor.eq(0) && !distributor.eq(account)) return null
  const [distributionState, setDistributionState] = useState<ActionState>(
    ActionState.WAIT
  )
  const dPoolContract = useDPoolContract(dPoolAddress)
  const [distributeTx, setDistributeTx] = useState<string>()

  const distributePool = useCallback(async () => {
    if (!dPoolContract || !poolId || !chainId) return
    setDistributionState(ActionState.ING)
    const successClaimedAddress: string[] = []

    try {
      const distributionPoolByIdRes = await dPoolContract.distribute(poolId)
      const transactionResponse: ContractReceipt =
        await distributionPoolByIdRes.wait()
      setDistributeTx(transactionResponse.transactionHash)
      setDistributionState(ActionState.SUCCESS)

      transactionResponse.logs
        .filter(
          (log) => log.address.toLowerCase() === dPoolAddress?.toLowerCase()
        )
        .forEach((log) => {
          const parseLog = contractIface.parseLog(log)

          if (parseLog.name === DPoolEvent.Claimed) {
            successClaimedAddress.push(parseLog.args[1])
          }
        })
      getPoolDetail()
    } catch (err: any) {
      toast.error(typeof err === 'object' ? err.message : JSON.stringify(err))
      setDistributionState(ActionState.FAILED)
    }
  }, [dPoolContract, chainId])
  return (
    <RenderActionButton
      state={distributionState}
      stateMsgMap={{
        [ActionState.WAIT]: distributor.eq(0)
          ? ' Fund and Distribute'
          : 'Distribute',
        [ActionState.ING]: 'Distributing',
        [ActionState.SUCCESS]: 'Distributed',
        [ActionState.FAILED]: 'Distribute failed.Try again',
      }}
      tx={distributeTx}
      onClick={isTokensApproved ? distributePool : () => {}}
      waitClass={
        isTokensApproved
          ? 'text-green-500 border-green-500'
          : 'text-gray-500 border-gray-400 cursor-not-allowed'
      }
      failedClass="text-green-500 border-green-500"
    />
  )
}
