import { useWeb3React } from '@web3-react/core'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { hooks as metaMaskHooks } from '../../connectors/metaMask'
import { Chain, chains, getAddChainParameters } from '../../constants'
import { Dialog } from '../../components/dialog'
import { Network } from '@web3-react/network'
import { EosIconsBubbleLoading } from '../../components/icon'
import { toast } from 'react-toastify'
const { useChainId } = metaMaskHooks
export default function NetworkAction() {
  const chainId = useChainId()
  const [isSwitchChain, setIsSwitchChain] = useState(false)
  const [loading, setLoading] = useState<boolean>(false)
  const chainName = useMemo(() => {
    if (!chainId) return '...'
    const chainMeta = chains[chainId]
    if (!chainMeta) return 'Switch Chain'
    return chainMeta.name
  }, [chainId])
  const { connector } = useWeb3React()

  const switchChain = useCallback(
    async (desiredChainId: number) => {
      if (desiredChainId === chainId) return
      if (desiredChainId === -1 && chainId !== undefined) return
      setLoading(true)
      try {
        if (connector instanceof Network) {
          await connector.activate(
            desiredChainId === -1 ? undefined : desiredChainId
          )
        } else {
          await connector.activate(
            desiredChainId === -1
              ? undefined
              : getAddChainParameters(desiredChainId)
          )
        }
        setLoading(false)
        setIsSwitchChain(false)
      } catch {
        setLoading(false)
      }
    },
    [connector, chainId]
  )

  const chainList: Chain[] = Array.from(
    Object.keys(chains),
    (key) => chains[Number(key)]
  ).filter((chain) => chain.chainId !== chainId)

  useEffect(() => {
    if (!chainId) return
    if (chains[chainId]) return
    toast.warning(<div>Unsupported chain</div>)
  }, [chainId])
  return (
    <>
      <button
        onClick={() => setIsSwitchChain(true)}
        className="border border-gray-900 px-2 rounded-md hover:bg-gray-100"
      >
        {chainName}
      </button>
      <Dialog visible={isSwitchChain} onClose={() => setIsSwitchChain(false)}>
        <div className=" relative">
          <div className={`flex flex-col w-60 ${loading ? 'opacity-20' : ''}`}>
            {chainList.map((chain) => (
              <div
                key={chain.chainId}
                onClick={() => switchChain(chain.chainId)}
                className="flex h-10 items-center transition-all duration-300 ease-in-out  rounded-md cursor-pointer px-2 hover:scale-110  hover:bg-gray-100"
              >
                {chain.name}
              </div>
            ))}
          </div>
          {loading && (
            <div className="w-full absolute left-0 top-0 flex justify-center items-center">
              <EosIconsBubbleLoading width="5em" height="5em" />
            </div>
          )}
        </div>
      </Dialog>
    </>
  )
}
