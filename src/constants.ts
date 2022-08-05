import type { AddEthereumChainParameter } from '@web3-react/types'
import { constants } from 'ethers'

export interface Chain {
  chainId: number
  name: string
  symbol: string
  decimals: number
  dPoolFactoryAddress: string
  scan: string
  urls: string[]
}

interface Chains {
  [key: number]: Chain
}

const Mainnet: Chain = {
  chainId: 1,
  name: 'Ethereum Mainnet',
  symbol: 'ETH',
  decimals: 18,
  dPoolFactoryAddress: constants.AddressZero,
  scan: 'https://etherscan.io/tx/',
  urls: [],
}

const Polygon: Chain = {
  chainId: 137,
  name: 'Polygon',
  symbol: 'MATIC',
  decimals: 18,
  dPoolFactoryAddress: '0x43677d1e464EF3121B4Ea4Ff89133f71e05238e1',
  scan: 'https://polygonscan.com',
  urls: [
    'https://rpc-mainnet.matic.network',
    'https://matic-mainnet.chainstacklabs.com',
  ],
}
const Mumbai: Chain = {
  chainId: 80001,
  name: 'Mumbai',
  symbol: 'MATIC',
  decimals: 18,
  dPoolFactoryAddress: '0x7B6e14296d50C81D1F831224CD271FE9aCC18bd1',
  scan: 'https://mumbai.polygonscan.com/',
  urls: [
    'https://polygontestapi.terminet.io/rpc',
    'https://rpc.ankr.com/polygon_mumbai',
  ],
}

const RinkeBy: Chain = {
  chainId: 4,
  name: 'Rinkeby',
  symbol: 'ETH',
  decimals: 18,
  dPoolFactoryAddress: '0x43677d1e464EF3121B4Ea4Ff89133f71e05238e1',
  scan: 'https://rinkeby.etherscan.io',
  urls: ['https://rpc.ankr.com/eth_rinkeby'],
}
export const chains: Chains = {
  1: Mainnet,
  137: Polygon,
  4: RinkeBy,
  80001: Mumbai,
}

export function getAddChainParameters(
  chainId: number
): AddEthereumChainParameter | number {
  const chainInformation = chains[chainId]
  if (!chainInformation) return chainId
  return {
    chainId,
    chainName: chainInformation.name,
    nativeCurrency: {
      name: chainInformation.name,
      symbol: chainInformation.symbol,
      decimals: 18,
    },
    rpcUrls: chainInformation.urls,
    blockExplorerUrls: [chainInformation.scan],
  }
}
