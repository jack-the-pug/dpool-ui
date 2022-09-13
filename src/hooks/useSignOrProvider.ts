import { useWeb3React } from '@web3-react/core'
import { useMemo } from 'react'

export default function useSignerOrProvider() {
  const { provider, chainId } = useWeb3React()
  const signerOrProvider = useMemo(() => {
    if (!provider || !chainId) return null
    const signer = (provider as any).getSigner()
    if (provider && signer) {
      return signer
    }
    return provider
  }, [provider, chainId])

  return signerOrProvider
}
