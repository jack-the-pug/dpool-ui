import { isAddress } from 'ethers/lib/utils'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

import { BigNumber } from 'ethers'
import { chains } from '../constants'

import { hooks as metaMaskHooks } from '../connectors/metaMask'
import { useDPoolFactoryContract } from './useContract'
const { useAccount, useChainId } = metaMaskHooks

export default function useDPoolAddress() {
  const [address, setAddress] = useState<string>()
  const [isOwner, setIsOwner] = useState<boolean>(true)
  const [searchParams, setSearchParams] = useSearchParams()
  const dPoolFactory = useDPoolFactoryContract()
  const account = useAccount()
  const chainId = useChainId()
  const DP_KEY = useMemo(() => {
    if (!chainId || !account) return undefined
    return `${chainId}-${account.toLowerCase()}-${chains[
      chainId
    ]?.dPoolFactoryAddress.toLowerCase()}-DPOOL-ADDRESS`
  }, [account, chainId])

  const urlDPoolAddress = useMemo(() => {
    return searchParams.get('dPoolAddress')
  }, [searchParams])

  const localStorageDPoolAddress = useMemo(() => {
    if (!DP_KEY) return undefined
    const address = localStorage.getItem(DP_KEY) || undefined
    return address
  }, [DP_KEY])

  const setDPoolAddress = useCallback(
    (address: string) => {
      if (!address || !isAddress(address)) return
      setAddress(address)
      setSearchParams(
        { ...searchParams, dPoolAddress: address },
        { replace: true }
      )
    },
    [searchParams, setSearchParams]
  )
  useEffect(() => {
    if (!urlDPoolAddress && !localStorageDPoolAddress) return
    if (
      !urlDPoolAddress &&
      localStorageDPoolAddress &&
      isAddress(localStorageDPoolAddress)
    ) {
      setDPoolAddress(localStorageDPoolAddress)
      return
    }
    if (urlDPoolAddress && isAddress(urlDPoolAddress) && DP_KEY) {
      localStorage.setItem(DP_KEY, urlDPoolAddress)
      setDPoolAddress(urlDPoolAddress)
    }
  }, [urlDPoolAddress, localStorageDPoolAddress, DP_KEY])

  const getDPoolAddressByAccount = useCallback(
    async (account: string) => {
      if (!dPoolFactory || !account || !isAddress(account)) return
      try {
        const address = await dPoolFactory.distributionPoolOf(account)
        return address
      } catch {
        return
      }
    },
    [dPoolFactory]
  )

  useEffect(() => {
    if (!account) return
    if (!address) return
    const res = getDPoolAddressByAccount(account)
    if (!res) return
    res.then((_address: string) => {
      if (_address && isAddress(_address)) {
        setIsOwner(() => BigNumber.from(address).eq(_address))
      } else {
        setIsOwner(false)
      }
    })
  }, [address, getDPoolAddressByAccount, account, chainId])

  return {
    dPoolAddress: address,
    setDPoolAddress,
    getDPoolAddressByAccount,
    isOwner,
  } as const
}
