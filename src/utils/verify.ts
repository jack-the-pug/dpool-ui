import { BigNumber, utils } from 'ethers'
import { PoolRow } from '../type/index'

export function isEmptyObject(obj: { [key: string]: any }): boolean {
  if (Object.keys(obj).length === 0) return true
  for (let key in obj) {
    if (obj[key]) return false
  }
  return true
}

export function isLegalPoolRow(profile: PoolRow): boolean {
  if (!profile) return false
  return profile.parsedTokenAmount.gt(0) && utils.isAddress(profile.address)
}
