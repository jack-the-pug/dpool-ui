import { useWeb3React } from '@web3-react/core'
import { isAddress } from 'ethers/lib/utils'
import { useCallback, useEffect, useMemo, useState } from 'react'

export function useStorageDPoolAddress() {
  const { account, chainId } = useWeb3React()
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
