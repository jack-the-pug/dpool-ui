import { useWeb3React } from '@web3-react/core'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Chain, chains, getAddChainParameters } from '../../constants'
import { Dialog } from '../../components/dialog'
import { Network } from '@web3-react/network'
import { EosIconsBubbleLoading, MaterialSymbolsWarningOutlineRounded } from '../../components/icon'
import { toast } from 'react-toastify'

export default function NetworkAction() {
  const { chainId } = useWeb3React()
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
        className="border border-gray-900 px-2 rounded-md hover:bg-gray-100 dark:bg-slate-700 dark:hover:bg-slate-500 "
      >
        {chainName}
      </button>
      <Dialog visible={isSwitchChain} onClose={() => setIsSwitchChain(false)}>
        <div className="relative">
          <div className='px-2 text-sm text-gray-500 mb-4'>
            Network selection
          </div>
          <div className={`flex flex-col w-60 ${loading ? 'opacity-20' : ''}`}>
            {chainList.map((chain) => (
              <div
                key={chain.chainId}
                onClick={() => switchChain(chain.chainId)}
                className="flex justify-between h-10 items-center transition-all duration-300 ease-in-out  rounded-md cursor-pointer px-2 hover:scale-110  hover:bg-gray-100 dark:hover:bg-slate-500"
              >
                {chain.name}
                {chain.isTestNet ? <span className='text-red-500 flex items-center'><MaterialSymbolsWarningOutlineRounded className='mr-1' />TEST</span> : null}
              </div>
            ))}
          </div>
          {loading && (
            <div className="w-full absolute left-0 top-0 flex justify-center items-center">
              <EosIconsBubbleLoading width="3em" height="3em" />
            </div>
          )}
        </div>
      </Dialog>
    </>
  )
}
