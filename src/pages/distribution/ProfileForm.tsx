import { BigNumber, FixedNumber, utils } from 'ethers'
import { isAddress } from 'ethers/lib/utils'
import { useState, useCallback, useMemo, useEffect } from 'react'
import { IconoirDeleteCircledOutline } from '../../components/icon'
import { PoolRow, TokenMeta } from '../../type/index'
import { formatCurrencyAmount, parsed2NumberString } from '../../utils/number'
import { TPoolRow } from './CreatePool'

interface TProfileProps {
  profile: TPoolRow
  index: number
  profileKey: string
  onRemove: (index: number) => void
  onChange: (index: number, profile: PoolRow) => void
  repeatedAddress: string | undefined
  isPercentMode: boolean
  parsedTokenAmounts: BigNumber[][]
  tokenMetaList: TokenMeta[]
  userInputTotal: BigNumber
}

export function Profile(props: TProfileProps) {
  const {
    onRemove,
    onChange,
    index,
    profile: _profile,
    parsedTokenAmounts,
    tokenMetaList,
    isPercentMode,
    userInputTotal,
    repeatedAddress: repeatedAddress,
  } = props

  const [address, setAddress] = useState<string>(_profile.address)
  const [inputAmount, setInputAmount] = useState<string>(
    _profile.userInputAmount
  )
  const addressBookObj = useMemo(
    () => JSON.parse(localStorage.getItem('ADDRESS_BOOK') || '{}'),
    []
  )

  const submit = useCallback(() => {
    const profile = { ..._profile }
    profile.address = address
    profile.userInputAmount = inputAmount
    onChange(index, profile)
  }, [onChange, address, inputAmount])

  useEffect(() => {
    submit()
  }, [inputAmount])

  const [focusInputNumber, setFocusInputNumber] = useState(-1)

  const onAddressBlur = useCallback(() => {
    setFocusInputNumber(-1)
    if (!isAddress(address)) {
      return
    }
    submit()
  }, [address, inputAmount, submit])

  const onAmountBlur = useCallback(() => {
    setFocusInputNumber(-1)
  }, [inputAmount, submit])

  const addressBookName = useMemo(() => {
    if (isAddress(address) && addressBookObj[address.toLowerCase()]) {
      return addressBookObj[address.toLowerCase()].name
    }
  }, [addressBookObj, address])

  const addressErrorMsg = useMemo(() => {
    if (!address) return
    if (!isAddress(address)) return 'Invalid address'
    if (
      repeatedAddress &&
      repeatedAddress.toLowerCase() === address.toLowerCase()
    )
      return 'Addresses cannot be duplicated'
    return
  }, [address, repeatedAddress])

  return (
    <form className="flex h-12">
      <div className="w-10 text-black border border-solid border-r-0 border-b-0  border-gray-400 outline-none  px-2 flex items-center">
        {index + 1}
      </div>
      <div
        className={`${
          focusInputNumber === 1 ? 'bg-gray-100' : 'bg-neutral-200'
        } border border-solid border-r-0 border-b-0 border-gray-400 flex flex-1 flex-col  justify-center`}
        style={{ minWidth: '380px' }}
      >
        <input
          className={`${
            focusInputNumber === 1 ? 'bg-gray-100' : 'bg-neutral-200'
          } outline-none focus:outline-none px-2 bg-neutral-200`}
          placeholder="address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          onBlur={onAddressBlur}
          onFocus={() => setFocusInputNumber(1)}
          key={props.profileKey + 'address'}
          name="address"
        />

        {(addressBookName || addressErrorMsg) && (
          <div className="flex gap-4">
            {addressBookName ? (
              <span className="text-xs px-2 font-thin italic text-gray-500">
                {addressBookName}
              </span>
            ) : null}
            {addressErrorMsg ? (
              <div className="text-red-500 text-xs px-2">{addressErrorMsg}</div>
            ) : null}
          </div>
        )}
      </div>

      <div
        className={`${
          focusInputNumber === 2 ? 'bg-gray-100' : 'bg-neutral-200'
        } border border-solid border-r-0 border-b-0 border-gray-400 flex justify-between items-center px-2 w-80 overflow-hidden`}
      >
        <div className="flex flex-col">
          <input
            className={`${
              focusInputNumber === 2 ? 'bg-gray-100' : 'bg-neutral-200'
            } outline-none :focus:outline-none  bg-neutral-200`}
            placeholder="amount"
            key={props.profileKey + 'amount'}
            type="number"
            value={inputAmount}
            min={0}
            onBlur={onAmountBlur}
            onChange={(e) => setInputAmount(e.target.value)}
            onFocus={() => setFocusInputNumber(2)}
          />
          {isPercentMode && userInputTotal.gt(0) ? (
            <div className="text-xs text-gray-500">
              {utils
                .parseUnits(
                  parsed2NumberString(inputAmount),
                  tokenMetaList[0]?.decimals
                )
                .mul(10000)
                .div(userInputTotal)
                .toNumber() / 100}
              %
            </div>
          ) : null}
        </div>
        {isPercentMode ? (
          <div className="text-xs text-gray-500">
            {formatCurrencyAmount(
              parsedTokenAmounts[0][index],
              tokenMetaList[0]
            )}
          </div>
        ) : null}
      </div>
      {tokenMetaList[1] ? (
        <div className="border border-solid text-gray-500 cursor-not-allowed bg-neutral-200 border-r-0 border-b-0 border-gray-400 flex justify-between items-center px-2 w-80">
          {formatCurrencyAmount(parsedTokenAmounts[1][index], tokenMetaList[1])}
        </div>
      ) : null}
      <div
        className={`border px-2 justify-center font-medium text-lg  cursor-pointer border-solid  border-b-0 border-gray-400 outline-none :focus:outline-none  flex items-center`}
      >
        <IconoirDeleteCircledOutline onClick={() => onRemove(index)} />
      </div>
    </form>
  )
}
