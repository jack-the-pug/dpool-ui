import { useMemo } from 'react'
import { PoolState } from '../../type'
import { Pool } from './PoolDetail'
import { ActionEvent } from './PoolList'

const stateColorMap = {
  [PoolState.Initialized]: '#6B7280',
  [PoolState.Funded]: '#34D399',
  [PoolState.None]: '#DC2626',
  [PoolState.Closed]: '#6B7280',
}

export function DistributeState({
  poolMeta,
  distributeEvent,
}: {
  poolMeta: Pool
  distributeEvent?: ActionEvent
}) {
  const { state, deadline, claimedAmount, totalAmount } = poolMeta
  const colorClass = useMemo(() => stateColorMap[state], [state])

  if (
    distributeEvent ||
    (deadline === 2 ** 48 - 1 && claimedAmount.eq(totalAmount))
  ) {
    return <div className="flex ml-2 text-gray-500 text-xs">Distributed</div>
  }
  if (state === PoolState.Closed && claimedAmount.eq(totalAmount)) {
    return <div className="flex ml-2 text-gray-500 text-xs">Claimed</div>
  }
  if (state === PoolState.Initialized) {
    return <div className="flex ml-2 text-gray-500 text-xs">Initialized</div>
  }
  if (state === PoolState.Closed) {
    return <div className="flex ml-2 text-red-500 text-xs">Closed</div>
  }
  return (
    <div className="flex">
      <div className="ml-2 text-green-500 text-xs flex items-center">
        Funded
      </div>
      <div className="relative">
        <div
          className={`w-2 h-2 rounded-full cursor-pointer`}
          style={{ background: colorClass }}
        ></div>
        <div
          className="w-2 h-2 absolute left-0 top-0 rounded-full cursor-pointer animate-ping "
          style={{ background: colorClass }}
        ></div>
      </div>
    </div>
  )
}
