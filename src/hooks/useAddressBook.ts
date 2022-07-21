import { isAddress } from 'ethers/lib/utils'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { AddressBookRow, getBook } from '../stores/addressBook'

export default function useAddressBook() {
  const [addressList, setAddressList] = useState<AddressBookRow[]>([])
  useEffect(() => {
    getBook().then(setAddressList)
  }, [])
  const addressBookMap = useMemo(() => {
    const map = new Map()
    addressList.forEach((row) => map.set(row.address.toLowerCase(), row))
    return map
  }, [addressList])
  const addressName = useCallback(
    (address: string): undefined | string => {
      if (!isAddress(address)) return undefined
      const row = addressBookMap.get(address.toLowerCase())
      if (!row) return
      return row.name
    },
    [addressBookMap]
  )
  return { addressBookMap, addressName } as const
}
