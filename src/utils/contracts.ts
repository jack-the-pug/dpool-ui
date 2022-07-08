import { ethers } from 'ethers'
import { dPoolFactoryABI } from '../constants'

export function createDPoolInterface() {
  return new ethers.utils.Interface(dPoolFactoryABI)
}
