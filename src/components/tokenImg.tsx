import { useWeb3React } from "@web3-react/core"
import { BigNumber } from "ethers"
import { useCallback, useMemo, useState } from "react"
import { chains } from "../constants"
import { MaterialSymbolsWarningOutlineRounded } from "./icon"

interface TokenImgProps {
  token: string
}
export function TokenImg(props: TokenImgProps) {
  const { token } = props
  const { chainId } = useWeb3React()
  const [isLoadImgError, setIsLoadImgError] = useState(false)
  const tokenImgUrl = useMemo(() => {
    if (!chainId) return
    if (BigNumber.from(token).eq(0)) return `https://raw.githubusercontent.com/Uniswap/assets/master/blockchains/${chains[chainId].name.toLowerCase()}/assets/0x0000000000000000000000000000000000001010/logo.png`
    return `https://raw.githubusercontent.com/Uniswap/assets/master/blockchains/${chains[chainId].name.toLowerCase()}/assets/${token}/logo.png`
  }, [chainId, token])
  if (!chainId || isLoadImgError) return <MaterialSymbolsWarningOutlineRounded className="mr-2" />
  return <img src={tokenImgUrl} className="w-5 h-5  mr-2" onError={() => setIsLoadImgError(true)} onLoad={() => setIsLoadImgError(false)}></img>
}