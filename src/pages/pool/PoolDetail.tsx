import { BigNumber, ContractReceipt, ethers, utils } from 'ethers'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { hooks as metaMaskHooks } from '../../connectors/metaMask'
import {
  BasePool,
  DPoolEvent,
  GetPoolRes,
  PoolRow,
  PoolState,
  TokenMeta,
} from '../../type'
import useDPoolContract from '../../hooks/useDPool'

import { EosIconsBubbleLoading } from '../../components/icon'
import { dPoolABI } from '../../constants'
import { toast } from 'react-toastify'
import { useParams, useNavigate } from 'react-router-dom'
import RenderActionButton, { ActionState } from '../../components/action'
import { format } from 'date-fns'
import useDPoolAddress from '../../hooks/useDPoolAddress'

import useTokenMeta from '../../hooks/useTokenMeta'
import ApproveTokens, {
  ApproveToken,
} from '../../components/token/ApproveTokens'
import { formatCurrencyAmount } from '../../utils/number'
import useAddressBook from '../../hooks/useAddressBook'
import { LOCAL_STORAGE_KEY } from '../../store/storeKey'
import { DistributePageCache, TPoolRow } from '../distribution/CreatePool'

export type Pool = BasePool & {
  state: PoolState
}

export interface TableRow {
  address: string
  amount: BigNumber
}

const { useAccount, useChainId, useProvider } = metaMaskHooks
const contractIface = new ethers.utils.Interface(dPoolABI)

const stateMsg = {
  [PoolState.Initialized]: 'Initialized',
  [PoolState.Funded]: 'Funded',
  [PoolState.None]: 'None',
  [PoolState.Closed]: 'Closed',
}
const stateColorMap = {
  [PoolState.Initialized]: '#6B7280',
  [PoolState.Funded]: '#34D399',
  [PoolState.None]: '#DC2626',
  [PoolState.Closed]: '#6B7280',
}

function RenderState({ state, title }: { state: PoolState; title: string }) {
  const colorClass = useMemo(() => stateColorMap[state], [state])
  return (
    <div className="flex">
      <div className="ml-2 text-gray-500">{stateMsg[state]}</div>
      <div className="relative">
        <div
          className={`w-2 h-2 rounded-full cursor-pointer`}
          title={title}
          style={{ background: colorClass }}
        ></div>
        {state === PoolState.Funded ? (
          <div
            className="w-2 h-2 absolute left-0 top-0 rounded-full cursor-pointer animate-ping "
            style={{ background: colorClass }}
          ></div>
        ) : null}
      </div>
    </div>
  )
}

export default function PoolDetailList() {
  const { poolIds: _poolIds } = useParams()
  const poolIds = useMemo((): string[] => {
    if (!_poolIds) return []
    try {
      const ids = _poolIds.split(',')
      return ids
    } catch {
      return []
    }
  }, [_poolIds])
  if (!poolIds.length) return null
  return (
    <div className="flex flex-col gap-20 mb-10">
      {poolIds.map((id) => (
        <PoolDetail poolId={id} key={id} />
      ))}
    </div>
  )
}

