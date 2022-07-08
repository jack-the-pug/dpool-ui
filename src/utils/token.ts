import { Contract } from 'ethers'
import { ESC20ABI } from '../constants'
import type { Web3Provider } from '@ethersproject/providers'

export interface TokenInfo {
  decimals: number
  symbol: string
}

export function getTokenContract(tokenAddress: string, provider: Web3Provider) {
  return new Contract(tokenAddress, ESC20ABI, provider)
}
