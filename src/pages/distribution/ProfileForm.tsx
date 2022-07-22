import { BigNumber, utils } from 'ethers'
import { isAddress } from 'ethers/lib/utils'
import { useState, useCallback, useMemo, useEffect } from 'react'
import { IconoirDeleteCircledOutline } from '../../components/icon'
import useAddressBook from '../../hooks/useAddressBook'
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
  const { addressName } = useAddressBook()
  const [address, setAddress] = useState<string>(_profile.address)
  const [inputAmount, setInputAmount] = useState<string>(
    _profile.userInputAmount
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

  const addressErrorMsg = useMemo(() => {
    if (!address && inputAmount) return 'Please enter address'
    if (!address) return
    if (!isAddress(address)) return 'Invalid address'
    if (
      repeatedAddress &&
      repeatedAddress.toLowerCase() === address.toLowerCase()
    )
      return 'Addresses cannot be duplicated'
    return
  }, [address, repeatedAddress, inputAmount])

  return (
    <form className="flex h-12">
      <div className="text-black border border-solid border-r-0 border-b-0  border-gray-400 outline-none  text-center flex justify-center items-center w-10">
        {index + 1}
      </div>
      <div
        className={`${
          focusInputNumber === 1 ? 'bg-gray-100' : 'bg-neutral-200'
        } border border-solid border-r-0 border-b-0 border-gray-400 flex flex-col justify-center`}
        style={{ width: 'calc(24rem + 1px)' }}
      >
        <input
          className={`${
            focusInputNumber === 1 ? 'bg-gray-100' : 'bg-neutral-200'
          } outline-none focus:outline-none px-2 bg-neutral-200 text-sm`}
          placeholder="address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          onBlur={onAddressBlur}
          onFocus={() => setFocusInputNumber(1)}
          key={props.profileKey + 'address'}
          name="address"
        />

        {(addressName(address) || addressErrorMsg) && (
          <div className="flex w-full flex-row px-2">
            {addressName(address) ? (
              <div className="text-xs font-thin italic text-gray-500">
                {addressName(address)}
              </div>
            ) : null}
            {addressErrorMsg ? (
              <div className="text-red-500 text-xs px-2 self-end flex-grow flex-1 text-right">
                {addressErrorMsg}
              </div>
            ) : null}
          </div>
        )}
      </div>

      <div
        className={`${
          focusInputNumber === 2 ? 'bg-gray-100' : 'bg-neutral-200'
        } border border-solid border-r-0 border-b-0 border-gray-400 flex flex-col justify-between items-center px-2  w-80 overflow-hidden`}
      >
        <input
          className={`${
            focusInputNumber === 2 ? 'bg-gray-100' : 'bg-neutral-200'
          } w-full outline-none :focus:outline-none   bg-neutral-200 items-end ${
            isPercentMode ? 'h-3/5' : 'h-full'
          }`}
          placeholder="amount"
          key={props.profileKey + 'amount'}
          type="number"
          value={inputAmount}
          min={0}
          onBlur={onAmountBlur}
          onChange={(e) => setInputAmount(e.target.value)}
          onFocus={() => setFocusInputNumber(2)}
        />

        {isPercentMode ? (
          <div className="flex flex-1 justify-between w-full items-center">
            <div className="text-xs text-gray-500">
              {utils
                .parseUnits(
                  parsed2NumberString(inputAmount),
                  tokenMetaList[0]?.decimals
                )
                .mul(10000) // Retain two decimal places
                .div(userInputTotal)
                .toNumber() / 100}
              %
            </div>
            <div className="text-xs text-gray-500 cursor-not-allowed">
              {formatCurrencyAmount(
                parsedTokenAmounts[0][index],
                tokenMetaList[0]
              )}
            </div>
          </div>
        ) : null}
      </div>
      {tokenMetaList[1] ? (
        <div className="border border-solid text-gray-500 cursor-not-allowed bg-neutral-200 border-r-0 border-b-0 border-gray-400 flex justify-between items-center px-2 w-80">
          {formatCurrencyAmount(parsedTokenAmounts[1][index], tokenMetaList[1])}
        </div>
      ) : null}
      <div
        className={`w-12 justify-center  cursor-pointer border  border-b-0 border-gray-400 m-0 flex items-center`}
      >
        <IconoirDeleteCircledOutline onClick={() => onRemove(index)} />
      </div>
    </form>
  )
}
