import { BigNumber, constants, utils } from "ethers";
import { ChainId, TokenMeta } from "../type";

export const API_0X_PRICE_BASE: { [key: number]: string } = {
  [ChainId.Polygon]: "https://polygon.api.0x.org",
  [ChainId.Goerli]: "https://goerli.api.0x.org"
}
export async function getTokenPrice(token: TokenMeta) {
  const baseUrl = API_0X_PRICE_BASE[token.chainId]
  if (!baseUrl) return
  if (token.symbol === 'USDC') return BigNumber.from(1)
  const url = new URL(`${baseUrl}/swap/v1/price`)
  url.searchParams.set("sellToken", token.address == constants.AddressZero ? "ETH" : token.address)
  url.searchParams.set("buyToken", "USDC")
  url.searchParams.set("sellAmount", utils.parseUnits("1", token.decimals).toString())
  try {
    const res = await (await fetch(url)).json()
    return BigNumber.from(res.price)
  } catch { }
}