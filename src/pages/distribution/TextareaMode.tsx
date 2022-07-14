import { BigNumber } from 'ethers'
import React, { useCallback, useContext, useState } from 'react'
import TokensSelect, { TokenMetaList } from './poolHeader'

interface TextareaModeProp {
  textarea: string
  setTextarea: (s: string) => void
  tokenMetaList: TokenMetaList
  setTokenMetaList: (tokens: TokenMetaList) => void
  secondTokenTotalAmount: number | undefined
  setSecondTokenTotalAmount: (n: number) => void
  secondTokenAmounts: string[] | null
  textarea2poolList: Function
  basePercentModeTotal: number | undefined
  setBasePercentModeTotal: (n: number) => void
}

export default function TextareaMode(props: TextareaModeProp) {
  const {
    textarea,
    setTextarea,
    tokenMetaList,
    setTokenMetaList,

    secondTokenTotalAmount,
    setSecondTokenTotalAmount,
    secondTokenAmounts,
    textarea2poolList,
    basePercentModeTotal,
    setBasePercentModeTotal,
  } = props
  const onKeyUp = useCallback(
    (e: React.KeyboardEvent) => {
      // sync pool data
      if (e.code === 'Enter') {
        textarea2poolList()
      }
    },
    [textarea2poolList]
  )
  const onTextareaChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const { value } = e.target
      setTextarea(value)
      const numberOfLineBreaks = (value.match(/\n/g) || []).length
      // min-height + lines x line-height + padding + border
      const newHeight = 20 + numberOfLineBreaks * 2 * 14 + 12 + 2
      e.target.style.height = `${newHeight}px`
    },
    []
  )
  return (
    <div
      id="textarea-mode-view"
      style={{ minWidth: 640 }}
      className="w-full mt-2 border-gray-400 border border-solid flex flex-col"
    >
      <div className="border-b border-gray-400 flex">
        <div className="w-3/5"></div>
        <TokensSelect
          tokenMetaList={tokenMetaList}
          setTokenMetaList={setTokenMetaList}
          secondTokenTotalAmount={secondTokenTotalAmount}
          setSecondTokenTotalAmount={setSecondTokenTotalAmount}
          basePercentModeTotal={basePercentModeTotal}
          setBasePercentModeTotal={setBasePercentModeTotal}
        />
      </div>
      <div className="flex">
        <div className="w-10/12">
          <textarea
            wrap="soft"
            value={textarea}
            placeholder="0x314ab97b76e39d63c78d5c86c2daf8eaa306b182 3.141592
                     0x271bffabd0f79b8bd4d7a1c245b7ec5b576ea98a,2.7182
                     0x141ca95b6177615fb1417cf70e930e102bf8f584=1.41421"
            className="relative w-full h-32 leading-8 bg-neutral-200 overflow-hidden resize-none p-2 outline-none foucs:outline-none"
            onChange={onTextareaChange}
            onKeyUp={onKeyUp}
          ></textarea>
        </div>
        <div className="flex-1 p-2">
          {secondTokenAmounts
            ? secondTokenAmounts.map((amount, index) => (
                <div
                  key={`${amount}-${index}`}
                  className="text-gray-500 leading-8 cursor-not-allowed"
                >
                  {amount}
                </div>
              ))
            : null}
        </div>
      </div>
    </div>
  )
}
