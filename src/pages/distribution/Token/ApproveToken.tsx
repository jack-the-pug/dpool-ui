import { BigNumber, ethers, utils } from 'ethers'
import { useCallback, useContext, useEffect, useState } from 'react'
import Action, { ActionState } from '../../../components/action'
import { EosIconsBubbleLoading } from '../../../components/icon'
import { useApproveToken } from '../../../hooks/useApproveToken'
import useTokenMeta from '../../../hooks/useTokenMeta'
import { TokenMeta } from '../../../type'

enum ApproveType {
  LIMIT = 'LIMIT',
  MAX = 'MAX',
}

export default function ApproveToken(props: {
  dPoolAddress: string
  tokenAddress: string
  approveAmount: BigNumber
  approveState: ActionState
  setApproveState: (state: ActionState) => void
}) {
  const {
    dPoolAddress,
    tokenAddress,
    approveAmount,
    approveState,
    setApproveState,
  } = props
  const { getToken } = useTokenMeta()

  const [tokenMeta, setTokenMeta] = useState<TokenMeta>()
  const { approveToken, getApprovedAmount } = useApproveToken(dPoolAddress)

  const [approveType, setApproveType] = useState<ApproveType>(ApproveType.LIMIT)

  const [approvedAmount, setApprovedAmount] = useState<BigNumber>(
    BigNumber.from(0)
  )

  useEffect(() => {
    getToken(tokenAddress).then((token) => {
      setTokenMeta(token)
    })
  }, [])

  useEffect(() => {
    if (BigNumber.from(tokenAddress).eq(0)) return
    getApprovedAmount(tokenAddress).then(setApprovedAmount)
  }, [tokenAddress])

  const [approveTx, setApproveTx] = useState<string>()
  const handleApprove = useCallback(() => {
    setApproveState(ActionState.ING)
    approveToken(
      tokenAddress,
      approveType === ApproveType.LIMIT
        ? approveAmount
        : ethers.constants.MaxUint256
    )
      .then((res) => {
        const [isApproved, tx] = res
        if (!isApproved) {
          setApproveState(ActionState.FAILED)
        } else {
          setApproveState(ActionState.SUCCESS)
          if (tx) {
            setApproveTx(tx)
          }
        }
      })
      .catch(() => {
        setApproveState(ActionState.FAILED)
      })
  }, [approveType, approveAmount])

  if (!tokenMeta) return null
  if (BigNumber.from(tokenAddress).eq(0) || approvedAmount.gte(approveAmount)) {
    setApproveState(ActionState.SUCCESS)
    return null
  }
  console.log({
    approveAmount: approveAmount.toString(),
    approvedAmount: approvedAmount.toString(),
  })
  return (
    <div className="flex">
      <select
        className="outline-none mr-2"
        onChange={(e) =>
          setApproveType(e.target.value as unknown as ApproveType)
        }
      >
        <option value={ApproveType.LIMIT}>
          {utils.formatUnits(approveAmount, tokenMeta.decimals)}{' '}
          {tokenMeta.symbol}
        </option>
        <option value={ApproveType.MAX}>Max {tokenMeta?.symbol}</option>
      </select>
      <Action
        state={approveState}
        stateMsgMap={{
          [ActionState.WAIT]: `Approve`,
          [ActionState.ING]: `Approveing`,
          [ActionState.FAILED]: `Fiald.Try again`,
          [ActionState.SUCCESS]: `Approved`,
        }}
        onClick={handleApprove}
        tx={approveTx}
      />
    </div>
  )
}
