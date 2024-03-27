import { useWeb3React } from '@web3-react/core'
import { Contract, ContractInterface } from 'ethers'
import { isAddress } from 'ethers/lib/utils'
import { useMemo } from 'react'
import { useSigner } from './useSigner'
import DPoolABI from '../abis/dPool.json'
import DPoolFactoryABI from '../abis/dPoolFactory.json'
import ERC20ABI from '../abis/erc20.json'
import EIP2612 from '../abis/eip2612.json'
import { chains } from '../constants'

export function useContract(
  contractAddress: string | undefined,
  abi: ContractInterface,
  view: boolean = true
): Contract | undefined {
  const { provider } = useWeb3React()
  const signer = useSigner()
  return useMemo(() => {
    if (!contractAddress || !isAddress(contractAddress)) return
    if (!provider) return
    if (!view && !signer) return
    console.log("view", view)
    return new Contract(
      contractAddress,
      abi,
      view ? provider : signer!
    )
  }, [provider, signer, contractAddress, view])
}
export function useDPoolFactoryContract() {
  const { chainId } = useWeb3React()
  const address = useMemo(() => {
    if (!chainId || !chains[chainId]) return
    return chains[chainId].dPoolFactoryAddress
  }, [chainId])
  return useContract(address, DPoolFactoryABI, false)
}

export function useDPoolContract(
  dPoolAddress: string | undefined,
  view: boolean = true
) {
  return useContract(dPoolAddress, DPoolABI, view)
}

export function useERC20Contract(tokenAddress: string) {
  return useContract(tokenAddress, ERC20ABI)
}

export function useEIP2612Contract(tokenAddress: string) {
  return useContract(tokenAddress, EIP2612)
}
