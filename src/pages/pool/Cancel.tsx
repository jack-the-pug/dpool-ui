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
  const { account, chainId } = useWeb3React()
  const [cancelState, setCancelState] = useState<ActionState>(ActionState.WAIT)
  const dPoolContract = useDPoolContract(dPoolAddress)
  const cancelPool = useCallback(async () => {
    if (!dPoolContract || !poolId || !chainId || !isOwner) return
    setCancelState(ActionState.ING)
    try {
      const cancelPoolByIdRes = await dPoolContract.cancel([poolId])
      const transactionResponse: ContractReceipt =
        await cancelPoolByIdRes.wait()
      setCancelState(ActionState.SUCCESS)
      transactionResponse.logs
        .filter(
          (log) => log.address.toLowerCase() === dPoolAddress?.toLowerCase()
        )
        .forEach((log) => {
          const parseLog = contractIface.parseLog(log)
          if (parseLog.name === DPoolEvent.Cancel) {
            getPoolDetail()
          }
        })
    } catch (err: any) {
      toast.error(typeof err === 'object' ? err.message : JSON.stringify(err))
      setCancelState(ActionState.FAILED)
    }
  }, [dPoolContract, chainId])

  if (!poolMeta || !account) return null
  if (poolMeta.state !== PoolState.Initialized) return null
  if (!isOwner) {
    return null
  }
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
