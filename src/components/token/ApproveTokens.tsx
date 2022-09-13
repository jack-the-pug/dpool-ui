import { BigNumber, ethers, utils } from 'ethers'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useApproveToken } from '../../hooks/useApproveToken'
import useDPoolAddress from '../../hooks/useDPoolAddress'
import useTokenMeta from '../../hooks/useTokenMeta'
import { ActionState, PermitCallData, TokenMeta } from '../../type'
import { hooks as metaMaskHooks } from '../../connectors/metaMask'
import { useERC20Permit } from '../../hooks/useERC20Permit'
import { AddressLink } from '../hash'
import { EosIconsBubbleLoading } from '../icon'
import { Button } from '../button'

enum ApproveType {
  LIMIT = 'LIMIT',
  MAX = 'MAX',
}
export interface ApproveState {
  isApproved: boolean
  signatureData: undefined | PermitCallData
}

const { useChainId } = metaMaskHooks
export default function ApproveTokens(props: {
  tokens: {
    address: string
    amount: BigNumber
  }[]
  onTokensApproved: Function
}) {
  const { dPoolAddress } = useDPoolAddress()
  const { tokens, onTokensApproved } = props
  const [tokensApproveState, setTokensApproveState] = useState<ApproveState[]>(
    () =>
      tokens.map(
        (): ApproveState => ({
          isApproved: false,
          signatureData: undefined,
        })
      )
  )
  useEffect(() => {
    for (let i = 0; i < tokensApproveState.length; i++) {
      if (!tokensApproveState[i].isApproved) return
    }
    onTokensApproved(tokensApproveState)
  }, [tokensApproveState])
  if (!dPoolAddress) return null
  return (
    <div className="flex flex-col gap-4">
      {tokens.map((token, index) => (
        <ApproveToken
          key={token.address}
          token={token.address}
          dPoolAddress={dPoolAddress}
          approveAmount={token.amount}
          onApproved={(signData) => {
            if (tokensApproveState[index].isApproved) return
            const _tokensApproveState = tokensApproveState.map((data) => ({
              ...data,
            }))
            _tokensApproveState[index].isApproved = true
            _tokensApproveState[index].signatureData = signData
            setTokensApproveState(_tokensApproveState)
          }}
        />
      ))}
    </div>
  )
}

export interface ApproveTokenProps {
  token: string
  dPoolAddress: string
  approveAmount: BigNumber
  onApproved: (signatureData: PermitCallData | undefined) => void
  selectClass?: string
}
export function ApproveToken(props: ApproveTokenProps) {
  const chainId = useChainId()
  const { token, dPoolAddress, approveAmount, onApproved, selectClass } = props
  const { approveToken, getApprovedAmount } = useApproveToken(dPoolAddress)
  const { getToken } = useTokenMeta()
  const { isSupportPermit, getSignatureData } = useERC20Permit(token)

  const [signatureData, setSignatureData] = useState<PermitCallData>()
  const [tokenMeta, setTokenMeta] = useState<TokenMeta>()
  const [approveType, setApproveType] = useState<ApproveType>(ApproveType.LIMIT)
  const [approveState, setApproveState] = useState<ActionState>(
    ActionState.WAIT
  )
  const [approvedAmount, setApprovedAmount] = useState<BigNumber>(
    BigNumber.from(0)
  )

  const shouldApproveAmount = useMemo(() => {
    if (approvedAmount.gte(approveAmount)) return BigNumber.from(0)
    return approveAmount
  }, [approveAmount, approvedAmount])

  useEffect(() => {
    getToken(token).then(setTokenMeta)
  }, [token, chainId])
  useEffect(() => {
    getApprovedAmount(token).then(
      (amount) => amount && setApprovedAmount(amount)
    )
  }, [getApprovedAmount])

  const handleApprove = useCallback(async () => {
    if (!tokenMeta) return
    setApproveState(ActionState.ING)
    const approveTokenReq = await approveToken(
      tokenMeta.address,
      approveType === ApproveType.LIMIT
        ? shouldApproveAmount
        : ethers.constants.MaxUint256
    )
    const [isApproved] = approveTokenReq
    setApproveState(isApproved ? ActionState.SUCCESS : ActionState.FAILED)
  }, [tokenMeta, approveType, shouldApproveAmount, approveToken])
  const handleSign = useCallback(async () => {
    setApproveState(ActionState.ING)
    try {
      const signatureData = await getSignatureData(
        shouldApproveAmount,
        dPoolAddress
      )
      if (signatureData) {
        const { tokenAddress, amount, v, r, s, deadline } = signatureData
        setSignatureData({
          token: tokenAddress,
          value: amount,
          deadline,
          r,
          v,
          s,
        })
        setApproveState(ActionState.SUCCESS)
      } else {
        setApproveState(ActionState.FAILED)
      }
    } catch {
      setApproveState(ActionState.FAILED)
    }
  }, [token, getSignatureData, shouldApproveAmount, dPoolAddress])

  const isApproved = useMemo(() => {
    if (BigNumber.from(token).eq(0)) return true
    if (shouldApproveAmount.eq(0)) return true
    return approveState === ActionState.SUCCESS
  }, [approveState, shouldApproveAmount, token, tokenMeta])

  useEffect(() => {
    if (isApproved) {
      onApproved(signatureData)
    }
  }, [isApproved, onApproved, signatureData])

  if (isApproved || BigNumber.from(token).eq(0)) return null
  return (
    <div className="w-full rounded-lg cursor-pointer flex justify-between items-center bg-neutral-200 px-1 py-1">
      <div className="text-xs text-gray-500 pl-2">
        Allow the <AddressLink address={dPoolAddress}>dPool</AddressLink> to use
        your{' '}
        {isSupportPermit ? (
          `${utils.formatUnits(shouldApproveAmount, tokenMeta?.decimals)} ${
            tokenMeta ? tokenMeta.symbol : ''
          }`
        ) : (
          <select
            className={`outline-none bg-neutral-200 mr-2 ${selectClass}`}
            onChange={(e) =>
              setApproveType(e.target.value as unknown as ApproveType)
            }
          >
            <option value={ApproveType.LIMIT} className="bg-neutral-200">
              {`${utils.formatUnits(
                shouldApproveAmount,
                tokenMeta?.decimals
              )} ${tokenMeta ? tokenMeta.symbol : ''}`}
            </option>
            <option value={ApproveType.MAX}>Max {tokenMeta?.symbol}</option>
          </select>
        )}
      </div>

      <Button
        onClick={isSupportPermit ? handleSign : handleApprove}
        loading={approveState === ActionState.ING}
        className="rounded-lg ml-1 text py-1 px-2 bg-green-500 text-white w-28 flex justify-center border-none hover:text-white"
      >
        Approve
      </Button>
    </div>
  )
}
