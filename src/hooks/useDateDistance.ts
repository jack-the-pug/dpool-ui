import { formatDistanceToNow } from 'date-fns'
import { useEffect, useState } from 'react'

export function useDateDistance(date: Date | undefined) {
  const [distance, setDistance] = useState<string>('')
  const [delay, setDelay] = useState<number>(1000)
  useEffect(() => {
    if (!date) return
    setDistance(formatDistanceToNow(date, { includeSeconds: true }))
  }, [])
  useEffect(() => {
    if (!date) return
    const timer = setInterval(() => {
      setDistance(() => formatDistanceToNow(date, { includeSeconds: true }))
      const ms = Date.now() - date.getTime()
      if (ms > 1000 * 60 * 60) {
        clearInterval(timer)
        return
      }
      if (ms > 1000 * 60) {
        setDelay(1000 * 60)
        return
      }

      if (ms >= 1000 * 10) {
        setDelay(1000 * 10)
        return
      }
    }, delay)
    return () => {
      clearInterval(timer)
    }
  }, [delay])

  return distance
}
