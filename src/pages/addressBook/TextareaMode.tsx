import { isAddress } from 'ethers/lib/utils'
import { useCallback, useMemo, useState } from 'react'
import { AddressBookRow } from '../../store/addressBook'
import { bulkAdd } from '../../store/addressBook'

export default function TextareaMode(props: {
  addressBook: AddressBookRow[]
  setAddressBook: (list: AddressBookRow[]) => void
}) {
  const { addressBook, setAddressBook } = props

  const [textarea, setTextarea] = useState<string>(
    addressBook.reduce((pre, cur) => `${pre}${cur.address},${cur.name}\n`, '')
  )

  const textareaHeight = useMemo(() => {
    const numberOfLineBreaks = (textarea.match(/\n/g) || []).length
    // min-height + lines x line-height + padding + border
    const newHeight = 20 + numberOfLineBreaks * 2 * 14 + 12 + 2
    if (numberOfLineBreaks === 0) return newHeight * 4
    return newHeight
  }, [textarea])
  const parsedToAddressBook = useCallback(() => {
    const rowTextList = textarea.split('\n')
    const list: AddressBookRow[] = []
    rowTextList.forEach((rowText, index) => {
      const maybeRow = [
        rowText.split(','),
        rowText.split(' '),
        rowText.split(':'),
        rowText.split('='),
      ]
      const row = maybeRow.find((maybeRowItem) => maybeRowItem.length === 2)
      if (!row || !isAddress(row[0])) return
      list.push({
        address: row[0],
        name: row[1],
        id: row[0].toLowerCase(),
        index,
      })
    })
    return list
  }, [textarea])
  const onTextareaBlur = () => {
    const list = parsedToAddressBook()
    bulkAdd(list)
    setAddressBook(list)
  }
  return (
    <textarea
      className="p-2 min-h-32 leading-8 bg-neutral-200 overflow-hidden text-sm resize-none outline-none focus:outline-none border border-gray-400"
      style={{ width: '36rem', height: textareaHeight }}
      placeholder="0x314ab97b76e39d63c78d5c86c2daf8eaa306b182 bob
                   0x271bffabd0f79b8bd4d7a1c245b7ec5b576ea98a,Heisenberg
                   0x141ca95b6177615fb1417cf70e930e102bf8f584=friend"
      value={textarea}
      onChange={(e) => setTextarea(e.target.value)}
      onBlur={onTextareaBlur}
    />
  )
}
