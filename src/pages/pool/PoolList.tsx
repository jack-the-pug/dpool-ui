import { useState, useEffect, useCallback, useMemo } from 'react'
import { hooks as metaMaskHooks } from '../../connectors/metaMask'
import { Link, useParams } from 'react-router-dom'
import { DPoolEvent, DPoolLocalStorageMeta } from '../../type'
import useDPoolAddress from '../../hooks/useDPoolAddress'
import { BigNumber, ethers } from 'ethers'
import { EosIconsBubbleLoading } from '../../components/icon'
import { LOCAL_STORAGE_KEY } from '../../store/storeKey'
import { PoolDetail } from './PoolDetail'
import { useDPoolContract } from '../../hooks/useContract'
import { useGraph } from '../../hooks/useGraph'
import { getContractTx } from '../../api/scan'
import { useWeb3React } from '@web3-react/core'
import DPoolABI from '../../abis/dPool.json'

const dPoolInterface = new ethers.utils.Interface(DPoolABI)
const { useChainId } = metaMaskHooks
export default function PoolList() {
  const chainId = useChainId()
  const { dPoolAddress } = useDPoolAddress()
  const dPoolContract = useDPoolContract(dPoolAddress)

  // local pool meta data in this chain
  const [poolList, setPoolList] = useState<DPoolLocalStorageMeta[]>([])

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
      const listInDPoolContract = Array(id.toNumber())
        .fill(0)
        .map((_, index) => ({
          poolIds: [`${index + 1}`],
          name: `Distribution Pool`,
          creator: '',
          chainId,
          dPoolAddress,
        }))
        .reverse()

      setPoolList(listInDPoolContract)
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
  const { provider, chainId } = useWeb3React()
  const { getCreatedDPoolEventByAddress } = useGraph()
  const dPoolContract = useDPoolContract(dPoolAddress)

  const [eventMetaDataList, setEventMetaDataList] = useState<ActionEvent[]>([])

  const startBlock = useMemo(() => {
    if (!dPoolAddress) return undefined
    return getCreatedDPoolEventByAddress(dPoolAddress)
  }, [dPoolAddress, getCreatedDPoolEventByAddress])

  const poolIds = useMemo((): string[] => {
    if (!_poolIds) return []
    try {
      const ids = _poolIds.split(',')
      return ids
    } catch {
      return []
    }
  }, [_poolIds])

  const getEventByTx = useCallback(
    async (txhash: string): Promise<ActionEvent[]> => {
      if (!provider) return []
      const transaction = await provider.getTransaction(txhash)
      const transactionRes = await transaction.wait()
      const logs = transactionRes.logs
        .map((log) => {
          try {
            const parsedLog = dPoolInterface.parseLog(log)
            return parsedLog
          } catch {
            return
          }
        })
        .filter((log) => log != undefined)
      const events: ActionEvent[] = []
      for (let i = 0; i < logs.length; i++) {
        const log = logs[i]!
        events.push({
          name: log.name as DPoolEvent,
          timestamp: await (
            await provider.getBlock(transactionRes.blockNumber)
          ).timestamp!,
          transactionHash: transactionRes.transactionHash,
          poolId: log.args.poolId,
          from:
            log.name === DPoolEvent.Claimed
              ? log.args.claimer
              : transaction.from,
        })
      }
      return events
    },
    [provider]
  )

  const getTxListByScanAPI = useCallback(async () => {
    if (!chainId || !dPoolContract || !dPoolAddress || !startBlock) return
    const nowBlock = await dPoolContract.provider.getBlockNumber()
    const txList = await getContractTx(
      chainId,
      dPoolAddress,
      startBlock.blockNumber,
      nowBlock,
      poolIds
    )
    return txList
  }, [dPoolContract, dPoolAddress, startBlock, chainId, poolIds])

  const getPoolEvents = useCallback(async () => {
    getTxListByScanAPI().then(async (txList) => {
      if (!txList) return
      const events = await (await Promise.all(txList.map(getEventByTx))).flat()
      setEventMetaDataList(events)
    })
  }, [getTxListByScanAPI, getEventByTx, chainId])

  useEffect(() => {
    getPoolEvents()
  }, [getPoolEvents])

  if (!poolIds.length) return null
  return (
    <div className="flex flex-col gap-20 mb-10">
      {poolIds.map((id) => (
        <PoolDetail
          key={id}
          poolId={id}
          createEvent={eventMetaDataList.find(
            (e) =>
              e.name === DPoolEvent.Created &&
              e.poolId.toString() === id.toString()
          )}
          fundEvent={eventMetaDataList.find(
            (e) =>
              e.name === DPoolEvent.Funded &&
              e.poolId.toString() === id.toString()
          )}
          cancelEvent={eventMetaDataList.find(
            (e) =>
              e.name === DPoolEvent.Canceled &&
              e.poolId.toString() === id.toString()
          )}
          distributeEvent={eventMetaDataList.find(
            (e) =>
              e.name === DPoolEvent.Distributed &&
              e.poolId.toString() === id.toString()
          )}
          claimEventList={eventMetaDataList.filter(
            (e) =>
              e.name === DPoolEvent.Claimed &&
              e.poolId.toString() === id.toString()
          )}
          getPoolEvent={getPoolEvents}
        />
      ))}
    </div>
  )
}
