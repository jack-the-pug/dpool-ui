import { useCallback } from 'react'
import {
  IconoirDeleteCircledOutline,
  MaterialSymbolsAdd,
} from '../../components/icon'
import { TokenMeta } from '../../type/index'
import TokenSelect from '../../components/token/TokenSelect'

export default function PoolTableHeader(props: {
  tokenMetaList: TokenMeta[]
  setTokenMetaList: (tokens: TokenMeta[]) => void
  tableHeaderInputList: string[]
  setTableHeaderInputList: (list: string[]) => void
}) {
  const {
    tokenMetaList: tokens,
    setTokenMetaList: setTokens,
    tableHeaderInputList,
    setTableHeaderInputList,
  } = props
  const setTokenMetaByIndex = useCallback(
    (token: TokenMeta, index: number) => {
      const tempTokens: TokenMeta[] = [...tokens]
      tempTokens[index] = token
      setTokens(tempTokens)
    },
    [tokens]
  )
  return (
    <div className="flex items-center">
      {tokens.map((token, index) => (
        <div
          className={`w-80 flex items-center justify-between cursor-pointer text-base border-r border-gray-400 relative `}
          key={index}
        >
          <input
            value={tableHeaderInputList[index]}
            placeholder="Total amount"
            type="number"
            min={0}
            onChange={(e) => {
              const value = e.target.value
              const list = [...tableHeaderInputList]
              list[index] = value
              setTableHeaderInputList(list)
            }}
            className="flex-1 outline-none focus:outline-none  px-2 my-1 bg-neutral-200"
          />
          <TokenSelect
            tokenMeta={token}
            setTokenMeta={(token) => setTokenMetaByIndex(token, index)}
            dialogDefaultOpen={index === 1 && !token}
          />
        </div>
      ))}
      <div
        className="flex justify-center"
        style={{ width: 'calc(3rem - 2px)' }}
      >
        {tokens.length === 2 ? (
          <IconoirDeleteCircledOutline
            onClick={() => {
              setTokens([tokens[0]])
            }}
            className="cursor-pointer"
          />
        ) : null}
        {tokens.length === 1 && (
          <MaterialSymbolsAdd
            className="cursor-pointer"
            onClick={() => {
              setTokens([tokens[0], tokens[0]])
            }}
          />
        )}
      </div>
    </div>
  )
}
