import { utils } from "ethers"
import { useMemo, useState } from "react"
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis } from "recharts"
import useAddressBook from "../../hooks/useAddressBook"
import { TokenMeta } from "../../type"
import { Pool } from "./PoolDetail"

interface PoolBarChartProps {
  poolMeta: Pool
  tokenMeta: TokenMeta
}

interface BarCell {
  address: string,
  name: string,
  value: number
}

interface ChartItemState {
  height: number
  background: {
    height: number
    width: number
    y: number,
    x: number
  }
  address: string
  value: number
}

export function PoolBarChart(props: PoolBarChartProps) {
  const { poolMeta, tokenMeta } = props
  const [currentHoverItem, setCurrentHoverItem] = useState<ChartItemState>()
  const { addressName } = useAddressBook()
  const list = useMemo(() => {
    const res: BarCell[] = []
    poolMeta.claimers.forEach((claimer, index) => {
      const name = addressName(claimer) || claimer.slice(0, 6)
      res.push({ address: claimer, value: Number(utils.formatUnits(poolMeta.amounts[index], tokenMeta.decimals)), name })
    })
    return res
  }, [poolMeta, addressName])
  return <div className="bg-white pt-4  px-4 rounded-xl">
    <div className="flex justify-end">
      {currentHoverItem ? <div className="flex">
        <span className="truncate" style={{ maxWidth: 100 }}>{currentHoverItem.address.slice(0, 6)}</span>
        :
        <span className="font-bold">{currentHoverItem.value}</span>
      </div> : <div><span>Total:</span> <span className="font-bold">{utils.formatUnits(poolMeta.totalAmount, tokenMeta.decimals)}</span></div>}
      <span className="ml-1">{tokenMeta.symbol}</span>
    </div>
    <div className="w-full flex ">
      <div className="flex-1 relative" style={{ minHeight: 300, minWidth: 500 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={list}
            layout="horizontal"
            maxBarSize={30}
            height={400}
            margin={{
              top: 20,
              right: 5,
              left: 5,
              bottom: 0,
            }}
          >
            <XAxis dataKey="name" axisLine={false} minTickGap={10} />
            <Bar dataKey="value" type="number" unit=" USDC" onMouseEnter={(item) => {
              setCurrentHoverItem(item)
            }} onMouseOut={() => setCurrentHoverItem(undefined)} >
              {list.map((pool, index) => <Cell
                key={`pool${index}`}
                strokeLinecap="round"
                fill={currentHoverItem?.address == pool.address ? "#a855f7" : "#4ade80"}
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