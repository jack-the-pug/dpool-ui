import { BigNumber } from 'ethers'
import { API_LIST } from '../constants'
import { ChainId } from '../type'

export async function getContractTx(
  chainId: ChainId,
  contractAddress: string,
  startBlock: number,
  endBlock: number,
  poolIds?: string[]
) {
  const api = API_LIST[chainId]
  if (!api) return []
  const req = await fetch(
    `${api.url}/api?module=logs&action=getLogs&fromBlock=${startBlock}&toBlock=${endBlock}&address=${contractAddress}&apikey=${api.key}
    `
  )
  const res = await req.json()
  const txList: string[] = res.result
    .filter((tx: any) => {
      /**
       * https://docs.ethers.io/v5/concepts/events/#events--logs-and-filtering
       *
       * topics[0] = utils.id(Event)
       * topics[1] = event first indexed param.
       *
       * Below code mean: return false when not have poolId.
       * */
      if (!tx.topics[1]) return false
      const poolId = BigNumber.from(tx.topics[1]).toString()
      if (!poolIds) return true
      return poolIds.includes(poolId)
    })
    .map((tx: any) => tx.transactionHash)
  // de-duplication transaction
  const txMap = new Map()
  txList.forEach((tx) => txMap.set(tx.toLowerCase(), tx))
  return Array.from(txMap.values())
}
