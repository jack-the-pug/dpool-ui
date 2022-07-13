import { useCallback, useEffect, useState } from 'react'
import {
  IconoirDeleteCircledOutline,
  MaterialSymbolsAdd,
} from '../../../components/icon'
import { TokenMeta } from '../../../type/index'
import TokenSelect from './TokenSelect'

export type TokenMetaList = [...TokenMeta[], undefined | TokenMeta]

export default function TokensSelect(props: {
  tokenMetaList: TokenMetaList
  setTokenMetaList: (tokens: TokenMetaList) => void
  basePercentModeTotal: number | undefined
  setBasePercentModeTotal: (n: number) => void
  secondTokenTotalAmount: number | undefined
  setSecondTokenTotalAmount: (n: number) => void
}) {
  const {
    tokenMetaList: tokens,
    setTokenMetaList: setTokens,

    basePercentModeTotal,
    setBasePercentModeTotal,
    secondTokenTotalAmount,
    setSecondTokenTotalAmount,
  } = props
  const setTokenMetaByIndex = useCallback(
    (token: TokenMeta, index: number) => {
      const tempTokens: TokenMetaList = [...tokens]
      tempTokens[index] = token
      setTokens(tempTokens)
    },
    [tokens]
  )

  return (
    <div className="flex items-center">
      {tokens.map((token, index) => {
        let totalAmountNode: React.ReactElement | null = null
        if (index === 0) {
          totalAmountNode = (
            <div>
              <input
                value={basePercentModeTotal}
                placeholder="Total amount"
                type="number"
                min={0}
                onChange={(e) => {
                  const value = e.target.valueAsNumber
                  setBasePercentModeTotal(value)
                }}
                className="w-40 outline-none :focus:outline-none px-2 bg-neutral-200"
              />
            </div>
          )
        }
        if (index === 1) {
          totalAmountNode = (
            <div>
              <input
                value={secondTokenTotalAmount}
                placeholder="Total amount"
                type="number"
                min={0}
                onChange={(e) => {
                  const value = e.target.valueAsNumber
                  setSecondTokenTotalAmount(value)
                }}
                className="w-40 outline-none :focus:outline-none px-2 bg-neutral-200"
              />
            </div>
          )
        }
        return (
          <div
            className={`${
              index === 0 ? 'w-80' : 'w-60'
            } flex items-center justify-between cursor-pointer  border-r border-gray-400`}
            key={index}
          >
            {totalAmountNode}
            <TokenSelect
              tokenMeta={token}
              setTokenMeta={(token) => setTokenMetaByIndex(token, index)}
              dialogDefaultOpen={index === 1}
            />
          </div>
        )
      })}
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
              setTokens([tokens[0] as TokenMeta, undefined])
            }}
          />
        )}
      </div>
    </div>
  )
}
