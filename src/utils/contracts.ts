import { ethers } from 'ethers'
import dPoolFactoryABI from '../abis/dPoolFactory.json'

export function createDPoolInterface() {
  return new ethers.utils.Interface(dPoolFactoryABI)
}
