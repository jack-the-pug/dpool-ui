import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { DPoolEvent } from '../../type'
import useDPoolAddress from '../../hooks/useDPoolAddress'
import { BigNumber, ethers } from 'ethers'
import { EosIconsBubbleLoading } from '../../components/icon'
import { Pool, PoolDetail } from './PoolDetail'
import { useDPoolContract } from '../../hooks/useContract'
import { useGraph } from '../../hooks/useGraph'
import { getContractTx } from '../../api/scan'
import { useWeb3React } from '@web3-react/core'
import DPoolABI from '../../abis/dPool.json'
import { useGetPoolDetail } from '../../hooks/useGetPoolDetail'
import { PoolSummary } from './Pool'
import { PoolListStats } from "./PoolListStats"
import { PoolMeta } from './PoolMeta'
const dPoolInterface = new ethers.utils.Interface(DPoolABI)
export default function PoolList() {
  const { chainId } = useWeb3React()
  const { dPoolAddress } = useDPoolAddress()
  const dPoolContract = useDPoolContract(dPoolAddress, true)
  const getPoolDetail = useGetPoolDetail(dPoolAddress)
  // local pool meta data in this chain
  const [poolIds, setPoolIds] = useState<string[]>([])
  const [poolMetaList, setPoolMetaList] = useState<Pool[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const getPoolFromContract = useCallback(() => {
    if (!dPoolContract || !chainId || !dPoolAddress) return
    setIsLoading(true)
    dPoolContract
      .lastPoolId()
      .then((id: BigNumber) => {
        setPoolIds(() =>
          Array(id.toNumber())
            .fill(0)
            .map((_, index) => `${index + 1}`)
            .reverse()
        )
      })
      .finally(() => setIsLoading(false))
  }, [dPoolContract, chainId, dPoolAddress])
  useEffect(() => {
    getPoolFromContract()
  }, [getPoolFromContract])

  useEffect(() => {
    setIsLoading(true)
    Promise.all(poolIds.map(getPoolDetail))
      .then((poolMetaList) => {
        poolMetaList = poolMetaList.filter((data) => data !== undefined)
        // @ts-ignore
        setPoolMetaList(poolMetaList)
      })
      .finally(() => setIsLoading(false))
  }, [poolIds, getPoolDetail])

  if (isLoading) {
    return <EosIconsBubbleLoading width="5em" height="5em" />
  }

  return (
    <div className="flex flex-col w-full break-all  flex-1">
      {dPoolAddress && <PoolMeta dPoolAddress={dPoolAddress} />}
      <PoolListStats list={poolMetaList} />
      <div className='mt-10 font-extrabold text-xl mb-2'>Distributions</div>
      <div className='w-full'>
        {poolMetaList.length ? (
          <div className="bg-white rounded-lg w-full">
            <table className='w-full'>
              <thead className="text-gray-500 text-xs">
                <tr className="bg-gray-100 ">
                  <td className="py-3">Name</td>
                  <td>
                    <span className="ml-2">State</span>
                  </td>
                  <td>PoolAmount</td>
                  <td>ClaimedAmount</td>
                  <td></td>
                </tr>
              </thead>
              <tbody>
                {poolMetaList.map((pool) => (
                  <PoolSummary pool={pool} key={pool.poolId} />
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          null
        )}
      </div>
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
          timestamp: (await provider.getBlock(transactionRes.blockNumber))
            .timestamp!,
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
      const events = (await Promise.all(txList.map(getEventByTx))).flat()
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
