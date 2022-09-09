import { useWeb3React } from "@web3-react/core";
import { useCallback } from "react";
import { Pool } from "../pages/pool/PoolDetail";
import { GetPoolRes } from "../type";
import { useDPoolContract } from "./useContract";

export function useGetPoolDetail(dPoolAddress: string | undefined) {
  const { chainId } = useWeb3React()
  const dPoolContract = useDPoolContract(dPoolAddress)
  const getPoolDetail = useCallback(async (poolId: string): Promise<undefined | Pool> => {
    if (!dPoolContract || !poolId || !dPoolAddress) return
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
        poolId
      }
      if (startTime !== 0) {
        return _poolMeta
      }
    } catch {

    }
  }, [dPoolContract, chainId])
  return getPoolDetail
}