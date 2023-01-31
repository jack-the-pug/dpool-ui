import { useWeb3React } from "@web3-react/core";
import { BigNumber, utils } from "ethers";
import { useEffect, useMemo, useState } from "react";
import { chains } from "../constants";
import { useDPoolContract } from "../hooks/useContract";
import useDPoolAddress from "../hooks/useDPoolAddress";
import { useEstimateGas } from "../hooks/useEstimateGas";
import { EosIconsBubbleLoading, IcBaselineLocalGasStation } from "./icon";

interface EstimateGasProps {
  method: string,
  arg: any[]
}
export function EstimateGas(props: EstimateGasProps) {
  const { method, arg } = props
  const { provider, chainId } = useWeb3React()
  const { dPoolAddress } = useDPoolAddress()
  const dPoolContract = useDPoolContract(dPoolAddress)
  const getDPoolEstimateGas = useEstimateGas(dPoolContract)
  const [gasFee, setGasFee] = useState<BigNumber>()
  const [loading, setLoading] = useState<boolean>(false)
  useEffect(() => {
    if (!provider) return
    setLoading(true)
    getDPoolEstimateGas(method, arg).then(async _gas => {
      if (_gas) {
        const gasPrice = await provider.getGasPrice() // gwei
        const fee = gasPrice.mul(_gas)
        setGasFee(fee)
      }
    })
      .finally(() => setLoading(false))
  }, [getDPoolEstimateGas, method, arg, provider])
  const nativeCurrency = useMemo(() => {
    if (!chainId) return
    return chains[chainId].symbol
  }, [chainId])
  if (!chainId) return null
  if (loading) return <div className="flex text-xs text-gray-400 my-1"><EosIconsBubbleLoading />Estimate gas fee</div>
  if (gasFee)
    return <div className="text-xs text-gray-400 my-1 flex items-center"><IcBaselineLocalGasStation className="w-4 h-4" />:{utils.formatUnits(gasFee, "gwei")} {nativeCurrency}</div>
  // return <div className="text-xs text-gray-400 my-1">Unknown Fee</div>
  return null
}