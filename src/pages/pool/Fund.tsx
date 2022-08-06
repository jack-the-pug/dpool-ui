import { useWeb3React } from '@web3-react/core'
import { BigNumber, ContractReceipt, ethers } from 'ethers'
import { useState, useMemo, useCallback, useEffect } from 'react'
import { toast } from 'react-toastify'
import { ActionState } from '../../components/action'
import { ApproveToken } from '../../components/token/ApproveTokens'
import { SignatureData, useERC20Permit } from '../../hooks/useERC20Permit'
import { PoolState, DPoolEvent, TokenMeta, PermitCallData } from '../../type'
import { Pool } from './PoolDetail'
import useDPoolContract from '../../hooks/useDPool'
import dPoolABI from '../../abis/dPool.json'
import RenderActionButton from '../../components/action'

const contractIface = new ethers.utils.Interface(dPoolABI)

interface FundProps {
  poolMeta: Pool | undefined
  dPoolAddress: string | undefined
  tokenMeta: TokenMeta | undefined
  poolId: string
  getPoolDetail: Function
  submittable: boolean
  setSubmittable: (b: boolean) => void
}

export function Fund(props: FundProps) {
  const {
    poolMeta,
    dPoolAddress,
    tokenMeta,
    poolId,
    getPoolDetail,
    setSubmittable,
    submittable,
  } = props
  if (
    !tokenMeta ||
    !poolMeta ||
    !dPoolAddress ||
    poolMeta.state !== PoolState.Initialized
  )
    return null
  const { account } = useWeb3React()
  const dPoolContract = useDPoolContract(dPoolAddress)
  const distributor = BigNumber.from(poolMeta.distributor)
  const [fundState, setFundState] = useState<ActionState>(ActionState.WAIT)
  const [signatureData, setSignatureData] = useState<PermitCallData>()
  const nativeTokenAmount = useMemo(() => {
    if (!BigNumber.from(poolMeta.token).eq(0)) return BigNumber.from(0)
    return poolMeta.totalAmount
  }, [poolMeta])

  const fundPool = useCallback(async () => {
    if (!dPoolContract || !poolId) return
    setFundState(ActionState.ING)
    try {
      let fundPoolByIdRes
      // every one can distribute
      if (distributor.eq(0)) {
        if (signatureData) {
          fundPoolByIdRes = await dPoolContract.distributeWithPermit(poolId, [
            signatureData.token,
            signatureData.value,
            signatureData.deadline,
            signatureData.v,
            signatureData.r,
            signatureData.s,
          ])
        } else {
          fundPoolByIdRes = await dPoolContract.distribute(poolId)
        }
      } else {
        fundPoolByIdRes = await dPoolContract.fund(poolId, {
          value: nativeTokenAmount,
        })
      }
      const transactionResponse: ContractReceipt = await fundPoolByIdRes.wait()
      setFundState(ActionState.SUCCESS)
      transactionResponse.logs
        .filter(
          (log) => log.address.toLowerCase() === dPoolAddress.toLowerCase()
        )
        .forEach((log) => {
          const parseLog = contractIface.parseLog(log)
          if (signatureData) {
            if (parseLog.name === DPoolEvent.Distribute) {
              getPoolDetail()
            }
          } else {
            if (parseLog.name === DPoolEvent.Funded) {
              getPoolDetail()
            }
          }
        })
    } catch (err: any) {
      console.error(err)
      toast.error(typeof err === 'object' ? err.message : JSON.stringify(err))
      setFundState(ActionState.FAILED)
    }
  }, [dPoolContract, poolId, nativeTokenAmount, signatureData])
  if (
    !distributor.eq(0) &&
    account?.toLowerCase() !== poolMeta.distributor.toLowerCase()
  )
    return null
  return (
    <div className="flex gap-2 items-center justify-start">
      <ApproveToken
        token={tokenMeta.address}
        approveAmount={poolMeta.totalAmount}
        dPoolAddress={dPoolAddress}
        onApproved={(signatureData) => {
          setSubmittable(true)
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
        onClick={submittable ? fundPool : () => {}}
        waitClass={`${
          submittable ? '' : 'text-gray-500 border-gray-400 cursor-not-allowed'
        } `}
      />
    </div>
  )
}
