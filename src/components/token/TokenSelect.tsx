import { BigNumber, constants, utils } from 'ethers'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Dialog } from '../dialog'
import { EosIconsBubbleLoading, ZondiconsClose } from '../icon'
import useTokenMeta from '../../hooks/useTokenMeta'
import { TokenMeta as TTokenMeta } from '../../type'
import { chains } from '../../constants'

import { isAddress } from 'ethers/lib/utils'
import { useWeb3React } from '@web3-react/core'
interface TTokenSelectProps {
  tokenMeta: TTokenMeta | undefined
  setTokenMeta: (tokenMeta: TTokenMeta) => void
  dialogDefaultOpen?: boolean
}

export default function TokenSelect(props: TTokenSelectProps) {
  const { tokenMeta, setTokenMeta, dialogDefaultOpen = false } = props
  const { tokenList: sourceTokenList, getToken, setToken } = useTokenMeta()
  const { chainId } = useWeb3React()
  const [loading, setLoading] = useState<boolean>(false)
  const [dialogVisible, setDialogVisible] = useState<boolean>(dialogDefaultOpen)
  const [tokenAddress, setTokenAddress] = useState<string>()

  const nativeTokenMeta = useMemo(() => {
    if (!chainId || !chains[chainId]) return null
    const nativeToken: TTokenMeta = {
      address: constants.AddressZero,
      decimals: chains[chainId].decimals,
      symbol: chains[chainId].symbol,
      chainId,
    }
    return nativeToken
  }, [chainId, tokenMeta])

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
    const _sourceTokenList = sourceTokenList.filter(
      (token) => token.chainId === chainId && token.userAdd
    )
    const list = nativeTokenMeta
      ? [nativeTokenMeta, ..._sourceTokenList]
      : _sourceTokenList
    return list
  }, [sourceTokenList, nativeTokenMeta, chainId])

  const getTokenMeta = useCallback(
    async (tokenAddress: string) => {
      if (!tokenAddress || !chainId) return
      if (!utils.isAddress(tokenAddress)) return
      setLoading(true)
      const tokenMeta: TTokenMeta | undefined = await getToken(tokenAddress)
      setLoading(false)
      return tokenMeta
    },
    [chainId, nativeTokenMeta, getToken]
  )
  useEffect(() => {
    if (!tokenAddress || !isAddress(tokenAddress)) return
    getTokenMeta(tokenAddress).then((token) => {
      if (token && !BigNumber.from(token.address).eq(0)) {
        setToken(token)
      }
    })
  }, [tokenAddress, chainId])
  return (
    <>
      <div
        onClick={() => setDialogVisible(true)}
        className="cursor-pointer h-full px-2"
      >
        {tokenMeta ? tokenMeta.symbol : '...'}
      </div>
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
                className="my-5 outline-none focus:outline-none border-b border-gray-300 border-solid dark:bg-slate-800"
                autoFocus
                placeholder="Token Address"
                style={{ width: '380px' }}
              />
              <div className="divide-solid ">
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
                    className="transition-all duration-300 flex flex-col ease-in-out rounded-md cursor-pointer p-2 hover:mx-2 hover:scale-110  hover:bg-gray-100 dark:hover:bg-slate-600"
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
    </>
  )
}
