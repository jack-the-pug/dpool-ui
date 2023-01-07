import { useContract } from "../../hooks/useContract";
import DPoolABI from '../../abis/dPool.json'
import { useEffect, useState } from "react";
import { AddressLink } from "../../components/hash";
import { CreatedDPool, useGraph } from "../../hooks/useGraph";
import { format } from "date-fns";
import { useWeb3React } from "@web3-react/core";
import { chains } from "../../constants";
interface PoolMetaProps {
  dPoolAddress: string
}
export function PoolMeta(props: PoolMetaProps) {
  const { dPoolAddress } = props
  const { chainId } = useWeb3React()
  const dPoolContract = useContract(dPoolAddress, DPoolABI)
  const { getCreatedDPoolEventByAddress } = useGraph()
  const [owner, setOwner] = useState<string>()
  const [createPoolData, setCreatePoolData] = useState<CreatedDPool>()
  const [factor, setFactor] = useState<string>()
  useEffect(() => {
    if (!dPoolContract) return
    dPoolContract.owner().then(setOwner)
  }, [dPoolContract])
  useEffect(() => {
    setCreatePoolData(getCreatedDPoolEventByAddress(dPoolAddress))
  }, [getCreatedDPoolEventByAddress, dPoolAddress])
  useEffect(() => {
    if (!chainId || !chains[chainId]) return
    setFactor(chains[chainId].dPoolFactoryAddress)
  }, [chainId])
  return <div className="bg-white p-4 rounded-xl mb-4">
    <p className="font-bold">Pool Meta</p>
    <div className="flex mt-2">
      <span className="text-gray-500 w-40">Address</span>
      <AddressLink address={dPoolAddress} className="ml-2 font-medium">{dPoolAddress}</AddressLink>
    </div>
    <div className="flex mt-2">
      <span className="text-gray-500 w-40">Owner/Deployer</span>
      {owner ? <AddressLink address={owner} className="ml-2 font-medium">{owner}</AddressLink> : null}</div>
    <div className="flex mt-2">
      <span className="text-gray-500 w-40">Factor</span>
      {factor ? <AddressLink address={factor} className="ml-2 font-medium">{factor}</AddressLink> : null}
    </div>
    <div className="flex mt-2">
      <span className="text-gray-500 w-40">Deploy Date</span>
      {createPoolData ? <span className="ml-2 font-medium">{format(new Date(createPoolData.timestamp * 1000), "PPpp")}</span> : null}
    </div>

  </div>
}