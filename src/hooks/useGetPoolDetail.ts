import { useWeb3React } from '@web3-react/core'
import { useCallback } from 'react'
import { Pool } from '../pages/pool/PoolDetail'
import { GetPoolRes, PoolState } from '../type'
import { useDPoolContract } from './useContract'
import { get, set } from 'idb-keyval'
import { BigNumber } from 'ethers'

export function useGetPoolDetail(dPoolAddress: string | undefined) {
  const { chainId } = useWeb3React()
  const dPoolContract = useDPoolContract(dPoolAddress, true)
  const getPoolDetail = useCallback(
    async (poolId: string): Promise<undefined | Pool> => {
      if (!dPoolContract || !poolId || !dPoolAddress) return
      const localStoreKey = `${chainId}-${dPoolAddress.toLowerCase()}-${poolId}`
      const localStorePool: Pool | undefined = await get(localStoreKey)
      //  BigNumber is customization object. In local store lose prototype.
      if (localStorePool) {
        localStorePool.amounts = localStorePool.amounts.map((n) =>
          BigNumber.from(n)
        )
        localStorePool.claimedAmount = BigNumber.from(
          localStorePool.claimedAmount
        )

        localStorePool.totalAmount = BigNumber.from(localStorePool.totalAmount)
        return localStorePool
      }
      try {
        const poolRes: GetPoolRes = await dPoolContract.getPoolById(poolId)
        const {
          amounts,
          claimedAmount,
          claimers,
          deadline,
          distributor,
          totalAmount,
          name,
          startTime,
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
          token,
          state,
          poolId,
        }
        if (startTime !== 0) {
          if (_poolMeta.state === PoolState.Closed) {
            set(localStoreKey, _poolMeta)
          }
          return _poolMeta
        }
      } catch {}
    },
    [dPoolContract, chainId]
  )
  return getPoolDetail
}
