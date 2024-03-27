import { useWeb3React } from '@web3-react/core'
import { Signer } from 'ethers'
import { useMemo } from 'react'

export function useSigner() {
  const { provider, chainId } = useWeb3React()
  const singer = useMemo(() => {
    if (!provider || !chainId) return null
    return (provider as any).getSigner() as Signer
  }, [provider, chainId])
  return singer
}
