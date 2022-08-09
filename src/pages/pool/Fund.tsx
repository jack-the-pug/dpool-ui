import { useWeb3React } from '@web3-react/core'
import { BigNumber, ContractReceipt, ethers } from 'ethers'
import { useState, useMemo, useCallback } from 'react'
import { toast } from 'react-toastify'
import { ActionState } from '../../components/action'
import { ApproveToken } from '../../components/token/ApproveTokens'
import { PoolState, DPoolEvent, TokenMeta, PermitCallData } from '../../type'
import { Pool } from './PoolDetail'
import useDPoolContract from '../../hooks/useDPool'
import dPoolABI from '../../abis/dPool.json'
import RenderActionButton from '../../components/action'
import {
  useCallContract,
  useCallDPoolContract,
} from '../../hooks/useContractCall'

const contractIface = new ethers.utils.Interface(dPoolABI)

interface FundProps {
  poolMeta: Pool | undefined
  dPoolAddress: string | undefined
  tokenMeta: TokenMeta | undefined
  poolId: string
  getPoolDetail: Function
  isApproved: boolean
  setIsApproved: (b: boolean) => void
}

export function Fund(props: FundProps) {
  const {
    poolMeta,
    dPoolAddress,
    tokenMeta,
    poolId,
    getPoolDetail,
    setIsApproved,
    isApproved,
  } = props
  if (
    !tokenMeta ||
    !poolMeta ||
    !dPoolAddress ||
    poolMeta.state !== PoolState.Initialized
  )
    return null
  const { account } = useWeb3React()

  const callDPool = useCallDPoolContract(dPoolAddress)

  const distributor = BigNumber.from(poolMeta.distributor)
  const [fundState, setFundState] = useState<ActionState>(ActionState.WAIT)
  const [signatureData, setSignatureData] = useState<PermitCallData>()
  const nativeTokenAmount = useMemo(() => {
    if (!BigNumber.from(poolMeta.token).eq(0)) return BigNumber.from(0)
    return poolMeta.totalAmount
  }, [poolMeta])


  const callOption = useMemo(() => {
    const permitData = signatureData
      ? [
          signatureData.token,
          signatureData.value,
          signatureData.deadline,
          signatureData.v,
          signatureData.r,
          signatureData.s,
        ]
      : null
    // fund and distribute
    if (distributor.eq(0)) {
      // with permit
      return permitData
        ? {
            method: 'distributeWithPermit',
            params: [poolId, permitData],
            eventName: DPoolEvent.Distributed,
          }
        : {
            method: 'distribute',
            params: [
              poolId,
              {
                value: nativeTokenAmount,
              },
            ],
            eventName: DPoolEvent.Distributed,
          }
    }
    // only fund
    else {
      return permitData
        ? {
            method: 'fundWithPermit',
            params: [poolId, permitData],
            eventName: DPoolEvent.Funded,
          }
        : {
            method: 'fund',
            params: [
              poolId,
              {
                value: nativeTokenAmount,
              },
            ],
            eventName: DPoolEvent.Funded,
          }
    }
  }, [distributor, signatureData, poolId, nativeTokenAmount])

  const fundPool = useCallback(async () => {
    if (!callDPool || !poolId) return
    setFundState(ActionState.ING)
    const result = await callDPool(
      callOption.method,
      callOption.params,
      callOption.eventName
    )
    if (!result.success) {
      setFundState(ActionState.FAILED)
      return
    }
    setFundState(ActionState.SUCCESS)
    if (result.data.logs.length) {
      getPoolDetail()
    }
  }, [callOption, callDPool])

  if (
    !distributor.eq(0) &&
    account?.toLowerCase() !== poolMeta.distributor.toLowerCase()
  )
    return null
  return (
    <div className="flex gap-2 items-center justify-end">

      <ApproveToken
        token={tokenMeta.address}
        approveAmount={poolMeta.totalAmount}
        dPoolAddress={dPoolAddress}
        onApproved={(signatureData) => {
          setIsApproved(true)

          if (signatureData) {
            setSignatureData(signatureData)
          }
        }}
        selectClass="bg-neutral-200"
      />
      <RenderActionButton
        state={fundState}
        stateMsgMap={{
          [ActionState.WAIT]: distributor.eq(0)
            ? 'Fund and Distribute'
            : 'Fund',
          [ActionState.ING]: 'Funding',
          [ActionState.SUCCESS]: 'Funded',
          [ActionState.FAILED]: 'Fund failed.Try again',
        }}
        onClick={isApproved ? fundPool : () => {}}
        waitClass={`${
          isApproved ? '' : 'text-gray-500 border-gray-400 cursor-not-allowed'

        } `}
      />
    </div>
  )
}
