import { useCallback, useEffect, useState } from "react"
import useTokenMeta from "../../hooks/useTokenMeta"
import { Pool } from "./PoolDetail"
import { getTokenPrice } from "../../api/price"
import { BigNumber, utils } from "ethers"
import { ResponsiveContainer, BarChart, XAxis, YAxis, Bar, Tooltip, Cell } from "recharts"
import { format } from "date-fns"
import { PoolState } from "../../type"
interface PoolListStatsProps {
  list: Pool[]
}

interface ChartItemState {
  height: number
  background: {
    height: number
    width: number
    y: number,
    x: number
  }
  totalUSDC: number
  startTime: number
  name: string
  poolId: string
}


export function PoolListStats(props: PoolListStatsProps) {
  const { list } = props
  const { getToken } = useTokenMeta();
  const [chartList, setChartList] = useState<Pool[]>([])
  const [totalUSDC, setTotalUSDC] = useState<string>()
  const [currentHoverItem, setCurrentHoverItem] = useState<ChartItemState>()

  const getChartList = useCallback(async () => {
    const res = []
    const tokenPriceCatch: { [key: string]: BigNumber } = {}
    let totalValue = BigNumber.from(0)
    for (let i = 0; i < list.length; i++) {
      if (list[i].state === PoolState.Initialized || list[i].state === PoolState.None) continue
      if (list[i].claimedAmount.eq(BigNumber.from(0))) continue
      const token = await getToken(list[i].token)
      if (!token) continue
      let tokenPrice: undefined | BigNumber = tokenPriceCatch[token.address]
      if (!tokenPrice) {
        tokenPrice = await getTokenPrice(token)
        if (!tokenPrice) continue
        tokenPriceCatch[token.address] = tokenPrice
      }
      const usdcValue = list[i].totalAmount.mul(tokenPrice)
      totalValue = totalValue.add(usdcValue)
      res.push({ ...list[i], totalUSDC: Number(utils.formatUnits(usdcValue, token.decimals)) })
    }
    setTotalUSDC(utils.formatUnits(totalValue, 6))
    setChartList(res.reverse())
  }, [getToken, list])
  useEffect(() => {
    getChartList()
  }, [getChartList, list, getToken])

  const onMouseEnter = useCallback((state: ChartItemState) => {
    setCurrentHoverItem(state)
  }, [])
  return <div className="flex w-full relative gap-10" >
    <div className="flex flex-col flex-1 relative  bg-white pt-4  px-4 rounded-xl">
      <div className="flex justify-between">
        <div></div>
        {currentHoverItem ? <div className="flex">
          <span className="" style={{ maxWidth: 100 }}>{currentHoverItem.name}</span>
          :
          <span className="font-bold">${currentHoverItem.totalUSDC}</span>
        </div> : <div><span>Total:</span> <span className="font-bold">${totalUSDC}</span></div>}
      </div>
      <div className="flex-1" style={{ minHeight: 300 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartList}
            layout="horizontal"
            barSize={8}
            margin={{
              top: 20,
              right: 5,
              left: 5,
              bottom: 0,
            }}
          >
            <XAxis dataKey="name" axisLine={false} minTickGap={10} />

            <Bar dataKey="totalUSDC" type="number" unit=" USDC" onMouseEnter={onMouseEnter} onMouseOut={() => setCurrentHoverItem(undefined)} >
              {chartList.map((pool, index) => <Cell
                key={`pool${index}`}
                strokeLinecap="round"
                fill={currentHoverItem?.poolId == pool.poolId ? "#a855f7" : "#4ade80"}
              />)}
            </Bar>

            {currentHoverItem && <Tooltip content={() => null}
              isAnimationActive
              animationEasing="ease-in-out"
              cursor={false}
            />}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>


  </div>

}