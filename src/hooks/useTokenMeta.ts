import { BigNumber, constants, Contract } from 'ethers'
import { isAddress } from 'ethers/lib/utils'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { chains } from '../constants'
import { TokenMeta as TTokenMeta } from '../type'
import { hooks as metaMaskHooks } from '../connectors/metaMask'
import useSignerOrProvider from './useSignOrProvider'
import { useBalance } from './useBalance'
import { LOCAL_STORAGE_KEY } from '../store/storeKey'
import ERC20ABI from '../abis/erc20.json'

type TSetToken = (token: TTokenMeta) => void

const { useAccount, useChainId, useProvider } = metaMaskHooks
export default function useTokenMeta() {
  const account = useAccount()
  const chainId = useChainId()
  const signerOrProvider = useSignerOrProvider()
  const nativeTokenBalance = useBalance(account)

  const getERC20TokenContract = useCallback(
    (tokenAddress: string) => {
      if (!signerOrProvider || !tokenAddress || !isAddress(tokenAddress))
        return null
      return new Contract(tokenAddress, ERC20ABI, signerOrProvider)
    },
    [signerOrProvider]
  )

  const [tokens, setTokens] = useState(
    JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY.TOKEN_LIST) || '{}')
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
          balance: nativeTokenBalance || BigNumber.from(0),
          chainId,
        }
        return nativeToken
      }

      const tokenContract = getERC20TokenContract(address)!
      const decimals = await tokenContract.decimals()
      const symbol = await tokenContract.symbol()
      const balance = await tokenContract.balanceOf(account)
      const token = {
        symbol,
        decimals,
        balance,
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
  } as const
}
