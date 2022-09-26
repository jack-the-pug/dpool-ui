import { useWeb3React } from '@web3-react/core'
import { BigNumber } from 'ethers'
import { useState, useMemo, useCallback, useEffect } from 'react'
import { ActionState } from '../../type'
import { ApproveToken } from '../../components/token/ApproveTokens'
import { PoolState, DPoolEvent, TokenMeta, PermitCallData } from '../../type'
import { Pool } from './PoolDetail'
import { useCallDPoolContract } from '../../hooks/useContractCall'
import { Button } from '../../components/button'
import useTokenMeta from '../../hooks/useTokenMeta'
import { EstimateGas } from '../../components/estimateGas'

interface FundProps {
  poolMeta: Pool | undefined
  dPoolAddress: string | undefined
  tokenMeta: TokenMeta | undefined
  poolId: string
  getPoolDetail: Function
  isApproved: boolean
  setIsApproved: (b: boolean) => void
  getPoolEvent: Function
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
    getPoolEvent,
  } = props
  if (
    !tokenMeta ||
    !poolMeta ||
    !dPoolAddress ||
    poolMeta.state !== PoolState.Initialized
  )
    return null
  const { account } = useWeb3React()
  const { getTokenBalance } = useTokenMeta()
  const callDPool = useCallDPoolContract(dPoolAddress)
  const distributor = BigNumber.from(poolMeta.distributor)
  const [fundState, setFundState] = useState<ActionState>(ActionState.WAIT)
  const [fundAndDistributeState, setFundAndDistributeState] =
    useState<ActionState>(ActionState.WAIT)
  const [signatureData, setSignatureData] = useState<PermitCallData>()
  const [tokenBalance, setTokenBalance] = useState<BigNumber>()

  useEffect(() => {
    getTokenBalance(tokenMeta.address).then(setTokenBalance)
  }, [tokenMeta, getTokenBalance])

  const nativeTokenAmount = useMemo(() => {
    if (!BigNumber.from(poolMeta.token).eq(0)) return BigNumber.from(0)
    return poolMeta.totalAmount
  }, [poolMeta])
  const permitData = useMemo(() => {
    return signatureData
      ? [
          signatureData.token,
          signatureData.value,
          signatureData.deadline,
          signatureData.v,
          signatureData.r,
          signatureData.s,
        ]
      : null
  }, [signatureData])
  const fundOnlyCallOption = useMemo(
    () =>
      permitData
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
          },
    [poolId, permitData, nativeTokenAmount]
  )
  const fundOnly = useCallback(async () => {
    if (!callDPool) return
    setFundState(ActionState.ING)
    const result = await callDPool(
      fundOnlyCallOption.method,
      fundOnlyCallOption.params,
      fundOnlyCallOption.eventName
    )
    if (!result.success) return setFundState(ActionState.FAILED)
    setFundState(ActionState.SUCCESS)
    if (result.data.logs.length) {
      getPoolEvent()
      getPoolDetail()
    }
  }, [callDPool, fundOnlyCallOption])

  const fundAndDistributeCallOption = useMemo(
    () =>
      permitData
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
          },
    [poolId, permitData, nativeTokenAmount]
  )

  const fundAndDistribute = useCallback(async () => {
    setFundAndDistributeState(ActionState.ING)
    const result = await callDPool(
      fundAndDistributeCallOption.method,
      fundAndDistributeCallOption.params,
      fundAndDistributeCallOption.eventName
    )
    if (!result.success) return setFundAndDistributeState(ActionState.FAILED)
    setFundAndDistributeState(ActionState.SUCCESS)
    if (result.data.logs.length) {
      getPoolEvent()
      getPoolDetail()
    }
  }, [fundAndDistributeCallOption, getPoolEvent, getPoolDetail])

  if (
    !distributor.eq(0) &&
    account?.toLowerCase() !== poolMeta.distributor.toLowerCase()
  )
    return null
  return (
    <div className="flex w-full  flex-col">
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
      <div className="flex items-center mt-2 gap-4 w-full">
        <div className="flex flex-col flex-1">
          <Button
            loading={fundState === ActionState.ING}
            disable={
              !isApproved ||
              (tokenBalance && tokenBalance.lt(poolMeta.totalAmount)) ||
              fundAndDistributeState === ActionState.ING
            }
            onClick={fundOnly}
          >
            {distributor.eq(0) ? 'Fund only' : 'Fund'}
          </Button>
          <EstimateGas
            method={fundOnlyCallOption.method}
            arg={fundOnlyCallOption.params}
          />
        </div>
        <div className="flex flex-col flex-1">
          {distributor.eq(0) && (
            <Button
              loading={fundAndDistributeState === ActionState.ING}
              disable={
                !isApproved ||
                (tokenBalance && tokenBalance.lt(poolMeta.totalAmount)) ||
                fundState === ActionState.ING
              }
              onClick={fundAndDistribute}
            >
              Fund and Distribute
            </Button>
          )}
          <EstimateGas
            method={fundAndDistributeCallOption.method}
            arg={fundAndDistributeCallOption.params}
          />
        </div>
      </div>
      {tokenBalance && tokenBalance.lt(poolMeta.totalAmount) && (
        <span className="text-xs text-red-500 my-1">Insufficient balance</span>
      )}
    </div>
  )
}