export function PoolDetail({ poolId }: { poolId: string }) {
  const navigate = useNavigate()
  const { dPoolAddress, isOwner } = useDPoolAddress()

  const { getToken } = useTokenMeta()
  const { addressName } = useAddressBook()
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const account = useAccount()
  const chainId = useChainId()

  const dPoolContract = useDPoolContract(dPoolAddress)

  const [poolMeta, setPoolMeta] = useState<Pool>()
  const [tokenMeta, setTokenMeta] = useState<TokenMeta>()
  const poolList = useMemo((): TableRow[] => {
    if (!poolMeta) return []
    return poolMeta.claimers.map((claimer, index) => ({
      address: claimer,
      amount: poolMeta.amounts[index],
    }))
  }, [poolMeta])

  useEffect(() => {
    if (!poolMeta) return

    const tokenAddress = poolMeta.token
    getToken(tokenAddress).then((meta) => meta && setTokenMeta(meta))
  }, [poolMeta, getToken])

  // format table data
  const getPoolDetail = useCallback(async () => {
    if (!dPoolContract || !poolId) return
    setPoolMeta(undefined)
    setIsLoading(true)
    try {
      const poolRes: GetPoolRes = await dPoolContract.getPoolById(poolId)
      console.log('poolRes', poolRes[0])
      const {
        amounts,
        claimedAmount,
        claimers,
        deadline,
        distributor,
        totalAmount,
        name,
        startTime,
        escrowedAmount,
        token,
      } = poolRes[0]
      const state = poolRes[1]
      const _poolMeta = {
        amounts,
        claimedAmount,
        claimers,
        deadline,
        distributor,
        totalAmount,
        name,
        startTime,
        escrowedAmount,
        token,
        state,
      }
      if (startTime !== 0) {
        setPoolMeta(_poolMeta)
      }
      setIsLoading(false)
    } catch {
      setIsLoading(false)
    }
  }, [dPoolContract, account, poolId, chainId])

  useEffect(() => {
    if (dPoolAddress && dPoolContract && poolId && chainId) {
      getPoolDetail()
    }
  }, [dPoolContract, account, poolId, chainId])

  const distributeAgain = useCallback(() => {
    if (!poolMeta || !tokenMeta) return

    const poolList = poolMeta.claimers.map(
      (address: string, index: number): TPoolRow => ({
        address,
        userInputAmount: utils.formatUnits(
          poolMeta.amounts[index],
          tokenMeta.decimals
        ),
        key: address,
      })
    )
    const distributePageCache: DistributePageCache = {
      poolList,
      tokenMetaList: [tokenMeta],
      poolName: poolMeta.name,
    }
    localStorage.setItem(
      LOCAL_STORAGE_KEY.DISTRIBUTE_CATCH_DATA,
      JSON.stringify(distributePageCache)
    )
    navigate('/')
  }, [poolMeta, tokenMeta])

  if (isLoading) {
    return (
      <p className="w-full flex justify-center">
        <EosIconsBubbleLoading width="5em" height="5em" />
      </p>
    )
  }
  const parseDate = (second: number) => {
    try {
      return format(new Date(second * 1000), 'Pp')
    } catch {
      return
    }
  }
  function RenderDate() {
    if (!poolMeta) return null
    const startDate = parseDate(poolMeta.startTime)
    const endDate = parseDate(poolMeta.deadline)
    if (!startDate || !endDate) return null
    return (
      <>
        <div className="flex h-6 w-full justify-between items-center">
          <div>Start Date</div>
          <div className="flex-1 border-b border-gray-500 border-dotted mx-2"></div>
          <div>{startDate}</div>
        </div>
        <div className="flex h-6 w-full justify-between items-center">
          <div>End Date</div>
          <div className="flex-1  border-b border-gray-500 border-dotted mx-2"></div>
          <div>{endDate}</div>
        </div>
      </>
    )
  }
  function RenderCancel() {
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
    const [cancelState, setCancelState] = useState<ActionState>(
      ActionState.WAIT
    )

    const cancelPool = useCallback(async () => {
      if (!dPoolContract || !poolId || !chainId) return
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
  function RenderFund() {
    if (!poolMeta || !account || !dPoolAddress) return null

    if (
      poolMeta.distributor &&
      poolMeta.distributor.toLowerCase() !== account.toLowerCase()
    )
      return null
    if (poolMeta.state !== PoolState.Initialized) return null
    if (!tokenMeta) return null
    const [fundState, setFundState] = useState<ActionState>(ActionState.WAIT)
    const [isTokensApproved, setIsTokensApproved] = useState<boolean>(false)
    const nativeTokenAmount = useMemo(() => {
      if (!BigNumber.from(poolMeta.token).eq(0)) return BigNumber.from(0)
      return poolMeta.totalAmount
    }, [poolMeta])
    const fundPool = useCallback(async () => {
      if (!dPoolContract || !poolId || !chainId || !isTokensApproved) return
      setFundState(ActionState.ING)
      try {
        const fundPoolByIdRes = await dPoolContract.fund(poolId, {
          value: nativeTokenAmount,
        })
        const transactionResponse: ContractReceipt =
          await fundPoolByIdRes.wait()
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
    }, [dPoolContract, chainId, isTokensApproved, poolId, nativeTokenAmount])
    return (
      <div className="flex gap-2 items-center">
        <ApproveToken
          token={tokenMeta.address}
          approveAmount={poolMeta.totalAmount}
          dPoolAddress={dPoolAddress}
          onApproved={() => setIsTokensApproved(true)}
          selectClass="bg-neutral-200"
        />
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
      </div>
    )
  }

  function RenderDistribute() {
    if (!poolMeta || !account) return null
    if (poolMeta.state !== PoolState.Funded) return null
    if (!BigNumber.from(poolMeta.distributor).eq(account)) return null
    const [distributionState, setDistributionState] = useState<ActionState>(
      ActionState.WAIT
    )
    const [distributeTx, setDistributeTx] = useState<string>()

    const distributePool = useCallback(async () => {
      if (!dPoolContract || !poolId || !chainId) return
      setDistributionState(ActionState.ING)
      const successClaimedAddress: string[] = []

      try {
        const distributionPoolByIdRes = await dPoolContract.distribute(poolId)
        const transactionResponse: ContractReceipt =
          await distributionPoolByIdRes.wait()
        setDistributeTx(transactionResponse.transactionHash)
        setDistributionState(ActionState.SUCCESS)

        transactionResponse.logs
          .filter(
            (log) => log.address.toLowerCase() === dPoolAddress?.toLowerCase()
          )
          .forEach((log) => {
            const parseLog = contractIface.parseLog(log)

            if (parseLog.name === DPoolEvent.Claimed) {
              successClaimedAddress.push(parseLog.args[1])
            }
          })
        getPoolDetail()
      } catch (err: any) {
        toast.error(typeof err === 'object' ? err.message : JSON.stringify(err))
        setDistributionState(ActionState.FAILED)
      }
    }, [dPoolContract, chainId])

    return (
      <RenderActionButton
        state={distributionState}
        stateMsgMap={{
          [ActionState.WAIT]: 'Distribute',
          [ActionState.ING]: 'Distributing',
          [ActionState.SUCCESS]: 'Distributed',
          [ActionState.FAILED]: 'Distribute failed.Try again',
        }}
        tx={distributeTx}
        onClick={distributePool}
        waitClass="text-green-500 border-green-500"
      />
    )
  }

  function RenderClaim(props: { claimer: TableRow; index: number }) {
    const { claimer, index } = props

    if (!poolMeta) return null
    const [claimState, setClaimState] = useState<ActionState>(ActionState.WAIT)
    const [claimedTx, setClaimedTx] = useState<string>()
    const [shouldClaimAmount, setShouldClaimAmount] = useState<BigNumber>(
      claimer.amount
    )

    const getClaimedAmount = useCallback(async () => {
      if (!dPoolContract) return
      if (poolMeta.state === PoolState.Initialized) {
        return claimer.amount
      }
      const claimedAmount = await dPoolContract.userClaimedAmount(
        claimer.address,
        poolId
      )
      const _shouldClaimAmount = claimer.amount.sub(claimedAmount)
      setShouldClaimAmount(_shouldClaimAmount)
    }, [dPoolContract, claimer])

    useEffect(() => {
      getClaimedAmount()
    }, [])

    const claim = useCallback(async () => {
      if (!dPoolContract || !poolId || !chainId) return
      setClaimState(ActionState.ING)
      try {
        const claimSinglePoolRes = await dPoolContract.claimSinglePool(
          poolId,
          index
        )
        const transactionResponse: ContractReceipt =
          await claimSinglePoolRes.wait()
        setClaimedTx(transactionResponse.transactionHash)

        transactionResponse.logs
          .filter(
            (log) => log.address.toLowerCase() === dPoolAddress?.toLowerCase()
          )
          .forEach((log) => {
            const parseLog = contractIface.parseLog(log)

            if (parseLog.name === DPoolEvent.Claimed) {
              setClaimState(ActionState.SUCCESS)
            }
          })
        // getPoolDetail()
      } catch (err: any) {
        toast.error(typeof err === 'object' ? err.message : JSON.stringify(err))
        setClaimState(ActionState.FAILED)
      }
    }, [dPoolContract, chainId, poolId])

    const isClaimer = claimer.address.toLowerCase() === account?.toLowerCase()
    if (shouldClaimAmount.eq(0)) {
      return <div className="text-gray-500">Received</div>
    }

    return (
      <>
        <td className="font-medium text-lg">
          {formatCurrencyAmount(shouldClaimAmount, tokenMeta)}
        </td>
        <td>
          {isClaimer && poolMeta.state === PoolState.Funded ? (
            <RenderActionButton
              state={claimState}
              stateMsgMap={{
                [ActionState.WAIT]: 'Claim',
                [ActionState.ING]: 'Claiming',
                [ActionState.SUCCESS]: 'Claimed',
                [ActionState.FAILED]: 'Claim failed.Try again',
              }}
              tx={claimedTx}
              onClick={() => claim()}
              waitClass="text-gray-200 bg-green-500 border-green-500 text-center rounded-2xl px-2"
            />
          ) : (
            <div className="text-gray-500">Unclaimed</div>
          )}
        </td>
      </>
    )
  }

  function ClaimerRow(props: { claimer: TableRow; index: number }) {
    const { claimer, index } = props
    return (
      <tr key={claimer.address} className="py-2 px-4">
        <td className="text-gray-500 text-center">
          {claimer.address.toLowerCase() === account?.toLowerCase() ? (
            <span className="text-xs bg-green-500 text-white px-2 rounded-lg cursor-default">
              ME
            </span>
          ) : (
            index + 1
          )}
        </td>
        <td className="">
          {claimer.address}
          {addressName(claimer.address) ? (
            <span className="text-sm text-gray-500 px-1">
              ({addressName(claimer.address)})
            </span>
          ) : null}
        </td>

        <RenderClaim claimer={claimer} index={index} />
      </tr>
    )
  }
  if (!poolId) return <p>PoolId not found</p>
  if (!poolMeta) return <p>Distribute not found</p>
  return (
    <div className="flex justify-center">
      <div className="w-full break-all flex flex-1 flex-col items-center">
        <div className=" my-5 text-xl font-medium flex cursor-pointer">
          {poolMeta?.name}
          <RenderState
            state={poolMeta?.state}
            title={PoolState[poolMeta.state]}
          />
        </div>

        <table className="my-4">
          <thead className="">
            <tr>
              <td></td>
              <td>ADDRESS</td>
              <td>{tokenMeta?.symbol}</td>
            </tr>
          </thead>

          <tbody>
            {poolList.map((claimer, index) => (
              <ClaimerRow
                key={claimer.address}
                claimer={claimer}
                index={index}
              />
            ))}
          </tbody>
        </table>

        <section className="text-xs w-full flex flex-col gap-4 mt-20">
          <div className="flex h-6 w-full justify-between items-center ">
            <div>Remaining Amount</div>
            <div className="flex-1 border-b border-gray-500 border-dotted mx-2"></div>
            <div>
              {formatCurrencyAmount(
                poolMeta.totalAmount.sub(poolMeta.claimedAmount),
                tokenMeta
              )}
              <span className="ml-1 text-gray-500">{tokenMeta?.symbol}</span>
            </div>
          </div>
          <RenderDate />
        </section>

        <div className="flex mt-4 gap-2 w-full justify-between">
          <div>
            {isOwner ? (
              <div
                className="text-xs cursor-pointer text-gray-500 hover:text-black border-b border-gray-400"
                onClick={distributeAgain}
              >
                Duplicate Distribution
              </div>
            ) : null}
          </div>
          <div className="flex gap-2">
            <RenderCancel />
            <RenderFund />
            <RenderDistribute />
          </div>
        </div>
      </div>
    </div>
  )
}
