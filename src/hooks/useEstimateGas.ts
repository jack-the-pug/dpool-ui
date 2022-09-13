import { BigNumber, Contract } from "ethers";
import { useCallback } from "react";
import { useDPoolContract } from "./useContract";

export function useEstimateGas(contract: Contract | undefined) {
  const estimateGas = useCallback(async (method: string, arg: any): Promise<BigNumber | undefined> => {
    if (!contract) return
    const gas = await contract.estimateGas[method](...arg)
    return gas
  }, [contract])
  return estimateGas
}
