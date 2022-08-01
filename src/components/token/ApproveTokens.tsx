import { BigNumber, ethers, utils } from 'ethers'
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import Action, { ActionState } from '../action'
import { useApproveToken } from '../../hooks/useApproveToken'
import useDPoolAddress from '../../hooks/useDPoolAddress'
import useTokenMeta from '../../hooks/useTokenMeta'
import { PermitCallData, TokenMeta } from '../../type'
import { hooks as metaMaskHooks } from '../../connectors/metaMask'
import { SignatureData, useERC20Permit } from '../../hooks/useERC20Permit'

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
    console.log('tokensApproveState changed')
    for (let i = 0; i < tokensApproveState.length; i++) {
      if (!tokensApproveState[i].isApproved) return
    }
    console.log('onTokensApproved')
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
  const [approveTx, setApproveTx] = useState<string>()
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
    const [isApproved, tx] = approveTokenReq
    setApproveState(isApproved ? ActionState.SUCCESS : ActionState.FAILED)
    if (isApproved && tx) {
      setApproveTx(tx)
    }
  }, [tokenMeta, approveType, shouldApproveAmount, approveToken])
  const handleSign = useCallback(async () => {
    setApproveState(ActionState.ING)
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
    }
    setApproveState(ActionState.SUCCESS)
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

  if (isApproved) return null
  return (
    <div className="flex items-start">
      {!isSupportPermit ? (
        <select
          className={`outline-none mr-2 ${selectClass}`}
          onChange={(e) =>
            setApproveType(e.target.value as unknown as ApproveType)
          }
        >
          <option value={ApproveType.LIMIT}>
            {`${utils.formatUnits(shouldApproveAmount, tokenMeta?.decimals)} ${
              tokenMeta ? tokenMeta.symbol : ''
            }`}
          </option>
          <option value={ApproveType.MAX}>Max {tokenMeta?.symbol}</option>
        </select>
      ) : null}
      <div>
        <Action
          state={approveState}
          stateMsgMap={{
            [ActionState.WAIT]: `Approve`,
            [ActionState.ING]: `Approving`,
            [ActionState.FAILED]: `Failed. Try again`,
            [ActionState.SUCCESS]: `Approved`,
          }}
          onClick={isSupportPermit ? handleSign : handleApprove}
          tx={approveTx}
        />
      </div>
    </div>
  )
}
