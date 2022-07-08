import { useMemo } from 'react'
import { hooks as metaMaskHooks } from '../connectors/metaMask'
const { useChainId, useProvider } = metaMaskHooks
export default function useSignerOrProvider() {
  const provider = useProvider()
  const chainId = useChainId()
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
