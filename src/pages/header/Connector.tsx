import { useWeb3React } from '@web3-react/core'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import { hooks as metaMaskHooks, metaMask } from '../../connectors/metaMask'

const { useIsActive } = metaMaskHooks

export default function Connector() {
  const { account } = useWeb3React()
  const isActive = useIsActive()

  const [isConnect, setIsConnect] = useState<boolean>(false)
  const [isAddressHover, setIsAddressHover] = useState<boolean>(false)

  const connect = useCallback(() => {
    if (!metaMask.provider) {
      toast.error('Please install metamask')
      return
    }
    metaMask
      .activate()
      .then(() => {
        setIsConnect(true)
      })
      .catch(() => setIsConnect(false))
  }, [metaMask])

  useEffect(() => {
    if (isActive && !account) {
      connect()
      return
    }
    if (!isActive && account) {
      setIsConnect(false)
      return
    }
    if (isActive && account) {
      setIsConnect(true)
    }
  }, [isActive, account])
  useEffect(() => {
    void metaMask.connectEagerly()
  }, [])

  if (!isConnect || !account) {
    return (
      <button
        onClick={() => connect()}
        className="w-28 border border-gray-900 justify-center rounded-md hover:bg-gray-100 dark:bg-slate-700 dark:hover:bg-slate-500 "
        style={{ height: '30px' }}
      >
        Connect
      </button>
    )
  }

  return (
    <div
      className="border w-36 justify-center cursor-pointer border-gray-900 px-2 rounded-md hover:bg-gray-100 flex items-center dark:bg-slate-700 dark:hover:bg-slate-500 "
      style={{ height: '30px' }}
      onMouseEnter={() => setIsAddressHover(true)}
      onMouseLeave={() => setIsAddressHover(false)}
    >

      {`${account?.slice(0, 6)}...${account?.slice(38).toUpperCase()}`}
    </div>
  )
}
