import { BigNumber } from 'ethers'
import { useCallback, useEffect, useMemo } from 'react'
import { TokenMeta } from '../../type'
import { formatCurrencyAmount } from '../../utils/number'

interface TextareaModeProp {
  textarea: string
  setTextarea: (s: string) => void
  textarea2poolList: Function
  parsedTokenAmounts: BigNumber[][]
  tokenMetaList: TokenMeta[]
}

export default function TextareaMode(props: TextareaModeProp) {
  const {
    textarea,
    setTextarea,
    textarea2poolList,
    parsedTokenAmounts,
    tokenMetaList,
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

  const textareaHeight = useMemo(() => {
    const numberOfLineBreaks = (textarea.match(/\n/g) || []).length
    // min-height + lines x line-height + padding + border
    const newHeight = 20 + numberOfLineBreaks * 2 * 14 + 12 + 2
    if (numberOfLineBreaks === 0) return newHeight * 4
    return newHeight
  }, [textarea])
  const onTextareaChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const { value } = e.target
      setTextarea(value)
      textarea2poolList()
    },
    [textarea2poolList]
  )

  return (
    <div
      id="textarea-mode-view"
      style={{ minWidth: 640 }}
      className="w-full border-gray-400 border border-solid border-b-0 flex gap-4"
    >
      <textarea
        wrap="soft"
        value={textarea}
        placeholder="0x314ab97b76e39d63c78d5c86c2daf8eaa306b182 3.141592
                     0x271bffabd0f79b8bd4d7a1c245b7ec5b576ea98a,2.7182
                     0x141ca95b6177615fb1417cf70e930e102bf8f584=1.41421"
        className="w-full min-h-32 leading-8 bg-neutral-200 overflow-hidden resize-none p-2 outline-none focus:outline-none"
        onChange={onTextareaChange}
        onKeyUp={onKeyUp}
        style={{ height: textareaHeight }}
      ></textarea>

      {parsedTokenAmounts.map((cols, colIndex) => {
        if (colIndex === 0) return null
        return (
          <div
            key={colIndex}
            className="flex flex-col leading-8 p-2 text-gray-500"
          >
            {cols.map((amount, rowIndex) => (
              <div key={`${rowIndex}-${colIndex}`}>
                {formatCurrencyAmount(amount, tokenMetaList[colIndex])}
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}
