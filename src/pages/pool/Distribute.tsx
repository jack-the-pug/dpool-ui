import { useWeb3React } from '@web3-react/core'
import { BigNumber, utils } from 'ethers'
import { useState, useCallback } from 'react'
import { ActionState } from '../../type/index'
import { PoolState, DPoolEvent, TokenMeta } from '../../type'
import { Pool } from './PoolDetail'
import { useCallDPoolContract } from '../../hooks/useContractCall'
import { Button } from '../../components/button'
import { EstimateGas } from '../../components/estimateGas'

interface DistributeProps {
  poolMeta: Pool | undefined
  dPoolAddress: string
  poolId: string
  getPoolDetail: Function
  submittable: boolean
  tokenMeta: TokenMeta | undefined
  getPoolEvent: Function
}
export function Distribute(props: DistributeProps) {
  const {
    poolMeta,
    dPoolAddress,
    submittable,
    poolId,
    getPoolDetail,
    tokenMeta,
    getPoolEvent,
  } = props

  const { account, chainId } = useWeb3React()
  const [distributionState, setDistributionState] = useState<ActionState>(
    ActionState.WAIT
  )
  const callDPool = useCallDPoolContract(dPoolAddress)
  const distributePool = useCallback(async () => {
    if (!poolId || !chainId) return
    setDistributionState(ActionState.ING)
    const result = await callDPool(
      'distribute',
      [poolId],
      DPoolEvent.Distributed
    )
    if (!result.success) {
      setDistributionState(ActionState.FAILED)
      return
    }
    setDistributionState(ActionState.SUCCESS)
    if (result.data.logs.length) {
      getPoolDetail()
      getPoolEvent()
    }
  }, [callDPool, chainId, poolMeta])

  if (!tokenMeta || !poolMeta) return null
  if (poolMeta.state !== PoolState.Funded) return null
  const distributor = BigNumber.from(poolMeta.distributor)
  if (!account) return null
  if (!distributor.eq(0) && account.toLowerCase() !== poolMeta.distributor.toLowerCase()) return null

  return (
    <div className='flex flex-col ml-5'>
      <div className='bg-white rounded-lg py-4 px-2'>
        <div className='flex gap-20 items-center justify-between px-2 border-b border-gray-200 border-solid'>
          <span className='text-lg font-semibold'>Distribute</span>
          <div>
            <span className='text-2xl font-bold'>{utils.formatUnits(poolMeta.totalAmount, tokenMeta.decimals)}</span>
            <span>{tokenMeta.symbol}</span>
          </div>
        </div>
        <Button
          disable={!submittable}
          loading={distributionState === ActionState.ING}
          onClick={distributePool}
          className="bal-btn mt-8 px-4 h-12 text-base 
          font-bold
          bg-gradient-to-tr from-green-200 to-gray-300
          hover:from-green-400 hover:to-purple-300 transition-colors
         text-black border-none block w-full hover:text-black rounded-lg shadow hover:shadow-none cursor-pointer"
        >
          Distribute
        </Button>
        <EstimateGas method="distribute" arg={[poolId]} />
      </div>
    </div>
  )
}
