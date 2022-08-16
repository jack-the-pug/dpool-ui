import { format } from 'date-fns'
import { useState } from 'react'
import { Popover, ArrowContainer } from 'react-tiny-popover'
import { useDateDistance } from '../hooks/useDateDistance'

export function DateDistance(props: { date: Date }) {
  const { date } = props
  const distance = useDateDistance(date)
  const [showFullDate, setShowFullDate] = useState<boolean>(false)
  return (
    <Popover
      isOpen={showFullDate}
      positions={['top']}
      reposition={false}
      containerClassName="z-50"
      content={({ position, childRect, popoverRect }) => (
        <ArrowContainer
          position={position}
          childRect={childRect}
          popoverRect={popoverRect}
          arrowColor={'black'}
          arrowSize={5}
          arrowStyle={{ opacity: 0.7 }}
          className="popover-arrow-container"
          arrowClassName="popover-arrow"
        >
          <div className="bg-black text-gray-200 opacity-70 px-2 py-1 text-xs rounded-sm">
            {format(date, 'Pp')}
          </div>
        </ArrowContainer>
      )}
    >
      <div
        onMouseEnter={() => setShowFullDate(true)}
        onMouseLeave={() => setShowFullDate(false)}
        className="cursor-pointer"
      >
        <span className="mx-1">{distance}</span>
        ago
      </div>
    </Popover>
  )
}
