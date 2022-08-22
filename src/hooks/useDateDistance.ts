import { formatDistanceToNow } from 'date-fns'
import { useEffect, useState } from 'react'

export function useDateDistance(date: Date | undefined) {
  const [distance, setDistance] = useState<string>('')
  useEffect(() => {
    if (!date) return
    setDistance(
      formatDistanceToNow(date, { includeSeconds: true, addSuffix: true })
    )
    const timer = setInterval(() => {
      setDistance(() =>
        formatDistanceToNow(date, { includeSeconds: true, addSuffix: true })
      )
      const ms = Date.now() - date.getTime()
      if (ms > 1000 * 60 * 60) {
        clearInterval(timer)
        return
      }
    }, 1000 * 60)
    return () => {
      clearInterval(timer)
    }
  }, [])

  return distance
}
