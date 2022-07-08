import { useWeb3React } from '@web3-react/core'
import { Contract, ContractInterface } from 'ethers'
import { isAddress } from 'ethers/lib/utils'
import { useEffect, useMemo, useState } from 'react'
import useSignerOrProvider from './useSignOrProvider'
import { hooks as metaMaskHooks } from '../connectors/metaMask'
import { chains, dPoolFactoryABI } from '../constants'
const { useChainId, useAccount } = metaMaskHooks
export default function useDPoolFactory() {
  const chainId = useChainId()
  const { provider } = useWeb3React()
  const signerOrProvider = useSignerOrProvider()

  const contractAddress = useMemo(() => {
    if (!chainId) return
    return chains[chainId]?.dPoolFactoryAddress
  }, [chainId])
  const [isContractExist, setIsContractExist] = useState(false)
  useEffect(() => {
    if (!contractAddress || !provider) return
    provider.getCode(contractAddress).then((code: string) => {
      if (code.length > 2) setIsContractExist(true)
    })
  }, [provider, contractAddress])

  const contract = useMemo(() => {
    if (!signerOrProvider || !contractAddress) return null
    return new Contract(contractAddress, dPoolFactoryABI, signerOrProvider)
  }, [signerOrProvider, contractAddress])
  return contract
}
