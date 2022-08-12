import { useState, useEffect, useCallback, useMemo } from 'react'
import { hooks as metaMaskHooks } from '../../connectors/metaMask'
import { Link, useParams } from 'react-router-dom'
import { DPoolEvent, DPoolLocalStorageMeta } from '../../type'

import useDPoolAddress from '../../hooks/useDPoolAddress'
import useDPool from '../../hooks/useDPool'
import { BigNumber, Event } from 'ethers'
import { EosIconsBubbleLoading } from '../../components/icon'
import { LOCAL_STORAGE_KEY } from '../../store/storeKey'
import { PoolDetail } from './PoolDetail'
import { useWeb3React } from '@web3-react/core'

const { useChainId } = metaMaskHooks

export default function PoolList() {
  const chainId = useChainId()
  const { dPoolAddress } = useDPoolAddress()
  // local pool meta data in this chain
  const [poolList, setPoolList] = useState<DPoolLocalStorageMeta[]>([])
  const dPoolContract = useDPool(dPoolAddress)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  useEffect(() => {
    if (!dPoolAddress) return
    setIsLoading(true)
    const formatPoolList: DPoolLocalStorageMeta[] = JSON.parse(
      localStorage.getItem(LOCAL_STORAGE_KEY.LOCAL_POOL_META_LIST) || '[]'
    )
      .filter((pool: DPoolLocalStorageMeta) => {
        if (!dPoolAddress) return true
        return (
          pool.dPoolAddress.toLowerCase() === dPoolAddress.toLowerCase() &&
          pool.chainId === chainId
        )
      })
      .reverse()
    setPoolList(formatPoolList)
    setIsLoading(false)
  }, [chainId, dPoolAddress, dPoolContract])

  const getPoolFromContract = useCallback(() => {
    if (!dPoolContract || !chainId || !dPoolAddress) return
    setIsLoading(true)
    dPoolContract.lastPoolId().then((id: BigNumber) => {
      // if local data missing
      const ListInDPoolContract = Array(id.toNumber())
        .fill(0)
        .map((_, index) => ({
          poolIds: [`${index + 1}`],
          name: `Distribution Pool`,
          creator: '',
          chainId,
          dPoolAddress,
        }))
        .reverse()

      setPoolList(ListInDPoolContract)
      setIsLoading(false)
    })
  }, [dPoolContract, chainId, dPoolAddress])
  if (isLoading) {
    return <EosIconsBubbleLoading width="5em" height="5em" />
  }

  return (
    <div className="flex flex-col w-full break-all  flex-1  items-center">
      {poolList.length ? (
        poolList.map((pool, index) => {
          if (!pool.poolIds) return null
          const ids = pool.poolIds.join(',')
          return (
            <Link
              key={`${ids}-${index}`}
              to={ids}
              className="flex px-4 py-1 hover:bg-gray-100 hover:scale-110 transition-all ease-in-out rounded-sm"
            >
              <div className="mr-4 text-gray-500">{index + 1}</div>
              <div className="flex cursor-pointer">
                <div className="ml-2">{pool.name}</div>
              </div>
            </Link>
          )
        })
      ) : (
        <p>Distributions Not Found</p>
      )}
      <div className="text-xs text-gray-500 flex mt-4 mb-16 w-full justify-end">
        Didn't see your transaction? Try{' '}
        <button className="ml-2 text-green-500" onClick={getPoolFromContract}>
          {' '}
          fetch transactions from the dPoolContract again
        </button>
      </div>
    </div>
  )
}

interface ActionEvent {
  name: DPoolEvent
  timestamp: number
  transactionHash: string
  poolId: string | number
}

export type ClaimEvent = ActionEvent & {
  claimer: string
}
export type FundEvent = ActionEvent & {
  funder: string
}
export type CreateEvent = ActionEvent & {
  creator: string
}
export type DistributeEvent = ActionEvent & {
  distributor: string
}

