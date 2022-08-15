import { useWeb3React } from '@web3-react/core'
import { useState, useCallback } from 'react'
import { PoolState, DPoolEvent, ActionState } from '../../type'
import { Pool } from './PoolDetail'
import { useCallDPoolContract } from '../../hooks/useContractCall'
import { EosIconsBubbleLoading } from '../../components/icon'

interface CancelProps {
  poolMeta: Pool | undefined
  dPoolAddress: string | undefined
  poolId: string
  getPoolDetail: Function
  isOwner: boolean
}

export function Cancel(props: CancelProps) {
  const { poolMeta, dPoolAddress, poolId, getPoolDetail, isOwner } = props
  if (
    !dPoolAddress ||
    !isOwner ||
    !poolMeta ||
    poolMeta.state === PoolState.Closed
  )
    return null
  const { account, chainId } = useWeb3React()
  const [cancelState, setCancelState] = useState<ActionState>(ActionState.WAIT)
  const callDPool = useCallDPoolContract(dPoolAddress)
  const cancelPool = useCallback(async () => {
    if (!poolId || !chainId || !isOwner) return
    setCancelState(ActionState.ING)
    const result = await callDPool('cancel', [[poolId]], DPoolEvent.Canceled)
    if (!result.success) {
      setCancelState(ActionState.FAILED)
      return
    }
    setCancelState(ActionState.SUCCESS)
    if (result.data.logs.length) {
      getPoolDetail()
    }
  }, [callDPool, chainId])

  if (!account) return null
  const { startTime, deadline } = poolMeta
  const nowTime = Date.now() / 1000
  if (nowTime >= startTime && nowTime <= deadline) {
    return null
  }
  return (
    <div
      className="flex items-center cursor-pointer text-gray-400 hover:text-red-500 "
      onClick={cancelState !== ActionState.ING ? cancelPool : undefined}
    >
      {cancelState === ActionState.ING && (
        <EosIconsBubbleLoading className="mr-1" />
      )}
      Cancel
    </div>
  )
}
