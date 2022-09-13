import { utils } from 'ethers'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import useTokenMeta from '../../hooks/useTokenMeta'
import { TokenMeta } from '../../type'
import { DistributeState } from './DistributeState'
import { Pool } from './PoolDetail'

interface PoolProps {
  pool: Pool
}
export function PoolSummary(props: PoolProps) {
  const { pool } = props
  const { getToken } = useTokenMeta()
  const [tokenMeta, setTokenMeta] = useState<TokenMeta>()
  useEffect(() => {
    getToken(pool.token).then(setTokenMeta)
  }, [getToken, pool])
  const claimedAmountData = useMemo(() => {
    return {
      claimedAmount: pool.claimedAmount,
      percentage: pool.claimedAmount.mul(1000).div(pool.totalAmount),
    }
  }, [pool])
  return (
    <tr key={`${pool.poolId}`} className="hover:bg-gray-200">
      <td className="py-2">{pool.name}</td>
      <td>
        <DistributeState state={pool.state} title={pool.name}></DistributeState>
      </td>
      <td>
        {utils.formatUnits(pool.totalAmount, tokenMeta?.decimals)}
        <span className="text-gray-500 ml-2 text-xs">{tokenMeta?.symbol}</span>
      </td>
      <td className="">
        {utils.formatUnits(
          claimedAmountData.claimedAmount,
          tokenMeta?.decimals
        )}
        <span className="ml-2 text-gray-500 text-xs">
          {claimedAmountData.percentage.toNumber() / 10}%
        </span>
      </td>
      <td>
        <Link to={`${pool.poolId}`} className="text-green-500 text-xs">
          Detail
        </Link>
      </td>
    </tr>
  )
}
