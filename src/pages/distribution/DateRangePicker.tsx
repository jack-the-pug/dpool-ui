import { useEffect, useState } from 'react'
import { format, formatDistanceToNow } from 'date-fns'
interface TDateRangePickerProps {
  setDate: Function
}
const addZero = (num: number) => (num > 9 ? num : `0${num}`)
const getDateObj = (date: Date) => {
  const y = date.getFullYear()
  let m = addZero(date.getMonth() + 1)
  let d = addZero(date.getDate())
  let h = addZero(date.getHours())
  let mi = addZero(date.getMinutes())
  return { y, m, d, h, mi }
}
export default function DateRangePicker(props: TDateRangePickerProps) {
  const { setDate } = props
  const { y, m, d, h, mi } = getDateObj(new Date(Date.now() + 1000 * 60 * 10))
  const [startDate, setStartDate] = useState<string>(
    `${y}-${m}-${d}T${h}:${mi}`
  )

  const {
    y: _y,
    m: _m,
    d: _d,
    h: _h,
    mi: _mi,
  } = getDateObj(new Date(Date.now() + 1000 * 60 * 60 * 24 * 3))
  const [endDate, setEndDate] = useState<string>(
    `${_y}-${_m}-${_d}T${_h}:${_mi}`
  )

  useEffect(() => {
    const start = Math.round(new Date(startDate).getTime() / 1000)
    const end = Math.round(new Date(endDate).getTime() / 1000)
    const dateRange = [start, end]
    setDate(dateRange)
  }, [startDate, endDate])

  return (
    <div className="w-full flex flex-col">
      <div className="w-full flex justify-between">
        <input
          min={startDate}
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          type="datetime-local"
          className=" focus:outline focus:outline-black"
        />
        <input
          type="datetime-local"
          min={startDate}
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="focus:outline focus:outline-black"
        />
      </div>
      <div className="w-full flex justify-between text-gray-500">
        <div>start in {formatDistanceToNow(new Date(startDate))}</div>
        <div>end in {formatDistanceToNow(new Date(endDate))}</div>
      </div>
    </div>
  )
}

interface DateRangeProps {
  start: number
  end: number
}
const parseDate = (second: number) => {
  try {
    return format(new Date(second * 1000), 'Pp')
  } catch {
    return
  }
}
export function DateRange(props: DateRangeProps) {
  const { start, end } = props
  const startDate = parseDate(start)
  const endDate = parseDate(end)
  if (!startDate || !endDate) return null
  return (
    <>
      <div className="flex h-6 w-full justify-between items-center">
        <div>Start Date</div>
        <div className="flex-1 border-b border-gray-500 border-dotted mx-2"></div>
        <div>{startDate}</div>
      </div>
      <div className="flex h-6 w-full justify-between items-center">
        <div>End Date</div>
        <div className="flex-1  border-b border-gray-500 border-dotted mx-2"></div>
        <div>{endDate}</div>
      </div>
    </>
  )
}
