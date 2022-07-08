import { isAddress } from 'ethers/lib/utils'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import useDPoolFactory from './useDPoolFactory'
import { hooks as metaMaskHooks } from '../connectors/metaMask'
import { BigNumber } from 'ethers'
import { chains } from '../constants'
const { useAccount, useChainId } = metaMaskHooks

export default function useDPoolAddress() {
  const [address, setAddress] = useState<string>()
  const [isOwner, setIsOwner] = useState<boolean>(false)
  const [searchParams, setSearchParams] = useSearchParams()
  const dPoolFactory = useDPoolFactory()
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

  const getDPoolAddressByAccount = useCallback(
    async (account: string) => {
      if (!dPoolFactory || !account || !isAddress(account)) return
      const address = await dPoolFactory.distributionPoolOf(account)

      return address
    },
    [dPoolFactory]
  )

  useEffect(() => {
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
      setAddress(urlDPoolAddress)
    }
  }, [urlDPoolAddress, localStorageDPoolAddress, setDPoolAddress, DP_KEY])

  useEffect(() => {
    if (!account) return
    const req = getDPoolAddressByAccount(account)
    if (!req) return
    req.then((_address: string) => {
      if (_address && isAddress(_address) && address && isAddress(address)) {
        BigNumber.from(address).eq(_address)
          ? setIsOwner(true)
          : setIsOwner(false)
      }
    })
  }, [address, getDPoolAddressByAccount, account])

  return {
    dPoolAddress: address,
    setDPoolAddress,
    getDPoolAddressByAccount,
    isOwner,
  } as const
}
