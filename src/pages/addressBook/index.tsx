import { utils } from 'ethers'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { MaterialSymbolsAdd } from '../../components/icon'
import { PoolRow } from '../../type/index'
import SetProfile from './SetProfile'
export interface AddressBookItem {
  address: string
  name: string
}

export default function AddressBook() {
  const [addressBook, setAddressBook] = useState<AddressBookItem[]>([])

  useEffect(() => {
    if (addressBook.length === 0) return
    const addressBookObj: { [key: string]: AddressBookItem } = {}
    addressBook.forEach((profile: AddressBookItem) => {
      if (!utils.isAddress(profile.address)) return
      addressBookObj[profile.address.toLowerCase()] = profile
    })
    localStorage.setItem('ADDRESS_BOOK', JSON.stringify(addressBookObj))
  }, [addressBook])

  const addressBookObj = useMemo(
    () => JSON.parse(localStorage.getItem('ADDRESS_BOOK') || '{}'),
    []
  )

  useEffect(() => {
    const addressBook: AddressBookItem[] = Object.values(addressBookObj)
    const books =
      addressBook && addressBook.length
        ? addressBook
        : [{ name: '', address: '' }]
    setAddressBook(books)
  }, [addressBookObj])

  const addEmptyProfile = useCallback(() => {
    setAddressBook([...addressBook, { name: '', address: '' }])
  }, [addressBook])

  const onSetProfile = useCallback(
    (profile: AddressBookItem, index: number) => {
      setAddressBook((_addressBook) => {
        _addressBook[index] = { ...profile }
        return [..._addressBook]
      })
    },
    [addressBook]
  )
  const onRemoveProfile = useCallback(
    (index: number) => {
      const _addressBook = [...addressBook]
      _addressBook.splice(index, 1)

      setAddressBook(_addressBook)
    },
    [addressBook]
  )

  return (
    <div className="w-full flex flex-1 flex-col items-center">
      {addressBook.map((profile, index) => (
        <SetProfile
          key={profile.address + Math.random()}
          profile={profile}
          setProfile={onSetProfile}
          index={index}
          onRemove={onRemoveProfile}
        />
      ))}
      <div
        onClick={() => addEmptyProfile()}
        className="flex w-full items-center justify-center h-8 border cursor-pointer  border-dashed  border-gray-500 rounded-bl-sm rounded-br-sm"
      >
        <MaterialSymbolsAdd className="flex-1" />
      </div>
    </div>
  )
}
