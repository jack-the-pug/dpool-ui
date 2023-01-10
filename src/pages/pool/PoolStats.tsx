import { Pool } from "./PoolDetail";
import { PoolState, TokenMeta } from "../../type";
import { BigNumber, utils } from "ethers";
import { useCallback } from "react";
interface PoolStatsProps {
  poolMeta: Pool
  tokenMeta: TokenMeta
}


export function PoolStats(props: PoolStatsProps) {
  const { poolMeta, tokenMeta } = props
  const { totalAmount, claimedAmount, state } = poolMeta
  const format = useCallback((n: BigNumber) => Number(utils.formatUnits(n, tokenMeta.decimals)).toFixed(2), [tokenMeta])
  return <div className="w-full flex justify-around mx-4 my-8">
    <div className="bg-gray-100 py-4 px-8 rounded-lg">
      <p className="text-gray-500">Total</p>
      <div className=" font-bold text-2xl">{format(totalAmount)}</div>
    </div>
    <div className="bg-gray-100 py-4 px-8 rounded-lg">
      <p className="text-gray-500">Founded</p>
      <div className=" font-bold text-2xl">{state === PoolState.Initialized ? "0.00" : format(totalAmount)}</div>
    </div>
    <div className="bg-gray-100 py-4 px-8 rounded-lg">
      <p className="text-gray-500">Claimed</p>
      <div className=" font-bold text-2xl">{format(claimedAmount)} <span className="text-lg">{`(${Number(format(claimedAmount.div(totalAmount))) / 100}%)`}</span></div>
    </div>
    <div className="bg-gray-100 py-4 px-8 rounded-lg">
      <p className="text-gray-500">Remaining</p>
      <div className="font-bold text-2xl">{state === PoolState.Initialized ? "0.00" : format(totalAmount.sub(claimedAmount))}</div>
    </div>
  </div>
}