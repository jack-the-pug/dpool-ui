import { BigNumber, ContractReceipt, ethers, utils } from 'ethers'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { hooks as metaMaskHooks } from '../../connectors/metaMask'
import {
  BasePool,
  DPoolEvent,
  GetPoolRes,
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
import ApproveToken from '../distribution/Token/ApproveToken'

export type Claimer = {
  address: string
  baseTokenAmount: BigNumber
  secondTokenAmount?: BigNumber
  tx?: string
}

export type Pool = Omit<
  BasePool,
  'amounts' | 'token' | 'totalAmount' | 'escrowedAmount' | 'claimedAmount'
> & {
  state: PoolState
  baseToken: string
  secondToken?: string
  baseTokenAmounts: BigNumber[]
  secondTokenAmounts?: BigNumber[]
  baseTotalAmount: BigNumber
  secondTotalAmount?: BigNumber
  baseClaimedAmount: BigNumber
  secondClaimedAmount?: BigNumber
  baseRemainingTokenAmount: BigNumber
  secondRemainingTokenAmount?: BigNumber
}

const { useAccount, useChainId, useProvider } = metaMaskHooks
const contractIface = new ethers.utils.Interface(dPoolABI)

const stateColorMap = {
  [PoolState.Initialized]: '#6B7280',
  [PoolState.Funded]: '#34D399',
  [PoolState.None]: '#DC2626',
  [PoolState.Closed]: '#6B7280',
}
function RenderState({ state, title }: { state: PoolState; title: string }) {
  const colorClass = useMemo(() => stateColorMap[state], [state])
  return (
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
  )
}

export default function PoolDetail() {
  const { poolId: _pooId } = useParams()
  const navigate = useNavigate()
  const { dPoolAddress, isOwner } = useDPoolAddress()
  const { getToken } = useTokenMeta()

  const [claimers, setClaimers] = useState<Claimer[]>([])
  const [poolDetail, setPoolDetail] = useState<Pool>()
  console.log('poolDetail', poolDetail)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const account = useAccount()
  const chainId = useChainId()
  const provider = useProvider()
  const dPoolContract = useDPoolContract(dPoolAddress)
  const poolIds = useMemo(() => (_pooId ? _pooId.split(',') : []), [_pooId])
  const [baseTokenMeta, setBaseTokenMeta] = useState<TokenMeta>()
  const [secondTokenMeta, setSecondTokenMeta] = useState<TokenMeta>()
  useEffect(() => {
    if (!poolDetail || !provider) return
    const { baseToken, secondToken } = poolDetail
    getToken(baseToken).then(setBaseTokenMeta)
    if (secondToken) {
      getToken(secondToken).then(setSecondTokenMeta)
    }
  }, [poolDetail])
  // format pool data
  const getPoolDetail = useCallback(async () => {
    if (!dPoolContract || !poolIds) return

    setIsLoading(true)
    setPoolDetail(undefined)
    setClaimers([])
    let pool: Pool | undefined = undefined
    for (let i = 0; i < poolIds.length; i++) {
      const poolRes: GetPoolRes = await dPoolContract.getPoolById(poolIds[i])
      console.log('poolRes', poolRes)
      // first pool
      if (!pool) {
        const {
          amounts,
          claimedAmount,
          claimers,
          deadline,
          distributor,
          totalAmount,
          name,
          owner,
          startTime,
          token,
        } = poolRes[0]
        const state = poolRes[1]
        pool = {
          baseClaimedAmount: claimedAmount,
          claimers,
          deadline,
          distributor,
          name,
          owner,
          startTime,
          state,
          baseToken: token,
          baseTokenAmounts: amounts,
          baseRemainingTokenAmount: totalAmount.sub(claimedAmount),
          baseTotalAmount: totalAmount,
        }
      }
      // second pool
      else {
        const { amounts, token, claimedAmount, totalAmount } = poolRes[0]
        pool.secondTokenAmounts = amounts
        pool.secondToken = token
        pool.secondClaimedAmount = claimedAmount
        pool.secondRemainingTokenAmount = totalAmount.sub(claimedAmount)
        pool.secondTotalAmount = totalAmount
      }
    }
    const claimerList: Claimer[] = []
    const { claimers, baseTokenAmounts, secondTokenAmounts } = pool!
    claimers.forEach((address: string, index) => {
      const claimerMeta: Claimer = {
        address,
        baseTokenAmount: baseTokenAmounts[index],
      }
      if (secondTokenAmounts) {
        claimerMeta.secondTokenAmount = secondTokenAmounts[index]
      }
      claimerList.push(claimerMeta)
    })
    setPoolDetail(pool)
    setClaimers(claimerList)
    setIsLoading(false)
  }, [dPoolContract, account, poolIds, chainId])

  useEffect(() => {
    if (dPoolAddress && dPoolContract && poolIds && poolIds.length && chainId) {
      getPoolDetail()
    }
  }, [dPoolContract, account, poolIds, chainId])

  const distributeAgain = useCallback(() => {
    localStorage.setItem('distributeAgainData', JSON.stringify(poolDetail))
    navigate('/')
  }, [poolDetail])

  if (isLoading || !poolDetail) {
    return (
      <p className="w-full flex justify-center">
        <EosIconsBubbleLoading width="5em" height="5em" />
      </p>
    )
  }

  function RenderCancel() {
    if (!poolDetail || !account) return null
    if (poolDetail.state !== PoolState.Initialized) return null
    if (!isOwner) {
      return null
    }
    const { startTime, deadline } = poolDetail
    const nowTime = Date.now() / 1000
    if (nowTime >= startTime && nowTime <= deadline) {
      return null
    }
    const [cancelState, setCancelState] = useState<ActionState>(
      ActionState.WAIT
    )

    const cancelPool = useCallback(async () => {
      if (!dPoolContract || !poolIds || !chainId) return
      setCancelState(ActionState.ING)
      try {
        const cancelPoolByIdRes = await dPoolContract.cancel(poolIds)
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
      } catch (err) {
        err = typeof err === 'object' ? JSON.stringify(err) : err
        toast.error(`${err}`)
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
    if (!poolDetail || !account) return null
    if (!isOwner) return null
    if (poolDetail.state !== PoolState.Initialized) return null
    if (!baseTokenMeta) return null

    const [fundState, setFundState] = useState<ActionState>(ActionState.WAIT)
    const nativeTokenAmount = useMemo(() => {
      let amount = BigNumber.from(0)
      if (BigNumber.from(baseTokenMeta.address).eq(0)) {
        amount = amount.add(poolDetail.baseTotalAmount)
      }
      if (
        secondTokenMeta &&
        poolDetail.secondTotalAmount &&
        BigNumber.from(secondTokenMeta.address).eq(0)
      ) {
        amount = amount.add(poolDetail.secondTotalAmount)
      }

      return amount
    }, [poolDetail, baseTokenMeta, secondTokenMeta])

    const fundPool = useCallback(async () => {
      if (!dPoolContract || !poolIds.length || !chainId) return
      setFundState(ActionState.ING)
      try {
        // if unapproved token, approve token first
        console.log('nativeTokenAmount', nativeTokenAmount)
        const fundPoolByIdRes = await dPoolContract.batchFund(poolIds, {
          value: nativeTokenAmount.toString(),
        })
        const transactionResponse: ContractReceipt =
          await fundPoolByIdRes.wait()
        setFundState(ActionState.SUCCESS)
        transactionResponse.logs
          .filter(
            (log) => log.address.toLowerCase() === dPoolAddress?.toLowerCase()
          )
          .forEach((log) => {
            const parseLog = contractIface.parseLog(log)
            if (parseLog.name === DPoolEvent.Funded) {
              getPoolDetail()
            }
          })
      } catch (err) {
        err = typeof err === 'object' ? JSON.stringify(err) : err
        toast.error(`${err}`)
        setFundState(ActionState.FAILED)
      }
    }, [dPoolContract, chainId, nativeTokenAmount])

    const [baseTokenApproveState, setBaseTokenApproveState] =
      useState<ActionState>(ActionState.WAIT)
    const [secondTokenApproveState, setSecondTokenApproveState] =
      useState<ActionState>(ActionState.WAIT)
    return (
      <div className="flex gap-2">
        <div>
          {dPoolAddress ? (
            <ApproveToken
              dPoolAddress={dPoolAddress}
              tokenAddress={baseTokenMeta.address}
              approveState={baseTokenApproveState}
              setApproveState={setBaseTokenApproveState}
              approveAmount={poolDetail.baseTotalAmount}
            />
          ) : null}
          {secondTokenMeta && dPoolAddress ? (
            <ApproveToken
              dPoolAddress={dPoolAddress}
              tokenAddress={secondTokenMeta.address}
              approveState={secondTokenApproveState}
              setApproveState={setSecondTokenApproveState}
              approveAmount={poolDetail.secondTotalAmount!}
            />
          ) : null}
        </div>
        <RenderActionButton
          state={fundState}
          stateMsgMap={{
            [ActionState.WAIT]: 'Fund',
            [ActionState.ING]: 'Funding',
            [ActionState.SUCCESS]: 'Funded',
            [ActionState.FAILED]: 'Fund failed.Try again',
          }}
          onClick={fundPool}
        />
      </div>
    )
  }

  function RenderDistribute() {
    if (!poolDetail || !account) return null
    if (poolDetail.state !== PoolState.Funded) return null
    if (!BigNumber.from(poolDetail.distributor).eq(account)) return null
    // const { startTime, deadline } = poolDetail
    // const nowTime = Date.now() / 1000
    // console.log('startTime, deadline', startTime, nowTime, deadline)
    // if (nowTime <= startTime || nowTime >= deadline) {
    //   return null
    // }
    const [distributionState, setDistributionState] = useState<ActionState>(
      ActionState.WAIT
    )
    const [distributeTx, setDistributeTx] = useState<string>()

    const distributePool = useCallback(async () => {
      if (!dPoolContract || !poolIds.length || !chainId) return
      setDistributionState(ActionState.ING)
      const successClaimedAddress: string[] = []

      try {
        const distributionPoolByIdRes =
          poolIds.length === 1
            ? await dPoolContract.distribute(poolIds[0])
            : await dPoolContract.batchDistribute(poolIds)

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
      } catch (err) {
        err = typeof err === 'object' ? JSON.stringify(err) : err
        toast.error(`${err}`)
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

  function RenderClaim(props: { claimer: Claimer; index: number }) {
    const { claimer, index } = props
    if (poolDetail?.state !== PoolState.Funded) return null
    const { startTime, deadline } = poolDetail
    const nowTime = Date.now() / 1000
    if (nowTime <= startTime || nowTime >= deadline) {
      return null
    }
    const [claimState, setClaimState] = useState<ActionState>(ActionState.WAIT)
    const [claimedTx, setClaimedTx] = useState<string>()
    const [isClaimed, setIsClaimed] = useState<boolean>(false)

    const getIsClaimed = useCallback(
      async (claimer: string, index: number) => {
        if (!dPoolContract || !claimer) return
        const basePoolClaimedAmount = await dPoolContract.userClaimedAmount(
          claimer,
          poolIds[0]
        )
        let secondPoolClaimedAmount: BigNumber | undefined = undefined
        if (poolIds[1]) {
          secondPoolClaimedAmount = await dPoolContract.userClaimedAmount(
            claimer,
            poolIds[1]
          )
        }
        // pool 1 is claimed?
        let flag = basePoolClaimedAmount.eq(claimers[index].baseTokenAmount)

        if (secondPoolClaimedAmount) {
          // pool 2 is claimed?
          flag = secondPoolClaimedAmount.eq(claimers[index].secondTokenAmount!)
        }
        return flag
      },
      [poolIds, dPoolContract, claimers]
    )
    const claim = useCallback(async () => {
      if (!dPoolContract || !poolIds || !chainId) return
      setClaimState(ActionState.ING)
      try {
        const claimSinglePoolRes = await dPoolContract.claim(
          poolIds,
          new Array(poolIds.length).fill(index)
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
      } catch (err) {
        toast.error(`${err}`)
        setClaimState(ActionState.FAILED)
      }
    }, [dPoolContract, chainId])

    useEffect(() => {
      getIsClaimed(claimer.address, index).then(setIsClaimed)
    }, [getIsClaimed, claimer, index])
    const isClaimer = claimer.address.toLowerCase() === account?.toLowerCase()
    if (isClaimed) {
      return <div className="text-gray-500">Received</div>
    }
    if (!isClaimed && isClaimer) {
      return (
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
      )
    } else {
      return <div className="text-gray-500">Wait</div>
    }
  }

  function ClaimerRow(props: { claimer: Claimer; index: number }) {
    const { claimer, index } = props
    return (
      <tr key={claimer.address} className="hover:bg-gray-100 py-2 px-4">
        <td className="text-gray-500 text-center">
          {claimer.address.toLowerCase() === account?.toLowerCase() ? (
            <span className="text-xs bg-green-500 text-white px-2 rounded-lg cursor-default">
              ME
            </span>
          ) : (
            index + 1
          )}
        </td>
        <td className="">{claimer.address}</td>
        <td className="font-medium text-lg">
          {utils.formatUnits(claimer.baseTokenAmount, baseTokenMeta?.decimals)}
        </td>
        {claimer.secondTokenAmount ? (
          <td className="font-medium text-lg">
            {utils.formatUnits(
              claimer.secondTokenAmount,
              secondTokenMeta?.decimals
            )}
          </td>
        ) : null}
        <td>
          <RenderClaim claimer={claimer} index={index} />
        </td>
      </tr>
    )
  }
  return (
    <div className="flex justify-center">
      <div className="w-full break-all flex flex-1 flex-col items-center">
        <div className=" my-5 text-xl font-medium flex cursor-pointer">
          {poolDetail.name}
          <RenderState
            state={poolDetail.state}
            title={PoolState[poolDetail.state]}
          />
        </div>

        <table className="my-4">
          <thead className="">
            <tr>
              <td></td>
              <td>ADDRESS</td>
              <td>{baseTokenMeta?.symbol}</td>
              {secondTokenMeta ? <td>{secondTokenMeta?.symbol}</td> : null}
              {poolDetail?.state === PoolState.Funded &&
              Date.now() / 1000 > poolDetail.startTime ? (
                <td>STATUS</td>
              ) : null}
            </tr>
          </thead>

          <tbody>
            {claimers.map((claimer, index) => (
              <ClaimerRow
                key={claimer.address}
                claimer={claimer}
                index={index}
              />
            ))}
          </tbody>
        </table>
        <div className="w-full border-b h-6 border-gray-500 border-dotted mt-8 mb-7"></div>
        <section className="text-xs w-full flex flex-col gap-4">
          <div className="flex h-6 w-full justify-between items-center ">
            <div>Remaining Amount</div>
            <div className="flex-1 border-b border-gray-500 border-dotted"></div>
            <div>
              <div>
                {utils.formatUnits(
                  poolDetail.baseRemainingTokenAmount,
                  baseTokenMeta?.decimals
                )}
                <span className="ml-1">{baseTokenMeta?.symbol}</span>
              </div>
              {poolDetail.secondRemainingTokenAmount ? (
                <div>
                  {utils.formatUnits(
                    poolDetail.secondRemainingTokenAmount,
                    secondTokenMeta?.decimals
                  )}
                  <span className="ml-1">{secondTokenMeta?.symbol}</span>
                </div>
              ) : null}
            </div>
          </div>
          <div className="flex h-6 w-full justify-between items-center">
            <div>Start Date</div>
            <div className="flex-1 border-b border-gray-500 border-dotted"></div>
            <div>{format(new Date(poolDetail.startTime * 1000), 'Pp')}</div>
          </div>
          <div className="flex h-6 w-full justify-between items-center">
            <div>End Date</div>
            <div className="flex-1  border-b border-gray-500 border-dotted"></div>
            <div>{format(new Date(poolDetail.deadline * 1000), 'Pp')}</div>
          </div>
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
