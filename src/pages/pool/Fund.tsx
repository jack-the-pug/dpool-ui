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
      if (poolMeta.state === PoolState.Initialized) {
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
        if (signatureData) {
          fundPoolByIdRes = await dPoolContract.fundWithPermit(poolId, [
            signatureData.token,
            signatureData.value,
            signatureData.deadline,
            signatureData.v,
            signatureData.r,
            signatureData.s,
          ])
        }
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
            if (parseLog.name === DPoolEvent.Distributed) {
              getPoolDetail()
            }
          } else {
            if (parseLog.name === DPoolEvent.Funded) {
              getPoolDetail()
            }
          }
        })
    } catch (err: any) {
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
