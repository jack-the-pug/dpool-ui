import { BigNumber, constants, Contract } from 'ethers'
import { isAddress } from 'ethers/lib/utils'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { chains } from '../constants'
import { TokenMeta as TTokenMeta } from '../type'
import { hooks as metaMaskHooks } from '../connectors/metaMask'
import useSignerOrProvider from './useSignOrProvider'
import { LOCAL_STORAGE_KEY } from '../store/storeKey'
import ERC20ABI from '../abis/erc20.json'

type TSetToken = (token: TTokenMeta) => void

const { useAccount, useChainId, useProvider } = metaMaskHooks
export default function useTokenMeta() {
  const account = useAccount()
  const chainId = useChainId()
  const provider = useProvider()
  const signerOrProvider = useSignerOrProvider()
  const [tokens, setTokens] = useState(
    JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY.TOKEN_LIST) || '{}')
  )

  const getTokenBalance = useCallback(
    async (tokenAddress: string, address = account) => {
      if (!address || !provider) return BigNumber.from(0)
      if (BigNumber.from(tokenAddress).eq(0)) {
        return provider.getBalance(address)
      }
      const tokenContract = getERC20TokenContract(tokenAddress)!
      return await tokenContract.balanceOf(address)
    },
    [account, provider]
  )
  const getERC20TokenContract = useCallback(
    (tokenAddress: string) => {
      if (!signerOrProvider || !tokenAddress || !isAddress(tokenAddress))
        return null
      return new Contract(tokenAddress, ERC20ABI, signerOrProvider)
    },
    [signerOrProvider]
  )

  const setToken = useCallback<TSetToken>(
    (token: TTokenMeta) => {
      const _tokens = { ...tokens, [token.address.toLowerCase()]: token }
      setTokens(_tokens)
      localStorage.setItem(
        LOCAL_STORAGE_KEY.TOKEN_LIST,
        JSON.stringify(_tokens)
      )
    },
    [tokens]
  )
  const getToken = useCallback(
    async (address: string): Promise<TTokenMeta | undefined> => {
      if (!chainId) return
      if (BigNumber.from(address).eq(0)) {
        const nativeToken: TTokenMeta = {
          address: constants.AddressZero,
          decimals: chains[chainId].decimals,
          symbol: chains[chainId].symbol,
          chainId,
        }
        return nativeToken
      }
      if (tokens[address.toLowerCase()]) {
        return tokens[address.toLowerCase()]
      }
      const tokenContract = getERC20TokenContract(address)!
      const decimals = await tokenContract.decimals()
      const symbol = await tokenContract.symbol()
      const token = {
        symbol,
        decimals,
        address,
        chainId: chainId,
      }
      return token
    },
    [tokens, chainId, getERC20TokenContract]
  )
  const tokenList = useMemo<TTokenMeta[]>(() => Object.values(tokens), [tokens])
  return {
    tokenList,
    getToken,
    setToken,
    getERC20TokenContract,
    getTokenBalance,
  } as const
}