export function PoolDetailList() {
  const { poolIds: _poolIds } = useParams()
  const { provider } = useWeb3React()
  const { dPoolAddress } = useDPoolAddress()
  const dPoolContract = useDPool(dPoolAddress)

  const [createEventList, setCreateEventList] = useState<CreateEvent[]>([])
  const [claimedEventList, setClaimedEventList] = useState<ClaimEvent[]>([])
  const [fundEventList, setFundEventList] = useState<FundEvent[]>([])
  const [distributeEventList, setDistributeEventList] = useState<
    DistributeEvent[]
  >([])

  const poolIds = useMemo((): string[] => {
    if (!_poolIds) return []
    try {
      const ids = _poolIds.split(',')
      return ids
    } catch {
      return []
    }
  }, [_poolIds])
  const poolIdsMap = useMemo(() => {
    const map = new Map()
    poolIds.forEach((id) => map.set(id.toString(), id))
    return map
  }, [poolIds])

  const getPoolEvent = useCallback(() => {
    if (!dPoolContract) return
    if (poolIdsMap.size === 0) return
    // claim event
    dPoolContract
      .queryFilter(dPoolContract.filters[DPoolEvent.Claimed]())
      .then(async (claimEvents) => {
        if (!claimEvents) return
        const claimedList: ClaimEvent[] = []
        for (let i = 0; i < claimEvents.length; i++) {
          const claimEvent = claimEvents[i]
          if (!claimEvent.args) continue
          if (!poolIdsMap.has(claimEvent.args.poolId.toString())) continue
          const { claimer, poolId } = claimEvent.args
          const block = await claimEvent.getBlock()
          claimedList.push({
            name: DPoolEvent.Claimed,
            transactionHash: claimEvent.transactionHash,
            timestamp: block.timestamp,
            poolId: poolId.toNumber(),
            claimer,
          })
        }
        setClaimedEventList(claimedList)
      })

    // fund
    dPoolContract
      .queryFilter(dPoolContract.filters[DPoolEvent.Funded]())
      .then(async (fundEvents) => {
        if (!fundEvents) return
        const fundedList = []
        for (let i = 0; i < fundEvents.length; i++) {
          const fundEvent = fundEvents[i]
          if (!fundEvent.args) continue
          if (!poolIdsMap.has(fundEvent.args.poolId.toString())) continue
          const { funder, poolId } = fundEvent.args
          const block = await fundEvent.getBlock()
          fundedList.push({
            name: DPoolEvent.Funded,
            transactionHash: fundEvent.transactionHash,
            timestamp: block.timestamp,
            funder,
            poolId: poolId.toNumber(),
          })
        }
        setFundEventList(fundedList)
      })

    // create
    dPoolContract
      .queryFilter(dPoolContract.filters[DPoolEvent.Created]())
      .then(async (events) => {
        if (!events) return
        const list: CreateEvent[] = []
        for (let i = 0; i < events.length; i++) {
          const event = events[i]
          if (!event.args) continue
          if (!poolIdsMap.has(event.args.poolId.toString())) continue
          const { from } = await event.getTransaction()
          const { timestamp } = await event.getBlock()
          list.push({
            name: DPoolEvent.Created,
            transactionHash: event.transactionHash,
            creator: from,
            poolId: event.args.poolId.toNumber(),
            timestamp,
          })
        }
        setCreateEventList(list)
      })
    // distribute
    dPoolContract
      .queryFilter(dPoolContract.filters[DPoolEvent.Distributed]())
      .then(async (events) => {
        if (!events) return
        const list: DistributeEvent[] = []
        for (let i = 0; i < events.length; i++) {
          const event = events[i]
          if (!event.args) continue
          if (!poolIdsMap.has(event.args.poolId.toString())) continue
          const { from } = await event.getTransaction()
          const { timestamp } = await event.getBlock()
          list.push({
            name: DPoolEvent.Created,
            transactionHash: event.transactionHash,
            distributor: from,
            poolId: event.args.poolId.toNumber(),
            timestamp,
          })
        }
        setDistributeEventList(list)
      })
  }, [dPoolContract, poolIdsMap])

  useEffect(() => {
    getPoolEvent()
  }, [getPoolEvent])

  if (!poolIds.length) return null
  return (
    <div className="flex flex-col gap-20 mb-10">
      {poolIds.map((id) => (
        <PoolDetail
          poolId={id}
          key={id}
          createEvent={createEventList.find(
            (e) => e.poolId.toString() === id.toString()
          )}
          fundEvent={fundEventList.find(
            (e) => e.poolId.toString() === id.toString()
          )}
          distributeEvent={distributeEventList.find(
            (e) => e.poolId.toString() === id.toString()
          )}
          claimEventList={claimedEventList.filter(
            (e) => e.poolId.toString() === id.toString()
          )}
          getPoolEvent={getPoolEvent}
        />
      ))}
    </div>
  )
}
