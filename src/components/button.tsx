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
      className={`w-full flex justify-center items-center border  rounded-md whitespace-nowrap   px-2 py-1 
      ${
        disable || loading
          ? 'border-gray-400 text-gray-400 cursor-not-allowed'
          : 'cursor-pointer  border-black text-black hover:text-green-500 hover:border-green-500'
      }
      ${loading && 'cursor-wait'}
      ${className}
      `}
      onClick={disable || loading ? undefined : onClick}
    >
      {loading ? <EosIconsBubbleLoading className="mr-1" /> : null}
      {children}
    </div>
  )
}
