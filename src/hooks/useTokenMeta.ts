import { BigNumber, Contract } from 'ethers'
import { isAddress } from 'ethers/lib/utils'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { chains, ESC20ABI } from '../constants'
import { TokenMeta as TTokenMeta } from '../type'
import { hooks as metaMaskHooks } from '../connectors/metaMask'
import useSignerOrProvider from './useSignOrProvider'
import { useBalance } from './useBalance'

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
      return new Contract(tokenAddress, ESC20ABI, signerOrProvider)
    },
    [signerOrProvider]
  )

  const [tokens, setTokens] = useState(
    JSON.parse(localStorage.getItem('tokenList') || '{}')
  )

  const setToken = useCallback<TSetToken>(
    (token: TTokenMeta) => {
      const _tokens = { ...tokens, [token.address.toLowerCase()]: token }
      setTokens(_tokens)
      localStorage.setItem('tokenList', JSON.stringify(_tokens))
    },
    [tokens]
  )
  const getToken = useCallback(
    async (address: string): Promise<TTokenMeta | undefined> => {
      if (!chainId) return
      console.log(
        'BigNumber.from(address).eq(0)',
        BigNumber.from(address).eq(0)
      )
      if (BigNumber.from(address).eq(0)) {
        const nativeToken: TTokenMeta = {
          address: '0x0000000000000000000000000000000000000000',
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
      setToken(token)
      return token
    },
    [tokens, chainId, getERC20TokenContract, setToken]
  )
  const tokenList = useMemo<TTokenMeta[]>(() => Object.values(tokens), [tokens])
  return {
    tokenList,
    getToken,
    setToken,
  } as const
}
