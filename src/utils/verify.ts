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
  if (typeof profile.baseTokenAmount !== 'number') return false
  if (profile.baseTokenAmount <= 0) return false
  return utils.isAddress(profile.address)
}
