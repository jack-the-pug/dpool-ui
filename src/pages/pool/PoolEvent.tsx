import { TranSactionHash, AddressLink } from '../../components/hash'
import { MdiArrowTopRight } from '../../components/icon'
import { ActionEvent } from './PoolList'
import { DateDistance } from '../../components/dateDistance'

interface PoolEventProps {
  event: ActionEvent | undefined
  label: string
}
export function PoolEvent(props: PoolEventProps) {
  const { event, label } = props
  if (!event) return null
  const { transactionHash, from } = event
  return (
    <div className="flex justify-between text-gray-400 px-2 py-3">
      <div className="flex items-center">
        {label} <DateDistance date={new Date(event.timestamp * 1000)} />.
        <TranSactionHash
          hash={transactionHash}
          className="text-gray-400 flex ml-2 items-center"
        >
          TX <MdiArrowTopRight />
        </TranSactionHash>
      </div>
      <div>
        {'BY '}
        <AddressLink address={from} className="text-gray-400">
          {from}
        </AddressLink>
      </div>
    </div>
  )
}
