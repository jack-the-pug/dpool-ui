import { BigNumber, FixedNumber, utils } from 'ethers'
import { isAddress } from 'ethers/lib/utils'
import { useState, useCallback, useMemo, useEffect } from 'react'
import { IconoirDeleteCircledOutline } from '../../components/icon'
import { PoolRow, TokenMeta } from '../../type/index'
import { addKilobits } from '../../utils/number'
import { parsed2NumberString } from '../../utils/verify'
import { TPoolRow } from './CreatePool'

interface TProfileProps {
  profile: TPoolRow
  index: number
  profileKey: string
  onRemove: (index: number) => void
  onChange: (index: number, profile: PoolRow) => void
  repeateAddress: string | undefined
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
    repeateAddress,
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

  const [fouceInputNumber, setFouceInputNumber] = useState(-1)
  const [addressErrorMsg, setAddressErrorMsg] = useState('')

  const onAddressBlur = useCallback(() => {
    setFouceInputNumber(-1)
    if (!isAddress(address)) {
      return
    }
    submit()
  }, [address, inputAmount, submit])

  const onAmountBlur = useCallback(() => {
    setFouceInputNumber(-1)
  }, [inputAmount, submit])

  const [addressBookName, setAddressBookName] = useState<string>('')

  useEffect(() => {
    if (!address) {
      setAddressBookName('')
      setAddressErrorMsg('')
      return
    }
    if (isAddress(address)) {
      if (addressBookObj[address.toLowerCase()]) {
        const name = addressBookObj[address.toLowerCase()].name
        setAddressBookName(name)
      }
      if (
        repeateAddress &&
        repeateAddress.toLowerCase() === address.toLowerCase()
      ) {
        setAddressErrorMsg('addresses cannot be duplicated')
      } else {
        setAddressErrorMsg('')
      }
    } else {
      setAddressErrorMsg('Invalid address')
    }
  }, [address, addressBookObj, repeateAddress])

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
          fouceInputNumber === 2 ? 'bg-gray-100' : 'bg-neutral-200'
        } border border-solid border-r-0 border-b-0 border-gray-400 flex justify-between items-center px-2 w-80`}
      >
        <div className="flex flex-col">
          <input
            className={`${
              fouceInputNumber === 2 ? 'bg-gray-100' : 'bg-neutral-200'
            } outline-none :focus:outline-none  bg-neutral-200`}
            placeholder="amount"
            key={props.profileKey + 'amount'}
            type="number"
            value={inputAmount}
            min={0}
            onBlur={onAmountBlur}
            onChange={(e) => setInputAmount(e.target.value)}
            onFocus={() => setFouceInputNumber(2)}
          />
          {isPercentMode ? (
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
            {Number(
              utils.formatUnits(
                parsedTokenAmounts[0][index].toString(),
                tokenMetaList[0]?.decimals
              )
            ).toFixed(2)}
          </div>
        ) : null}
      </div>
      {tokenMetaList[1] ? (
        <div className="border border-solid text-gray-500 cursor-not-allowed bg-neutral-200 border-r-0 border-b-0 border-gray-400 flex justify-between items-center px-2 w-60">
          {Number(
            utils.formatUnits(
              parsedTokenAmounts[1][index].toString(),
              tokenMetaList[1]?.decimals
            )
          ).toFixed(2)}
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
