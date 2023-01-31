import { BigNumber, constants, Contract } from 'ethers'
import { isAddress } from 'ethers/lib/utils'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { chains } from '../constants'
import { TokenMeta } from '../type'
import ERC20ABI from '../abis/erc20.json'
import { get, set, values } from 'idb-keyval'
import { useWeb3React } from '@web3-react/core'
type TSetToken = (token: TokenMeta) => void

export default function useTokenMeta() {
  const { account, chainId, provider } = useWeb3React()
  const [tokens, setTokens] = useState<TokenMeta[]>([])
  const getTokensByStore = useCallback(async () => {
    const storeValues = await values()
    const tokenList = storeValues.filter((data) => data.symbol && data.decimals)
    setTokens(tokenList)
  }, [chainId])
  useEffect(() => {
    getTokensByStore()
  }, [getTokensByStore])
  const getTokenBalance = useCallback(
    async (tokenAddress: string, address = account) => {
      if (!address || !provider) return BigNumber.from(0)
      if (BigNumber.from(tokenAddress).eq(0)) {
        return await provider.getBalance(address)
      }
      const tokenContract = getERC20TokenContract(tokenAddress)!
      return await tokenContract.balanceOf(address)
    },
    [account, provider]
  )
  const getERC20TokenContract = useCallback(
    (tokenAddress: string) => {
      if (!provider || !tokenAddress || !isAddress(tokenAddress)) return null
      return new Contract(tokenAddress, ERC20ABI, provider)
    },
    [provider]
  )

  const setToken = useCallback<TSetToken>(
    (token: TokenMeta) => {
      const localTokenKey = `token-${chainId}-${token.address.toLowerCase()}`
      token.userAdd = true
      set(localTokenKey, token)
      getTokensByStore()
    },
    [tokens, getTokensByStore]
  )
  const getToken = useCallback(
    async (address: string): Promise<TokenMeta | undefined> => {
      if (!chainId || !chains[chainId]) return
      const localTokenKey = `token:${chainId}-${address.toLowerCase()}`
      let tokenMeta: TokenMeta | undefined = await get(localTokenKey)
      if (tokenMeta) return tokenMeta
      if (BigNumber.from(address).eq(0)) {
        tokenMeta = {
          address: constants.AddressZero,
          decimals: chains[chainId].decimals,
          symbol: chains[chainId].symbol,
          chainId,
        }
      } else {
        const tokenContract = getERC20TokenContract(address)!
        const decimals = await tokenContract.decimals()
        const symbol = await tokenContract.symbol()
        tokenMeta = {
          symbol,
          decimals,
          address,
          chainId: chainId,
        }
      }
      set(localTokenKey, tokenMeta)
      return tokenMeta
    },
    [tokens, chainId, getERC20TokenContract]
  )
  const tokenList = useMemo(
    () => tokens.filter((token) => token.chainId === chainId),
    [tokens, chainId]
  )
  return {
    tokenList,
    getToken,
    setToken,
    getERC20TokenContract,
    getTokenBalance,
  } as const
}
