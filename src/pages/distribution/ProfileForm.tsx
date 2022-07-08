import { isAddress } from 'ethers/lib/utils'
import { useState, useCallback, useMemo, useEffect } from 'react'
import { IconoirDeleteCircledOutline } from '../../components/icon'
import { PoolRow } from '../../type/index'
import { addKilobits } from '../../utils/number'

interface TProfileProps {
  profile: PoolRow
  index: number
  profileKey: string
  onRemove: (index: number) => void
  onChange: (index: number, profile: PoolRow) => void
  hasSecondToken: boolean
  secondTokenAmounts: number[] | undefined
}

export function Profile(props: TProfileProps) {
  const {
    onRemove,
    onChange,
    index,
    profile: _profile,
    hasSecondToken,
    secondTokenAmounts,
  } = props

  const [address, setAddress] = useState<string>(_profile.address)
  const [amount, setAmount] = useState<number>(_profile.baseTokenAmount || 0)
  const addressBookObj = useMemo(
    () => JSON.parse(localStorage.getItem('ADDRESS_BOOK') || '{}'),
    []
  )
  const submit = useCallback(() => {
    const profile = { ..._profile }
    profile.address = address
    profile.baseTokenAmount = amount
    onChange(index, profile)
  }, [address, amount, index, _profile])

  const [fouceInputNumber, setFouceInputNumber] = useState(-1)
  const [addressErrorMsg, setAddressErrorMsg] = useState('')
  const onAddressBlur = useCallback(() => {
    setFouceInputNumber(-1)
    if (!isAddress(address)) {
      return
    }
    setAddressErrorMsg('')
    submit()
  }, [address, amount, submit])

  // const [nameErrorMsg, setNameErrorMsg] = useState('')
  // const onNameBlur = useCallback(() => {
  //   setFouceInputNumber(-1)
  //   if (!profile.name) {
  //     setNameErrorMsg('Required')
  //     return
  //   }
  //   setNameErrorMsg('')
  //   submit()
  // }, [profile.name])

  const [amountErrorMsg, setAmountErrorMsg] = useState('')
  const onAmountBlur = useCallback(() => {
    setFouceInputNumber(-1)
    if (!amount) {
      setAmountErrorMsg('Required')
      return
    }
    setAmountErrorMsg('')
    submit()
  }, [amount, address, submit])
  const [addressBookName, setAddressBookName] = useState<string>('')
  useEffect(() => {
    if (!address) {
      setAddressErrorMsg('')
      setAddressBookName('')
      return
    }
    console.log('address', address, addressBookObj)
    if (!isAddress(address)) {
      setAddressBookName('')
      setAddressErrorMsg('Invalid Address')
    } else if (addressBookObj[address.toLowerCase()]) {
      const name = addressBookObj[address.toLowerCase()].name
      console.log('name', name)
      setAddressBookName(name)
    }
  }, [address, addressBookObj])
  return (
    <form className="flex h-12">
      <div className="w-10 text-black border border-solid border-r-0 border-b-0  border-gray-400 outline-none  px-2 flex items-center">
        {index + 1}
      </div>
      <div
        className={`${
          fouceInputNumber === 1 ? 'bg-gray-100' : 'bg-neutral-200'
        } border border-solid border-r-0 border-b-0 border-gray-400 flex flex-1 flex-col  justify-center`}
        style={{ minWidth: '380px' }}
      >
        <input
          className={`${
            fouceInputNumber === 1 ? 'bg-gray-100' : 'bg-neutral-200'
          } outline-none focus:outline-none px-2 bg-neutral-200`}
          placeholder="address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          onBlur={onAddressBlur}
          onFocus={() => setFouceInputNumber(1)}
          key={props.profileKey + 'address'}
          name="address"
        />
        {addressBookName ? (
          <span className="text-xs px-2 font-thin italic text-gray-500">
            {addressBookName}
          </span>
        ) : null}
        {addressErrorMsg ? (
          <div className="text-red-500 text-xs px-2">{addressErrorMsg}</div>
        ) : null}
      </div>
      <div
        className={`${
          fouceInputNumber === 2 ? 'bg-gray-100' : 'bg-neutral-200'
        } border border-solid border-r-0 border-b-0 border-gray-400 flex flex-col justify-center px-2 w-60`}
      >
        <input
          className={`${
            fouceInputNumber === 2 ? 'bg-gray-100' : 'bg-neutral-200'
          } outline-none :focus:outline-none px-2 bg-neutral-200`}
          placeholder="amount"
          key={props.profileKey + 'amount'}
          type="number"
          value={amount}
          min={0}
          onChange={(e) => setAmount(e.target.valueAsNumber)}
          onBlur={onAmountBlur}
          onFocus={() => setFouceInputNumber(2)}
        />
        {amountErrorMsg ? (
          <div className="text-red-500 text-xs px-2">{amountErrorMsg}</div>
        ) : null}
      </div>
      {hasSecondToken && secondTokenAmounts && (
        <div
          className={`w-60 cursor-not-allowed text-gray-500 border border-solid border-r-0 border-b-0 border-gray-400 flex flex-col justify-center px-2`}
        >
          {secondTokenAmounts[index]}
        </div>
      )}
      <div
        className={`border px-2 justify-center font-medium text-lg  cursor-pointer border-solid  border-b-0 border-gray-400 outline-none :focus:outline-none  flex items-center`}
      >
        <IconoirDeleteCircledOutline onClick={() => onRemove(index)} />
      </div>
    </form>
  )
}
