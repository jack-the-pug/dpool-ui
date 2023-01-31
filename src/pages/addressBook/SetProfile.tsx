import { utils } from 'ethers'
import { useCallback, useMemo, useState } from 'react'

import { IconoirDeleteCircledOutline } from '../../components/icon'
import useAddressBook from '../../hooks/useAddressBook'
import { AddressBookRow } from '../../store/addressBook'

export default function SetProfile(props: {
  index: number
  profile: AddressBookRow
  setProfile: (p: AddressBookRow, index: number) => void
  onRemove: (address: string) => void
}) {
  const { setProfile, profile, onRemove, index } = props
  const [address, setAddress] = useState(profile.address)
  const [name, setName] = useState(profile.name)
  const { addressBookMap } = useAddressBook()

  const addressErrorMsg = useMemo(() => {
    if (!address) return ''
    if (!utils.isAddress(address)) return 'Invalid address'
    const row = addressBookMap.get(address.toLowerCase())
    if (row) return 'Addresses cannot be duplicated'
    return ''
  }, [address])
  const submit = useCallback(
    (e: React.FocusEvent<HTMLInputElement>) => {
      if (!utils.isAddress(address)) return
      const _profile = {
        address,
        name,
        id: profile.id,
        index: index,
      }

      setProfile(_profile, index)
    },
    [address, name, setProfile]
  )
  return (
    <form className="flex" style={{ height: '40px' }}>
      <div className="flex flex-col border border-solid border-r-0 border-b-0 border-gray-400">
        <input
          className="outline-none focus:outline-none px-2 dark:bg-slate-800 flex-1 w-96 text-sm"
          type="text"
          name="address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          required
          placeholder="address"
          onBlur={submit}
        />
        {addressErrorMsg ? (
          <div className="text-sm text-red-500 text-right px-2">
            {addressErrorMsg}
          </div>
        ) : null}
      </div>
      <input
        className="outline-none focus:outline-none px-2 dark:bg-slate-800  border border-solid border-r-0 border-b-0 border-gray-400 text-sm w-40"
        type="text"
        name="name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        placeholder="name"
        onBlur={submit}
      />
      <div className="border cursor-pointer border-solid  border-b-0 border-gray-400 outline-none :focus:outline-none px-2 flex items-center w-8">
        <IconoirDeleteCircledOutline
          onClick={() => onRemove(profile.address)}
        />
      </div>
    </form>
  )
}
