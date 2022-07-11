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
  onRemoveTokenCallBack: () => void
  onAddTokenCallBack: () => void
  secondTokenTotalAmount: number
  setSecondTokenTotalAmount: (n: number) => void
}) {
  const {
    tokenMetaList: tokens,
    setTokenMetaList: setTokens,
    onRemoveTokenCallBack,
    onAddTokenCallBack,
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
        let totalAmount: React.ReactElement | null = null
        if (index === 1) {
          totalAmount = (
            <div>
              <input
                value={secondTokenTotalAmount}
                placeholder="Total amount"
                type="number"
                min={0}
                onChange={(e) => {
                  const value = e.target.valueAsNumber
                  console.log('value', value)
                  setSecondTokenTotalAmount(value)
                }}
                className="w-40 outline-none :focus:outline-none px-2 bg-neutral-200"
              />
            </div>
          )
        }
        return (
          <div
            className={`w-60 flex flex-1 items-center ${
              index === 1 ? 'justify-between' : 'justify-center'
            } cursor-pointer  border-r border-gray-400`}
            key={index}
          >
            {totalAmount}
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
              onRemoveTokenCallBack()
            }}
            className="cursor-pointer"
          />
        ) : null}
        {tokens.length === 1 && (
          <MaterialSymbolsAdd
            className="flex-1 cursor-pointer"
            onClick={() => {
              setTokens([tokens[0] as TokenMeta, undefined])
              onAddTokenCallBack()
            }}
          />
        )}
      </div>
    </div>
  )
}
