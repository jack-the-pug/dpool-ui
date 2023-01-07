import { useCallback, useEffect, useState } from "react"
import useTokenMeta from "../../hooks/useTokenMeta"
import { Pool } from "./PoolDetail"
import { getTokenPrice } from "../../api/price"
import { BigNumber, utils } from "ethers"
import { ResponsiveContainer, BarChart, XAxis, Bar, Tooltip, Cell, PieChart, Pie } from "recharts"

import { PoolState, TokenMeta } from "../../type"

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

interface USDCByAddress {
  address: string,
  usdc: number
}

interface USDCByToken {
  usdc: number,
  token: TokenMeta
}

const RADIAN = Math.PI / 180;
const renderCustomizedLabel = (data: any) => {
  const { cx, cy, midAngle, innerRadius, outerRadius, percent } = data
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central">
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  )
}

const CustomUSDCAddressTooltip = (data: any) => {
  const { active, payload } = data
  if (active && payload && payload.length) {
    return <div className=" bg-black opacity-80 text-white flex py-1 px-2 ">
      <div className="">{`${payload[0].payload.address.slice(0, 6)}...${payload[0].payload.address.slice(38, 42)}:`}</div>
      <div className="font-bold">{`$${payload[0].payload.usdc}`}</div>
    </div>
  }
  return null
}


export function PoolListStats(props: PoolListStatsProps) {
  const { list } = props
  const { getToken } = useTokenMeta();
  const [chartList, setChartList] = useState<Pool[]>([])
  const [totalUSDC, setTotalUSDC] = useState<string>()
  const [currentHoverItem, setCurrentHoverItem] = useState<ChartItemState>()

  const [totalUSDCByAddress, setTotalUSDCByAddress] = useState<USDCByAddress[]>([])
  const [totalUSDCByToken, setTotalUSDCByToken] = useState<USDCByToken[]>([])


  const getChartList = useCallback(async () => {
    const res = []
    const tokenPriceCatch: { [key: string]: BigNumber } = {}
    let totalValue = BigNumber.from(0)

    const totalUSDCByAddress: Map<string, BigNumber> = new Map()
    const totalUSDCByToken: Map<string, { usdc: BigNumber, token: TokenMeta }> = new Map()
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
      // pool usdc total
      const poolUsdcValue = list[i].claimedAmount.mul(tokenPrice)
      totalValue = totalValue.add(poolUsdcValue)
      res.push({ ...list[i], totalUSDC: Number(utils.formatUnits(poolUsdcValue, token.decimals)) })
      // address usdc total
      list[i].claimers.forEach((claimer, index) => {
        const amount = list[i].amounts[index]
        const currentUsdc = totalUSDCByAddress.get(claimer) || BigNumber.from(0)
        totalUSDCByAddress.set(claimer, currentUsdc.add(amount.mul(tokenPrice as BigNumber)))
      })
      // token usdc total
      const currentTokenUsdc = totalUSDCByToken.get(token.address) || { usdc: BigNumber.from(0), token }
      currentTokenUsdc.usdc = currentTokenUsdc.usdc.add(poolUsdcValue)
      totalUSDCByToken.set(token.address, currentTokenUsdc)

    }
    const totalUSDCByAddressList: USDCByAddress[] = []
    totalUSDCByAddress.forEach((usdc, address) => totalUSDCByAddressList.push({ usdc: Number(utils.formatUnits(usdc, 6)), address }))

    const totalUSDCByTokenList: USDCByToken[] = []
    totalUSDCByToken.forEach((item) => totalUSDCByTokenList.push({ usdc: Number(utils.formatUnits(item.usdc, 6)), token: item.token }))
    totalUSDCByTokenList.sort((a, b) => a.usdc > b.usdc ? 1 : -1)

    setTotalUSDC(utils.formatUnits(totalValue, 6))
    setChartList(res.reverse())
    setTotalUSDCByAddress(totalUSDCByAddressList)

    setTotalUSDCByToken(totalUSDCByTokenList)
  }, [getToken, list])
  useEffect(() => {
    getChartList()
  }, [getChartList, list, getToken])

  const onMouseEnter = useCallback((state: ChartItemState) => {
    setCurrentHoverItem(state)
  }, [])
  return <div className="">
    <div className="flex w-full relative gap-5">
      <div className="flex flex-col flex-1 relative  bg-white pt-4  px-4 rounded-xl">
        <div className="flex justify-between">
          <div className="font-bold">Pool Volume</div>
          {currentHoverItem ? <div className="flex">
            <span className="" style={{ maxWidth: 100 }}>{currentHoverItem.name}</span>
            :
            <span className="font-bold">${currentHoverItem.totalUSDC}</span>
          </div> : <div><span>Total:</span> <span className="font-bold">${totalUSDC}</span></div>}
        </div>
        <div className="flex-1" style={{ minHeight: 300, minWidth: 500 }}>
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
      <div className="flex flex-col gap-5">
        <div className="flex flex-1 flex-col relative bg-white pt-4  px-4 rounded-xl">
          <div className="font-bold">
            Volume By Address
          </div>
          <PieChart width={200} height={200}>
            <Pie
              data={totalUSDCByAddress}
              cx="50%"
              cy="50%"
              outerRadius={80}
              paddingAngle={1}
              fill="#8884d8"
              dataKey="usdc"
              labelLine={false}
              label={renderCustomizedLabel}
              onClick={() => { }}
            >
              {totalUSDCByAddress.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={`#${entry.address.slice(6, 12)}`} />
              ))}
            </Pie>
            <Tooltip cursor={false} content={<CustomUSDCAddressTooltip />} wrapperClassName="border-none" contentStyle={{ border: "none" }} />
          </PieChart>
        </div>
        <div className="flex flex-1 flex-col relative bg-white pt-4  px-4 rounded-xl">
          <div className="font-bold">
            Top Tokens
          </div>
          <div className="mt-4">
            {totalUSDCByToken.map((tokenRecord, index) => <div
              key={tokenRecord.token.address}
              className="flex relative px-2 items-center"
            >
              <div className="absolute left-0 top-0 h-full rounded-md opacity-30 z-0" style={{
                width: 200 * tokenRecord.usdc / Number(totalUSDC),
                background: `#${tokenRecord.token.address.slice(4, 10)}`
              }}></div>
              <div className="flex flex-1 justify-between z-20 ">
                <div className="flex">
                  <div>{index + 1}.</div>
                  <div>{tokenRecord.token.symbol}</div>
                  <div className="ml-2 font-semibold">{tokenRecord.usdc} </div>
                </div>
                <span className="text-gray-500">{`${(tokenRecord.usdc / Number(totalUSDC) * 100).toFixed(0)}%`}</span>
              </div>
            </div>)}
          </div>
        </div>
      </div>
    </div>
  </div>
}