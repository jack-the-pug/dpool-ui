import { BigNumber, Contract, ethers, utils } from 'ethers'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { hooks as metaMaskHooks } from '../../../connectors/metaMask'
import { ESC20ABI } from '../../../constants'
import { Dialog } from '../../../components/dialog'
import { EosIconsBubbleLoading, ZondiconsClose } from '../../../components/icon'
import useTokenMeta from '../../../hooks/useTokenMeta'
import { TokenMeta as TTokenMeta } from '../../../type'
import { chains } from '../../../constants'
import useSignerOrProvider from '../../../hooks/useSignOrProvider'
import { useBalance } from '../../../hooks/useBalance'
import { toast } from 'react-toastify'
import { isAddress } from 'ethers/lib/utils'
interface TTokenSelectProps {
  tokenMeta: TTokenMeta | undefined
  setTokenMeta: (tokenMeta: TTokenMeta) => void
  dialogDefaultOpen?: boolean
}
const { useProvider, useChainId, useAccount } = metaMaskHooks
export default function TokenSelect(props: TTokenSelectProps) {
  const { tokenMeta, setTokenMeta, dialogDefaultOpen = false } = props
  const { tokenList: sourceTokenList, getToken, setToken } = useTokenMeta()
  const provider = useProvider()
  const chainId = useChainId()
  const account = useAccount()
  const nativeTokenBalance = useBalance(provider, account)
  const [loading, setLoading] = useState<boolean>(false)
  const [dialogVisible, setDialogVisible] = useState<boolean>(dialogDefaultOpen)
  const [tokenAddress, setTokenAddress] = useState<string>()

  const nativeTokenMeta = useMemo(() => {
    if (!chainId || !chains[chainId]) return null
    const nativeToken: TTokenMeta = {
      address: '0x0000000000000000000000000000000000000000',
      decimals: chains[chainId].decimals,
      symbol: chains[chainId].symbol,
      balance: nativeTokenBalance || BigNumber.from(0),
      chainId,
    }

    return nativeToken
  }, [nativeTokenBalance, chainId, tokenMeta])

  useEffect(() => {
    if (!tokenMeta && nativeTokenMeta) {
      setTokenMeta(nativeTokenMeta)
      return
    }
    // set native token when chain change
    if (tokenMeta && tokenMeta.chainId !== chainId && nativeTokenMeta) {
      setTokenMeta(nativeTokenMeta)
    }
  }, [tokenMeta, nativeTokenMeta])

  const tokenList = useMemo(() => {
    const list = nativeTokenMeta
      ? [nativeTokenMeta, ...sourceTokenList]
      : sourceTokenList
    return list.filter((token) => token.chainId === chainId)
  }, [sourceTokenList, nativeTokenMeta, chainId])

  const getTokenMeta = useCallback(
    async (tokenAddress: string) => {
      if (!provider?.provider || !tokenAddress || !chainId) return
      if (!utils.isAddress(tokenAddress)) return
      setLoading(true)
      // native token
      if (BigNumber.from(tokenAddress).eq(0) && nativeTokenMeta) {
        setLoading(false)
        return nativeTokenMeta
      }
      //  erc20 token
      const tokenMeta: TTokenMeta = (await getToken(tokenAddress))!
      setLoading(false)

      return tokenMeta
    },
    [chainId, account, nativeTokenMeta, getToken]
  )
  useEffect(() => {
    if (!tokenAddress || !isAddress(tokenAddress)) return
    getTokenMeta(tokenAddress).then((token) => {
      if (token && !BigNumber.from(token.address).eq(0)) {
        setToken(token)
      }
    })
  }, [tokenAddress, account, chainId])
  return (
    <div className="justify-right flex">
      <span
        onClick={() => setDialogVisible(true)}
        className="cursor-pointer bg-white ring-1 ring-gray-400  shadow-inner ring-offset-white px-2"
      >
        {tokenMeta ? tokenMeta.symbol : 'Select Token'}
      </span>
      <Dialog visible={dialogVisible} onClose={() => setDialogVisible(false)}>
        <div className="flex flex-col" style={{ minWidth: '380px' }}>
          <h1 className="flex justify-between items-center ">
            <span></span>
            <div> Token Selector</div>
            <ZondiconsClose
              onClick={() => setDialogVisible(false)}
              className="cursor-pointer"
            />
          </h1>
          {loading ? (
            <div className="flex justify-center items-center my-5">
              <EosIconsBubbleLoading width="5em" height="5em" />
            </div>
          ) : (
            <>
              <input
                onChange={(e) => setTokenAddress(e.target.value)}
                className="my-5 outline-none focus:outline-none border-b border-gray-300 border-solid"
                autoFocus
                placeholder="Address"
                style={{ width: '380px' }}
              />
              <div>
                {tokenList.map((token) => (
                  <div
                    key={token.address}
                    onClick={async () => {
                      setTokenAddress(token.address)
                      const tokenMeta = await getTokenMeta(token.address)
                      if (tokenMeta) {
                        setTokenMeta(tokenMeta)
                        setDialogVisible(false)
                      }
                    }}
                    className="transition-all duration-300 flex flex-col ease-in-out rounded-md cursor-pointer p-2 hover:mx-2 hover:scale-110  hover:bg-gray-100"
                  >
                    <div> {token.symbol}</div>
                    {BigNumber.from(token.address).eq(0) ? null : (
                      <span className="text-gray-500 italic  text-xs">
                        {token.address}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </Dialog>
    </div>
  )
}
