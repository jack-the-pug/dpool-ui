import { useMemo } from 'react'
import { PoolState } from '../../type'

const stateMsg = {
  [PoolState.Initialized]: 'Initialized',
  [PoolState.Funded]: 'Funded',
  [PoolState.None]: 'None',
  [PoolState.Closed]: 'Closed',
}
const stateColorMap = {
  [PoolState.Initialized]: '#6B7280',
  [PoolState.Funded]: '#34D399',
  [PoolState.None]: '#DC2626',
  [PoolState.Closed]: '#6B7280',
}

export function DistributeState({
  state,
  title,
}: {
  state: PoolState
  title: string
}) {
  const colorClass = useMemo(() => stateColorMap[state], [state])
  return (
    <div className="flex">
      <div className="ml-2 text-gray-500 text-xs flex items-center">
        {stateMsg[state]}
      </div>
      {state === PoolState.Funded && <div className="relative">
        <div
          className={`w-2 h-2 rounded-full cursor-pointer`}
          title={title}
          style={{ background: colorClass }}
        ></div>
        <div
          className="w-2 h-2 absolute left-0 top-0 rounded-full cursor-pointer animate-ping "
          style={{ background: colorClass }}
        ></div>
      </div>}
    </div>
  )
}
