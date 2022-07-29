import { useWeb3React } from '@web3-react/core'
import { BigNumber, ContractReceipt, ethers } from 'ethers'
import { useState, useMemo, useCallback, useEffect } from 'react'
import { toast } from 'react-toastify'
import { ActionState } from '../../components/action'
import { ApproveToken } from '../../components/token/ApproveTokens'
import { SignatureData, useERC20Permit } from '../../hooks/useERC20Permit'
import { PoolState, DPoolEvent, TokenMeta } from '../../type'
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
  isTokensApproved: boolean
  setIsTokensApproved: (b: boolean) => void
}

export function Fund(props: FundProps) {
  const {
    poolMeta,
    dPoolAddress,
    tokenMeta,
    poolId,
    getPoolDetail,
    setIsTokensApproved,
    isTokensApproved,
  } = props
  if (!tokenMeta) return null
  if (!poolMeta || !dPoolAddress) return null
  if (poolMeta.state !== PoolState.Initialized) return null

  const { account, chainId } = useWeb3React()
  const dPoolContract = useDPoolContract(tokenMeta.address)

  const distributor = BigNumber.from(poolMeta.distributor)
  if (
    !distributor.eq(0) &&
    poolMeta.distributor.toLowerCase() !== account?.toLowerCase()
  )
    return null

  const [fundState, setFundState] = useState<ActionState>(ActionState.WAIT)
  const { isSupportPermit, getSignatureData } = useERC20Permit(dPoolAddress)
  const nativeTokenAmount = useMemo(() => {
    if (!BigNumber.from(poolMeta.token).eq(0)) return BigNumber.from(0)
    return poolMeta.totalAmount
  }, [poolMeta])

  const fundPool = useCallback(async () => {
    if (!dPoolContract || !poolId || !chainId) return
    setFundState(ActionState.ING)
    try {
      let fundPoolByIdRes
      if (isSupportPermit) {
        const signatureData = await getSignatureData(
          poolMeta.totalAmount,
          dPoolAddress
        )
        const fundWithPermitCallData = [
          tokenMeta.address,
          poolMeta.totalAmount.toString(),
          signatureData?.deadline,
          signatureData?.v,
          signatureData?.r,
          signatureData?.s,
        ]
        console.log('fundWithPermitCallData', fundWithPermitCallData)
        fundPoolByIdRes = await dPoolContract.fundWithPermit(
          poolId,
          fundWithPermitCallData,
          {
            value: nativeTokenAmount,
          }
        )
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
          if (parseLog.name === DPoolEvent.Funded) {
            getPoolDetail()
          }
        })
    } catch (err: any) {
      toast.error(typeof err === 'object' ? err.message : JSON.stringify(err))
      setFundState(ActionState.FAILED)
    }
  }, [dPoolContract, chainId, poolId, nativeTokenAmount, isSupportPermit])

  return (
    <div className="flex gap-2 items-center">
      <ApproveToken
        token={tokenMeta.address}
        approveAmount={poolMeta.totalAmount}
        dPoolAddress={dPoolAddress}
        onApproved={() => setIsTokensApproved(true)}
        selectClass="bg-neutral-200"
      />
      {BigNumber.from(poolMeta.distributor).eq(0) ? null : (
        <RenderActionButton
          state={fundState}
          stateMsgMap={{
            [ActionState.WAIT]: 'Fund',
            [ActionState.ING]: 'Funding',
            [ActionState.SUCCESS]: 'Funded',
            [ActionState.FAILED]: 'Fund failed.Try again',
          }}
          onClick={fundPool}
          waitClass={`${
            isTokensApproved
              ? ''
              : 'text-gray-500 border-gray-400 cursor-not-allowed'
          } `}
        />
      )}
    </div>
  )
}
