import { Web3ReactHooks } from '@web3-react/core'
import { BigNumber, utils } from 'ethers'
import { useState, useEffect } from 'react'

export function useBalance(
  provider: ReturnType<Web3ReactHooks['useProvider']>,
  account: string | undefined
): BigNumber | undefined {
  const [balance, setBalance] = useState<BigNumber | undefined>()
  useEffect(() => {
    if (provider && account) {
      provider.getBalance(account).then(setBalance)
    }
  }, [provider, account])
  return balance
}
