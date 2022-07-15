import { useCallback, useEffect, useState } from 'react'
import { hooks as metaMaskHooks, metaMask } from '../../connectors/metaMask'

const { useAccount, useIsActive } = metaMaskHooks

export default function Connector() {
  const account = useAccount()
  const isActive = useIsActive()

  const [isConnect, setIsConnect] = useState<boolean>(false)
  const [isAddressHover, setIsAddressHover] = useState<boolean>(false)

  const connect = useCallback(() => {
    metaMask
      .activate()
      .then(() => {
        setIsConnect(true)
      })
      .catch(() => setIsConnect(false))
  }, [metaMask])

  useEffect(() => {
    if (isActive) {
      connect()
    }
  }, [isActive])
  useEffect(() => {
    void metaMask.connectEagerly().catch(() => {
      console.debug('Failed to connect to metamask')
    })
  }, [])

  if (!isConnect) {
    return (
      <button
        onClick={() => connect()}
        className="w-28 border border-gray-900 justify-center rounded-md hover:bg-gray-100"
        style={{ height: '30px' }}
      >
        Connect
      </button>
    )
  }

  return (
    <div
      className="border w-36 justify-center border-gray-900 px-2 rounded-md hover:bg-gray-100 flex items-center "
      style={{ height: '30px' }}
      onMouseEnter={() => setIsAddressHover(true)}
      onMouseLeave={() => setIsAddressHover(false)}
    >
      {isAddressHover ? (
        <button onClick={() => setIsConnect(false)}>Disconnect</button>
      ) : (
        <div>
          {account
            ? `${account?.slice(0, 6)}...${account?.slice(38).toUpperCase()}`
            : 'Connect Wallet'}
        </div>
      )}
    </div>
  )
}
