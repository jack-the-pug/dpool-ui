import { MouseEventHandler, ReactNode } from 'react'
import { EosIconsBubbleLoading } from './icon'

interface ButtonProps {
  children: ReactNode
  loading?: boolean
  disable?: boolean
  onClick?: MouseEventHandler
  className?: string
}
export function Button(props: ButtonProps) {
  const {
    children,
    onClick,
    className = '',
    loading = false,
    disable = false,
  } = props
  return (
    <div
      className={`w-full flex justify-center items-center border  rounded-md whitespace-nowrap  p-2 dark:border-gray-500 dark:text-gray-200  border-black text-black
      ${disable || loading
          ? 'cursor-not-allowed'
          : 'cursor-pointer hover:text-green-500 hover:border-green-500'
        }
      ${loading && 'cursor-wait'}
      ${className}
       dark:bg-slate-700
      `}
      onClick={disable || loading ? undefined : onClick}
    >
      {loading ? <EosIconsBubbleLoading className="mr-1 text-black" /> : null}
      {children}
    </div>
  )
}
