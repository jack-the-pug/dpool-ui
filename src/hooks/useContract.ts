import { useWeb3React } from '@web3-react/core'
import { Contract, ContractInterface } from 'ethers'
import { isAddress } from 'ethers/lib/utils'
import { useMemo } from 'react'
import useSignerOrProvider from './useSignOrProvider'
import DPoolABI from '../abis/dPool.json'
import DPoolFactoryABI from '../abis/dPoolFactory.json'
import ERC20ABI from '../abis/erc20.json'
import EIP2612 from '../abis/eip2612.json'
import { chains } from '../constants'

export function useContract(
  contractAddress: string | undefined,
  abi: ContractInterface
): Contract | undefined {
  const signerOrProvider = useSignerOrProvider()
  return useMemo(() => {
    if (!contractAddress || !isAddress(contractAddress)) return
    if (!signerOrProvider) return
    return new Contract(contractAddress, abi, signerOrProvider)
  }, [signerOrProvider, contractAddress])
}
export function useDPoolFactoryContract() {
  const { chainId } = useWeb3React()
  const address = useMemo(() => {
    if (!chainId || !chains[chainId]) return
    return chains[chainId].dPoolFactoryAddress
  }, [chainId])
  return useContract(address, DPoolFactoryABI)
}

export function useDPoolContract(dPoolAddress: string | undefined) {
  return useContract(dPoolAddress, DPoolABI)
}

export function useERC20Contract(tokenAddress: string) {
  return useContract(tokenAddress, ERC20ABI)
}

export function useEIP2612Contract(tokenAddress: string) {
  return useContract(tokenAddress, EIP2612)
}
