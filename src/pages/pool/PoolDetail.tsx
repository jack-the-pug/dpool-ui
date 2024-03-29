import { BigNumber, utils } from 'ethers'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { BasePool, PoolState, TokenMeta } from '../../type'
import { EosIconsBubbleLoading } from '../../components/icon'
import { useNavigate } from 'react-router-dom'
import useDPoolAddress from '../../hooks/useDPoolAddress'
import useTokenMeta from '../../hooks/useTokenMeta'
import { LOCAL_STORAGE_KEY } from '../../store/storeKey'
import { DistributePageCache, TPoolRow } from '../distribution/CreatePool'
import { Fund } from './Fund'
import { Cancel } from './Cancel'
import { Distribute } from './Distribute'
import { Claimer, DistributeRow } from './DistributeRow'
import { DateRange } from '../distribution/DateRangePicker'
import { DistributeState } from './DistributeState'
import { ActionEvent } from './PoolList'
import { PoolEvent } from './PoolEvent'
import { AddressLink } from '../../components/hash'
import { useGetPoolDetail } from '../../hooks/useGetPoolDetail'
import { useWeb3React } from '@web3-react/core'
import { Claim } from './Claim'
import { PoolBarChart } from './PoolBarChart'
export type Pool = BasePool & {
  state: PoolState
  poolId: string
}

interface PoolDetailProps {
  poolId: string
  createEvent: ActionEvent | undefined
  fundEvent: ActionEvent | undefined
  distributeEvent: ActionEvent | undefined
  cancelEvent: ActionEvent | undefined
  claimEventList: ActionEvent[]
  getPoolEvent: Function
}

export function PoolDetail(props: PoolDetailProps) {
  const {
    poolId,
    createEvent,
    fundEvent,
    distributeEvent,
    claimEventList,
    cancelEvent,
    getPoolEvent,
  } = props
  if (!poolId) return <p>PoolId not found</p>

  const navigate = useNavigate()
  const { dPoolAddress, isOwner } = useDPoolAddress()
  const { getToken } = useTokenMeta()
  const { account, chainId } = useWeb3React()
  const _getPoolDetail = useGetPoolDetail(dPoolAddress)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [isApproved, setIsApproved] = useState<boolean>(false)

  const [poolMeta, setPoolMeta] = useState<Pool>()
  const [tokenMeta, setTokenMeta] = useState<TokenMeta>()

  const submittable = useMemo(() => {
    if (!poolMeta) return false
    if (BigNumber.from(poolMeta.token).eq(0)) return true
    return poolMeta.state === PoolState.Funded
  }, [poolMeta?.token, isApproved])

  const poolList = useMemo((): Claimer[] => {
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
  const getPoolDetail = useCallback(() => {
    setIsLoading(true)
    _getPoolDetail(poolId)
      .then((poolDetail) => {
        if (poolDetail) {
          setPoolMeta(poolDetail)
        }
      })
      .finally(() => setIsLoading(false))
  }, [_getPoolDetail])

  useEffect(() => {
    if (dPoolAddress && poolId && chainId) {
      getPoolDetail()
    }
  }, [getPoolDetail, account, poolId, chainId])

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

  if (isLoading)
    return (
      <p className="w-full flex justify-center">
        <EosIconsBubbleLoading width="5em" height="5em" />
      </p>
    )
  // if (!account) return <p>Please connect your wallet first</p>
  if (!poolMeta || !tokenMeta) return <p>Distribute not found</p>
  return (
    <div className="flex z-0 ">
      <div className='flex flex-col gap-10'>
        <PoolBarChart poolMeta={poolMeta} tokenMeta={tokenMeta} />
        <div className="flex  flex-col items-center bg-white dark:bg-slate-800  py-2 rounded-lg">
          <div className="my-5 w-full relative items-center flex justify-center">
            <div className="flex items-center">
              {poolMeta?.name}
              <DistributeState
                poolMeta={poolMeta}
                distributeEvent={distributeEvent}
              />
            </div>
          </div>
          <table className="my-4">
            <thead className="text-sm sticky">
              <tr className="text-gray-500 bg-gray-100 dark:bg-slate-800 sticky">
                <td>Index</td>
                <td className="py-3">Address</td>
                <td>
                  Amount/
                  {tokenMeta && (
                    <AddressLink
                      address={tokenMeta?.address}
                      className="  text-gray-600"
                    >
                      {tokenMeta?.symbol}
                    </AddressLink>
                  )}
                </td>
                <td>State</td>
              </tr>
            </thead>
            <tbody>
              {poolList.map((claimer, index) => (
                <DistributeRow
                  key={claimer.address}
                  claimer={claimer}
                  index={index}
                  poolMeta={poolMeta}
                  dPoolAddress={dPoolAddress}
                  tokenMeta={tokenMeta}
                  poolId={poolId}
                  claimEvent={claimEventList.find(
                    (e) => e.from.toLowerCase() === claimer.address.toLowerCase()
                  )}
                  getPoolEvent={getPoolEvent}
                  getPoolDetail={getPoolDetail}
                  distributeEvent={distributeEvent}
                />
              ))}
            </tbody>
          </table>
          {/* <PoolStats poolMeta={poolMeta} tokenMeta={tokenMeta} /> */}
          <div className="w-full px-4">
            <section className="text-xs w-full flex flex-col gap-4 mt-20">
              <DateRange start={poolMeta.startTime} end={poolMeta.deadline} />
            </section>
            {createEvent || fundEvent || distributeEvent || cancelEvent ? (
              <section className="w-full mt-10 text-xs border border-gray-300 divide-solid divide-y divide-gray-300 rounded-md ">
                <PoolEvent event={createEvent} label="Created" />
                <PoolEvent event={fundEvent} label="Funded" />
                <PoolEvent event={distributeEvent} label="Distributed" />
                <PoolEvent event={cancelEvent} label="Canceled" />
              </section>
            ) : null}
            {account ? (
              <div className="w-full">
                <div className="flex mt-4 gap-2 w-full justify-between">
                  {isOwner ? (
                    <div
                      className="text-xs cursor-pointer text-gray-400 hover:text-gray-500 "
                      onClick={distributeAgain}
                    >
                      Duplicate Distribution
                    </div>
                  ) : null}
                  <Cancel
                    poolMeta={poolMeta}
                    dPoolAddress={dPoolAddress}
                    isOwner={isOwner}
                    poolId={poolId}
                    getPoolDetail={getPoolDetail}
                  />
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
      <div className='flex flex-col gap-5'>
        {dPoolAddress &&
          <Fund
            poolMeta={poolMeta}
            dPoolAddress={dPoolAddress}
            tokenMeta={tokenMeta}
            poolId={poolId}
            getPoolDetail={getPoolDetail}
            isApproved={isApproved}
            setIsApproved={setIsApproved}
            getPoolEvent={getPoolEvent}
          />
        }
        {dPoolAddress && <Claim getPoolDetail={getPoolDetail} poolId={poolId} poolMeta={poolMeta} tokenMeta={tokenMeta} dPoolAddress={dPoolAddress} />}
        {
          dPoolAddress && <Distribute
            poolMeta={poolMeta}
            dPoolAddress={dPoolAddress}
            poolId={poolId}
            getPoolDetail={getPoolDetail}
            submittable={submittable}
            tokenMeta={tokenMeta}
            getPoolEvent={getPoolEvent}
          />
        }
      </div>
    </div>
  )
}
