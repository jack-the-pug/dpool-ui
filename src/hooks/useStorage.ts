import { isAddress } from 'ethers/lib/utils'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { hooks as metaMaskHooks } from '../connectors/metaMask'
const { useChainId, useAccount } = metaMaskHooks

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
