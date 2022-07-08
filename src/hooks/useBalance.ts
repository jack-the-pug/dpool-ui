import { Web3ReactHooks } from "@web3-react/core"
import { BigNumber, utils } from "ethers"
import { useState, useEffect } from "react"

export function useBalance(
    provider: ReturnType<Web3ReactHooks['useProvider']>,
    account?: string,
  ): BigNumber | undefined {
    const [balance, setBalance] = useState<BigNumber | undefined>()
    useEffect(() => {
      if (provider && account) {
        let stale = false
        provider.getBalance(account).then(b => {
            setBalance(b)
        })
        return () => {
          stale = true
          setBalance(undefined)
        }
      }
    }, [provider, account])
    return balance
  }