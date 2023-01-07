import { useWeb3React } from "@web3-react/core";
import { BigNumber, utils } from "ethers";
import { useEffect, useState } from "react";
import { useDPoolContract } from "../hooks/useContract";
import useDPoolAddress from "../hooks/useDPoolAddress";
import { useEstimateGas } from "../hooks/useEstimateGas";
import { EosIconsBubbleLoading } from "./icon";

interface EstimateGasProps {
  method: string,
  arg: any[]
}
export function EstimateGas(props: EstimateGasProps) {
  const { method, arg } = props
  const { provider } = useWeb3React()
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
        const gasPrice = await provider.getGasPrice()
        const fee = gasPrice.mul(_gas)
        setGasFee(fee)
      }
    })
      .finally(() => setLoading(false))
  }, [getDPoolEstimateGas, method, arg, provider])
  if (loading) return <div className="flex text-xs text-gray-400 my-1"><EosIconsBubbleLoading />Estimate gas fee</div>
  if (gasFee)
    return <div className="text-xs text-gray-400 my-1">Gas Fee:{utils.formatEther(gasFee)}</div>
  return <div className="text-xs text-gray-400 my-1">Unknown Fee</div>
}