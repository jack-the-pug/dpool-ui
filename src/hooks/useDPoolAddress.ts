import { isAddress } from 'ethers/lib/utils'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { BigNumber } from 'ethers'
import { chains } from '../constants'
import { useDPoolFactoryContract } from './useContract'
import { useWeb3React } from '@web3-react/core'

export default function useDPoolAddress() {
  const [address, setAddress] = useState<string>()
  const [isOwner, setIsOwner] = useState<boolean>(true)
  const [searchParams, setSearchParams] = useSearchParams()
  const dPoolFactory = useDPoolFactoryContract()
  const { chainId, account } = useWeb3React()
  const DP_KEY = useMemo(() => {
    if (!chainId) return undefined
    return `${chainId}-${chains[
      chainId
    ]?.dPoolFactoryAddress.toLowerCase()}-DPOOL-ADDRESS`
  }, [chainId])

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
      if (!address || !isAddress(address) || !chainId) return
      setAddress(address)
      setSearchParams(
        { ...searchParams, dPoolAddress: address, chainId: chainId.toString() },
        { replace: true }
      )
    },
    [searchParams, setSearchParams, chainId]
  )
  useEffect(() => {
    if (!urlDPoolAddress && !localStorageDPoolAddress) return
    if (urlDPoolAddress && isAddress(urlDPoolAddress)) {
      setDPoolAddress(urlDPoolAddress)
      DP_KEY && localStorage.setItem(DP_KEY, urlDPoolAddress)
    }
    if (
      !urlDPoolAddress &&
      localStorageDPoolAddress &&
      isAddress(localStorageDPoolAddress)
    ) {
      setDPoolAddress(localStorageDPoolAddress)
      return
    }
  }, [urlDPoolAddress, localStorageDPoolAddress, DP_KEY, chainId])

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
    if (!account || !address) return
    getDPoolAddressByAccount(account).then((_address: string) => {
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
