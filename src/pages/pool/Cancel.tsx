import { useWeb3React } from '@web3-react/core'
import { ContractReceipt, ethers } from 'ethers'
import { useState, useCallback } from 'react'
import { toast } from 'react-toastify'
import { ActionState } from '../../components/action'
import { PoolState, DPoolEvent } from '../../type'
import { Pool } from './PoolDetail'
import useDPoolContract from '../../hooks/useDPool'
import dPoolABI from '../../abis/dPool.json'
import RenderActionButton from '../../components/action'
import { useCallDPoolContract } from '../../hooks/useContractCall'

const contractIface = new ethers.utils.Interface(dPoolABI)
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
    const result = await callDPool('cancel', [poolId], DPoolEvent.Cancel)
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
    <RenderActionButton
      state={cancelState}
      stateMsgMap={{
        [ActionState.WAIT]: 'Cancel',
        [ActionState.ING]: 'Canceling',
        [ActionState.SUCCESS]: 'Canceled',
        [ActionState.FAILED]: 'Failed. Try again',
      }}
      onClick={cancelPool}
      waitClass="text-red-500 border-red-500"
    />
  )
}
