import { BigNumber, utils } from 'ethers'
import { isAddress } from 'ethers/lib/utils'
import { useState, useCallback, useMemo, useEffect } from 'react'
import { IconoirDeleteCircledOutline } from '../../components/icon'
import { PoolRow, TokenMeta } from '../../type/index'
import { addKilobits } from '../../utils/number'
import { TPoolRow } from './CreatePool'

interface TProfileProps {
  profile: TPoolRow
  index: number
  profileKey: string
  onRemove: (index: number) => void
  onChange: (index: number, profile: PoolRow) => void
  hasSecondToken: boolean
  secondTokenAmounts: number[] | undefined
  percentModeTokenTotalAmount: number
  percentModeRowAmountTotal: number
  isPercentMode: boolean
}

export function Profile(props: TProfileProps) {
  const {
    onRemove,
    onChange,
    index,
    profile: _profile,
    hasSecondToken,
    secondTokenAmounts,
    percentModeTokenTotalAmount,
    percentModeRowAmountTotal,

    isPercentMode,
  } = props
  const [address, setAddress] = useState<string>(_profile.address)
  const [amount, setAmount] = useState<number>(_profile.baseTokenAmount || 0)
  const [point, setPoint] = useState<number>(_profile.point || 0)
  const percentageModeAmount = useMemo(() => {
    console.log('TEST')
    if (
      !percentModeRowAmountTotal ||
      isNaN(percentModeRowAmountTotal) ||
      isNaN(point) ||
      isNaN(percentModeTokenTotalAmount)
    ) {
      return
    }
    // return BigNumber.from(point)
    //   .mul(BigNumber.from(percentModeTokenTotalAmount))
    //   .div(BigNumber.from(percentModeRowAmountTotal))
    //   .toNumber()

    return (point * percentModeTokenTotalAmount) / percentModeRowAmountTotal
  }, [point, percentModeRowAmountTotal, percentModeTokenTotalAmount])

  const addressBookObj = useMemo(
    () => JSON.parse(localStorage.getItem('ADDRESS_BOOK') || '{}'),
    []
  )
  useEffect(() => {
    submit()
  }, [percentageModeAmount])

  const submit = useCallback(() => {
    const profile = { ..._profile }
    profile.address = address
    profile.baseTokenAmount = amount
    if (isPercentMode) {
      profile.baseTokenAmount = percentageModeAmount!
    }
    profile.point = point
    onChange(index, profile)
  }, [address, amount, index, _profile, point, percentageModeAmount])

  const [fouceInputNumber, setFouceInputNumber] = useState(-1)
  const [addressErrorMsg, setAddressErrorMsg] = useState('')

  const onAddressBlur = useCallback(() => {
    setFouceInputNumber(-1)
    if (!isAddress(address)) {
      return
    }
    submit()
    setAddressErrorMsg('')
  }, [address, amount, submit])

  const [amountErrorMsg, setAmountErrorMsg] = useState('')

  const onAmountBlur = useCallback(() => {
    if (amount && !isNaN(amount)) {
      submit()
    }
    setFouceInputNumber(-1)
  }, [amount, submit])

  const onPercentageBlur = useCallback(() => {
    setFouceInputNumber(-1)
    console.log('_profile', _profile)
    submit()
  }, [point, submit])

  const [addressBookName, setAddressBookName] = useState<string>('')
  useEffect(() => {
    if (!address) {
      setAddressErrorMsg('')
      setAddressBookName('')
      return
    }
    if (!isAddress(address)) {
      setAddressBookName('')
      setAddressErrorMsg('Invalid Address')
    } else if (addressBookObj[address.toLowerCase()]) {
      const name = addressBookObj[address.toLowerCase()].name
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
      {isPercentMode ? (
        <div
          className={`${
            fouceInputNumber === 2 ? 'bg-gray-100' : 'bg-neutral-200'
          } border border-solid border-r-0 border-b-0 border-gray-400 flex justify-center items-center px-2 w-80`}
        >
          <div className="flex flex-1 flex-col justify-between">
            <input
              className={`${
                fouceInputNumber === 2 ? 'bg-gray-100' : 'bg-neutral-200'
              } outline-none :focus:outline-none  bg-neutral-200`}
              placeholder="amount"
              key={props.profileKey + 'percent'}
              type="number"
              value={point}
              min={0}
              onChange={(e) => setPoint(e.target.valueAsNumber)}
              onBlur={onPercentageBlur}
              onFocus={() => setFouceInputNumber(2)}
            />

            <div className="text-xs text-gray-500">
              {`${((point / percentModeRowAmountTotal) * 100).toFixed(2)} %`}
            </div>
            {amountErrorMsg ? (
              <div className="text-red-500 text-xs px-2">{amountErrorMsg}</div>
            ) : null}
          </div>
          <div className="text-xs text-gray-500">
            {percentageModeAmount?.toFixed(2)}
          </div>
        </div>
      ) : (
        <div
          className={`${
            fouceInputNumber === 2 ? 'bg-gray-100' : 'bg-neutral-200'
          } border border-solid border-r-0 border-b-0 border-gray-400 flex flex-col justify-center px-2 w-80`}
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
            onBlur={onAmountBlur}
            onChange={(e) => setAmount(e.target.valueAsNumber)}
            onFocus={() => setFouceInputNumber(2)}
          />
          {amountErrorMsg ? (
            <div className="text-red-500 text-xs px-2">{amountErrorMsg}</div>
          ) : null}
        </div>
      )}
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
