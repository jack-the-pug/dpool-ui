import { useWeb3React } from '@web3-react/core'
import { ReactNode, useMemo } from 'react'
import { chains } from '../constants'

export function TranSactionHash(props: {
  hash: string
  className?: string
  children?: ReactNode
}) {
  const { hash, className, children } = props
  const { chainId } = useWeb3React()
  const scanUrl = useMemo(() => {
    if (!chainId || !chains[chainId]) return
    const scan = chains[chainId].scan
    return `${scan}/tx/${hash}`
  }, [hash, chainId])

  return (
    <a
      href={scanUrl}
      target="blank"
      className={`text-xs  ${className || 'text-green-500'}`}
    >
      {children || hash}
    </a>
  )
}

export function AddressLink(props: {
  address: string
  children: ReactNode
  className?: string
}) {
  const { address, children, className } = props
  const { chainId } = useWeb3React()
  const scanUrl = useMemo(() => {
    if (!chainId || !chains[chainId]) return
    const scan = chains[chainId].scan
    return `${scan}/address/${address}`
  }, [address, chainId])

  return (
    <a
      href={scanUrl}
      target="blank"
      className={`${className || 'text-green-500 '}`}
    >
      {children || address}
    </a>
  )
}
