import { BigNumber, utils } from 'ethers'
import { useState, useEffect } from 'react'
import { hooks as metaMaskHooks } from '../connectors/metaMask'
const { useProvider } = metaMaskHooks
export function useBalance(account: string | undefined): BigNumber | undefined {
  const provider = useProvider()
  const [balance, setBalance] = useState<BigNumber>()
  useEffect(() => {
    if (provider && account) {
      provider.getBalance(account).then(setBalance)
    }
  }, [provider, account])
  return balance
}
