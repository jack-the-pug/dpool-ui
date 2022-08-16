import { useState, useEffect, useCallback, useMemo } from 'react'
import { hooks as metaMaskHooks } from '../../connectors/metaMask'
import { Link, useParams } from 'react-router-dom'
import { DPoolEvent, DPoolLocalStorageMeta } from '../../type'
import useDPoolAddress from '../../hooks/useDPoolAddress'
import useDPool from '../../hooks/useDPool'
import { BigNumber } from 'ethers'
import { EosIconsBubbleLoading } from '../../components/icon'
import { LOCAL_STORAGE_KEY } from '../../store/storeKey'
import { PoolDetail } from './PoolDetail'
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

export interface ActionEvent {
  name: DPoolEvent
  timestamp: number
  transactionHash: string
  poolId: string | number
  from: string
}

export function PoolDetailList() {
  const { poolIds: _poolIds } = useParams()
  const { dPoolAddress } = useDPoolAddress()
  const dPoolContract = useDPool(dPoolAddress)
  const eventList = [
    DPoolEvent.Created,
    DPoolEvent.Claimed,
    DPoolEvent.Funded,
    DPoolEvent.Distributed,
  ]
  const [eventMetaDataList, setEventMetaDataList] = useState<ActionEvent[][]>(
    () => eventList.map(() => [])
  )
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

  const getPoolEvent = useCallback(
    async (eventName: DPoolEvent) => {
      if (!dPoolContract || poolIdsMap.size === 0) return []
      const nowBlock = await dPoolContract.provider.getBlockNumber()
      const events = await dPoolContract.queryFilter(
        dPoolContract.filters[eventName](),
        nowBlock - 1000 > 0 ? nowBlock - 1000 : 0,
        nowBlock
      )
      if (!events) return []
      const list: ActionEvent[] = []
      for (let i = 0; i < events.length; i++) {
        const event = events[i]
        if (!event.args) continue
        if (!poolIdsMap.has(event.args.poolId.toString())) continue
        const { from } = await event.getTransaction()
        const { timestamp } = await event.getBlock()
        list.push({
          name: eventName,
          transactionHash: event.transactionHash,
          poolId: event.args.poolId.toNumber(),
          timestamp,
          from,
        })
      }
      return list
    },
    [dPoolContract, poolIdsMap]
  )
  const getPoolEvents = useCallback(
    async () => await Promise.all(eventList.map(getPoolEvent)),
    [getPoolEvent]
  )
  useEffect(() => {
    getPoolEvents().then(setEventMetaDataList)
  }, [getPoolEvent])
  if (!poolIds.length) return null
  return (
    <div className="flex flex-col gap-20 mb-10">
      {poolIds.map((id) => (
        <PoolDetail
          poolId={id}
          key={id}
          createEvent={eventMetaDataList[0].find(
            (e) => e.poolId.toString() === id.toString()
          )}
          claimEventList={eventMetaDataList[1].filter(
            (e) => e.poolId.toString() === id.toString()
          )}
          fundEvent={eventMetaDataList[2].find(
            (e) => e.poolId.toString() === id.toString()
          )}
          distributeEvent={eventMetaDataList[3].find(
            (e) => e.poolId.toString() === id.toString()
          )}
          getPoolEvent={getPoolEvents}
        />
      ))}
    </div>
  )
}
