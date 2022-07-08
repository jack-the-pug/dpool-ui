import { isAddress } from 'ethers/lib/utils'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { hooks as metaMaskHooks } from '../connectors/metaMask'
const { useChainId, useAccount } = metaMaskHooks

export function useLocalStorage<T>(key: string, initialValue: T) {
  // State to store our value
  // Pass initial state function to useState so logic is only executed once
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue
    }
    try {
      // Get from local storage by key
      const item = window.localStorage.getItem(key)
      // Parse stored json or if none return initialValue
      return item ? JSON.parse(item) : initialValue
    } catch (error) {
      // If error also return initialValue
      console.log(error)
      return initialValue
    }
  })
  // Return a wrapped version of useState's setter function that ...
  // ... persists the new value to localStorage.
  const setValue = (value: T | ((val: T) => T)) => {
    try {
      // Allow value to be a function so we have same API as useState
      const valueToStore =
        value instanceof Function ? value(storedValue) : value
      // Save state
      setStoredValue(valueToStore)
      // Save to local storage
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore))
      }
    } catch (error) {
      // A more advanced implementation would handle the error case
      console.log(error)
    }
  }
  return [storedValue, setValue] as const
}

export function useStorageDPoolAddress() {
  const account = useAccount()
  const chainId = useChainId()
  const [dPoolAddress, setDPollAddress] = useState<string>()

  const dPoolFlag = useMemo(() => {
    if (!chainId || !account) return false
    return `${chainId}-${account.toLowerCase()}-DPOOL-ADDRESS`
  }, [chainId, account])

  useEffect(() => {
    if (!dPoolFlag) return
    const localDPollAddress = localStorage.getItem(dPoolFlag)
    if (!localDPollAddress || !isAddress(localDPollAddress)) return
    setDPollAddress(localDPollAddress)
  }, [dPoolFlag])

  const _setDPollAddress = useCallback(
    (address: string) => {
      if (!dPoolFlag) return
      if (!address || !isAddress(address)) return
      localStorage.setItem(dPoolFlag, address)
      setDPollAddress(address)
    },
    [dPoolFlag]
  )

  return { dPoolFlag, dPoolAddress, setDPollAddress: _setDPollAddress } as const
}
