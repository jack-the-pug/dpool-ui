import { BigNumber, utils } from 'ethers'
import { PoolRow } from '../type/index'

export function isEmptyObject(obj: { [key: string]: any }): boolean {
  if (Object.keys(obj).length === 0) return true
  for (let key in obj) {
    if (obj[key]) return false
  }
  return true
}

export function parsed2NumberString(
  str: string | number | null | undefined
): string {
  if (!str) return '0'
  const parsedNumber = Number(str)
  return isNaN(parsedNumber) ? '0' : parsedNumber.toString()
}

export function isLegalPoolRow(profile: PoolRow): boolean {
  if (!profile) return false
  const amount = profile.userInputAmount
  const numberAmount = Number(amount)
  if (!amount || isNaN(numberAmount) || numberAmount <= 0) return false
  return utils.isAddress(profile.address)
}
