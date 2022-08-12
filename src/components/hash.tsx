import { useMemo } from 'react'
import { hooks as metaMaskHooks } from '../connectors/metaMask'
import { chains } from '../constants'
const { useChainId } = metaMaskHooks

export function TranSactionHash(props: { hash: string }) {
  const { hash } = props

  const chainId = useChainId()
  const scanUrl = useMemo(() => {
    if (!chainId) return
    const scan = chains[chainId].scan
    return `${scan}/tx/${hash}`
  }, [hash, chainId])

  return (
    <a href={scanUrl} target="blank" className="text-xs text-green-500">
      {/* {hash} */}
      View on Explorer
    </a>
  )
}

export function AddressLink(props: { address: string; name?: string }) {
  const { address, name } = props
  const chainId = useChainId()
  const scanUrl = useMemo(() => {
    if (!chainId) return
    const scan = chains[chainId].scan
    return `${scan}/address/${address}`
  }, [address, chainId])

  return (
    <a href={scanUrl} target="blank" className="text-green-500">
      {name || address}
    </a>
  )
}
