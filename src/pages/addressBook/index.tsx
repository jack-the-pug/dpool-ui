import { useCallback, useEffect, useMemo, useState } from 'react'
import { MaterialSymbolsAdd } from '../../components/icon'
import SetProfile from './SetProfile'
import {
  AddressBookRow,
  getBook,
  updateBookRow,
  deleteBookRow,
} from '../../store/addressBook'
import { toast } from 'react-toastify'
import TextareaMode from './TextareaMode'
import { isAddress } from 'ethers/lib/utils'
const createEmptyRow = (index: number) => ({
  name: '',
  address: '',
  id: '',
  index,
})

export default function AddressBook() {
  const [addressBook, setAddressBook] = useState<AddressBookRow[]>([
    createEmptyRow(0),
  ])

  const [isTextMode, setIsTextMode] = useState<boolean>(false)

  const getAddressBook = () => {
    getBook().then((res) => {
      if (res.length) {
        setAddressBook(res)
      }
    })
  }
  useEffect(() => {
    getAddressBook()
  }, [])

  const addEmptyProfile = useCallback(() => {
    setAddressBook([...addressBook, createEmptyRow(addressBook.length)])
  }, [addressBook])

  const onSetProfile = useCallback(
    async (profile: AddressBookRow, index: number) => {
      const preProfile = addressBook[index]
      if (preProfile && isAddress(preProfile.address)) {
        await deleteBookRow(preProfile.address)
      }
      updateBookRow({ ...profile, id: profile.address.toLowerCase() })
        .then(() => getAddressBook())
        .catch(() => toast.error('Duplicate Addresses'))
    },
    [addressBook]
  )

  const onRemoveProfile = useCallback(
    (address: string) => {
      deleteBookRow(address).then(() => getAddressBook())
    },
    [addressBook]
  )

  return (
    <div className="w-full flex flex-1 flex-col items-center bg-white p-4 mb-8 rounded-lg shadow-lg">
      <div className="w-full">
        <div className="flex flex-row items-center mb-2 w-full">
          <span className={`${isTextMode ? 'opacity-30' : 'text-green-500'}`}>
            Table View
          </span>
          <label className="switch mx-2">
            <input
              onChange={(e) => {
                setIsTextMode(e.target.checked)
              }}
              type="checkbox"
              checked={isTextMode}
            />
            <span className="slider rounded-lg"></span>
          </label>

          <span className={`${isTextMode ? 'text-green-500' : 'opacity-30'}`}>
            Plain Text
          </span>
        </div>
      </div>
      <div className="flex border-solid  border-l border-t border-gray-400">
        <div className="w-96 flex items-center pl-2">Address</div>
        <div className="w-48 flex items-center pl-2 py-1   border-solid  border-l border-r border-gray-400">
          Name
        </div>
      </div>
      {isTextMode ? (
        <TextareaMode
          addressBook={addressBook}
          setAddressBook={setAddressBook}
        />
      ) : (
        <div>
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
      )}
    </div>
  )
}
