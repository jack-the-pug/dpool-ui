import { useWeb3React } from '@web3-react/core'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from 'urql'
import { chains } from '../constants'

const CreatedDPoolQuery = `
  query {
    createDPools {
        id
        creator
        dPoolAddress
        transactionHash
        blockNumber
        timestamp
    }
  }
`
export interface CreatedDPool {
  id: string
  creator: string
  dPoolAddress: string
  transactionHash: string
  blockNumber: number
  timestamp: number
}

export function useGraph() {
  const { chainId } = useWeb3React()
  const [createdDPool, setCreatedDPool] = useState<CreatedDPool[]>([])

  const url = useMemo(() => {
    if (!chainId || !chains[chainId]) return
    return chains[chainId].graphUrl
  }, [chainId])
  const graphClient = useMemo(() => {
    if (!url) return
    return createClient({
      url,
    })
  }, [url])
  const getCreatedDPool = useCallback(async () => {
    if (!graphClient) return []
    const res = await graphClient.query(CreatedDPoolQuery).toPromise()
    if (!res || res.error) return []
    return res.data.createDPools
  }, [graphClient])

  useEffect(() => {
    getCreatedDPool().then((res) => {
      const typeRes = res.map(
        (row: { [key: string]: string }): CreatedDPool => ({
          id: row.id,
          creator: row.creator,
          dPoolAddress: row.dPoolAddress,
          transactionHash: row.transactionHash,
          blockNumber: Number(row.blockNumber),
          timestamp: Number(row.timestamp),
        })
      )
      setCreatedDPool(typeRes)
    })
  }, [getCreatedDPool])
  const getCreatedDPoolEventByAddress = useCallback(
    (dPoolAddress: string) =>
      createdDPool.find(
        (dPool) =>
          dPool.dPoolAddress.toLowerCase() === dPoolAddress.toLowerCase()
      ),
    [createdDPool]
  )
  return { getCreatedDPoolEventByAddress }
}
