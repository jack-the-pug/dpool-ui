import { useCallback } from 'react'
import { chains } from '../constants'
import { EosIconsBubbleLoading, MaterialSymbolsArrowForward } from './icon'
import { hooks as metaMaskHooks } from '../connectors/metaMask'
import { TranSactionHash } from './hash'
export enum ActionState {
  WAIT,
  ING,
  SUCCESS,
  FAILED,
}

const { useAccount, useChainId } = metaMaskHooks
export default function Action(props: {
  state: ActionState
  stateMsgMap: { [key in ActionState]: string | React.ReactElement }
  onClick: () => void
  onSuccess?: React.MouseEventHandler<HTMLElement>
  onFailed?: Function
  tx?: string
  waitClass?: string
  ingClass?: string
  successClass?: string
}) {
  const {
    state,
    stateMsgMap,
    tx,
    onClick,
    onSuccess,
    waitClass,
    ingClass,
    successClass,
  } = props
  const msg = stateMsgMap[state]
  const baseMsg = stateMsgMap[ActionState.WAIT]

  switch (state) {
    case ActionState.WAIT:
    case ActionState.FAILED:
      return (
        <button
          onClick={onClick}
          className={`border border-gray-900 px-2 rounded-md whitespace-nowrap ${waitClass}`}
        >
          {baseMsg}
        </button>
      )
    case ActionState.ING:
      return (
        <button
          className={`cursor-not-allowed border px-2 rounded-md text-center whitespace-nowrap border-gray-500 text-gray-500 flex justify-center items-center ${ingClass}`}
        >
          <EosIconsBubbleLoading className="mr-1" />
          {baseMsg}
        </button>
      )
    case ActionState.SUCCESS:
      return (
        <div className={`flex items-center whitespace-nowrap ${successClass}`}>
          <button
            className="mr-2  border border-gray-900 rounded-md px-2"
            onClick={onSuccess}
          >
            {msg}
          </button>
          {tx ? <TranSactionHash hash={tx} /> : null}
        </div>
      )

    default:
      return <button>msg</button>
  }
}
