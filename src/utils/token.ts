import { Contract } from 'ethers'
import ERC20ABI from '../abis/erc20.json'
import type { Web3Provider } from '@ethersproject/providers'

export interface TokenInfo {
  decimals: number
  symbol: string
}

export function getTokenContract(tokenAddress: string, provider: Web3Provider) {
  return new Contract(tokenAddress, ERC20ABI, provider)
}
