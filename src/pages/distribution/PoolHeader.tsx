import { useCallback, useEffect, useState } from 'react'
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
          className={`${
            index === 0 ? 'w-80' : 'w-60'
          } flex items-center justify-between cursor-pointer  border-r border-gray-400`}
          key={index}
        >
          <div>
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
              className="w-40 outline-none :focus:outline-none px-2 bg-neutral-200"
            />
          </div>
          <TokenSelect
            tokenMeta={token}
            setTokenMeta={(token) => setTokenMetaByIndex(token, index)}
            dialogDefaultOpen={index === 1}
          />
        </div>
      ))}
      <div className="flex justify-center px-2">
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
            className="flex-1 cursor-pointer"
            onClick={() => {
              setTokens([tokens[0], tokens[0]])
            }}
          />
        )}
      </div>
    </div>
  )
}
