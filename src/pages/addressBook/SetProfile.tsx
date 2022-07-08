import { utils } from 'ethers'
import { useCallback, useMemo, useState } from 'react'
import { AddressBookItem } from '.'
import { IconoirDeleteCircledOutline } from '../../components/icon'

export default function SetProfile(props: {
  index: number
  profile: AddressBookItem
  setProfile: (p: AddressBookItem, index: number) => void
  onRemove: (index: number) => void
}) {
  const { setProfile, profile, onRemove, index } = props
  const [address, setAddress] = useState(profile.address)
  const [name, setName] = useState(profile.name)
  const addressBookObj = useMemo(
    () => JSON.parse(localStorage.getItem('contacts') || '{}'),
    []
  )
  const submit = useCallback(
    (e: React.FocusEvent<HTMLInputElement>) => {
      e.preventDefault()
      if (!utils.isAddress(address)) return
      if (addressBookObj[address]) return
      const _profile = {
        address,
        name,
      }
      setProfile(_profile, index)
    },
    [address, name, setProfile]
  )
  return (
    <form className="flex" style={{ height: '30px' }}>
      <input
        className="outline-none focus:outline-none px-2 bg-neutral-200 border border-solid border-r-0 border-b-0 border-gray-400"
        style={{ width: '380px' }}
        type="text"
        name="address"
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        required
        placeholder="address"
        onBlur={submit}
      />
      <input
        className="outline-none focus:outline-none px-2 bg-neutral-200 border border-solid border-r-0 border-b-0 border-gray-400"
        type="text"
        name="name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        placeholder="name"
        onBlur={submit}
      />
      <div className="border cursor-pointer border-solid  border-b-0 border-gray-400 outline-none :focus:outline-none px-2 flex items-center">
        <IconoirDeleteCircledOutline onClick={() => onRemove(index)} />
      </div>
    </form>
  )
}
