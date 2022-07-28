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
import { TokenMeta } from '../../type'
import { hooks as metaMaskHooks } from '../../connectors/metaMask'
import { useERC20Permit } from '../../hooks/useERC20Permit'
import useDPool from '../../hooks/useDPool'

enum ApproveType {
  LIMIT = 'LIMIT',
  MAX = 'MAX',
}
const { useChainId } = metaMaskHooks

export default function ApproveTokens(props: {
  tokens: {
    address: string
    amount: BigNumber
  }[]
  setIsTokensApproved: Dispatch<SetStateAction<boolean>>
}) {
  const { dPoolAddress } = useDPoolAddress()

  const { tokens, setIsTokensApproved } = props
  const [approvedTokens, setApprovedTokens] = useState<string[]>([])
  useEffect(() => {
    if (approvedTokens.length === tokens.length) {
      setIsTokensApproved(true)
    }
  }, [approvedTokens.length, tokens.length])

  if (!dPoolAddress) return null
  return (
    <div className="flex flex-col gap-4">
      {tokens.map((token) => (
        <ApproveToken
          key={token.address}
          token={token.address}
          dPoolAddress={dPoolAddress}
          approveAmount={token.amount}
          onApproved={() => {
            if (!approvedTokens.includes(token.address.toLowerCase())) {
              setApprovedTokens([
                ...approvedTokens,
                token.address.toLowerCase(),
              ])
            }
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
  onApproved: () => void
  selectClass?: string
}
export function ApproveToken(props: ApproveTokenProps) {
  const { token, dPoolAddress, approveAmount, onApproved, selectClass } = props

  const chainId = useChainId()
  const { approveToken, getApprovedAmount } = useApproveToken(dPoolAddress)
  const { getToken } = useTokenMeta()

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
    return approveAmount.sub(approvedAmount)
  }, [approveAmount, approvedAmount])

  const getSignatureData = useERC20Permit()
  useEffect(() => {
    getSignatureData(token, shouldApproveAmount, dPoolAddress).then(
      (signData: any) => {
        console.log('signData', signData)
      }
    )
  }, [getSignatureData, token, shouldApproveAmount, dPoolAddress])

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

  const isApproved = useMemo(() => {
    if (BigNumber.from(token).eq(0)) return true
    if (shouldApproveAmount.eq(0)) return true
    return approveState === ActionState.SUCCESS
  }, [approveState, shouldApproveAmount, token, tokenMeta])

  useEffect(() => {
    if (isApproved) {
      onApproved()
    }
  }, [isApproved, onApproved])

  if (isApproved) return null
  return (
    <div className="flex items-start">
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
      <div>
        <Action
          state={approveState}
          stateMsgMap={{
            [ActionState.WAIT]: `Approve`,
            [ActionState.ING]: `Approving`,
            [ActionState.FAILED]: `Failed. Try again`,
            [ActionState.SUCCESS]: `Approved`,
          }}
          onClick={handleApprove}
          tx={approveTx}
        />
      </div>
    </div>
  )
}
