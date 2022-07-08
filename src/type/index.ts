import { BigNumber } from 'ethers'

export interface PoolRow {
  address: string
  baseTokenAmount: number
  name: string
}

export interface TokenMeta {
  symbol: string
  decimals: number
  address: string
  chainId: number
  balance: BigNumber
}

export enum PoolState {
  None, // Pool is not exist
  Initialized, // unfunded
  Funded, // funded
  Closed, // all done
}

// The create pool params
export enum PoolCreator {
  Name = 0,
  Token = 1,
  Distributor = 2,
  isFundNow = 3,
  Claimers = 4,
  Amounts = 5,
  StartTime = 6,
  EndTime = 7,
}
export type PoolCreateCallData = [
  string, // name
  string, // token
  string, // distributor
  boolean, // escrow
  string[], // claimer
  string[], // amount
  number, // startTime
  number // deadline
]

export interface BasePool {
  amounts: BigNumber[]
  claimers: string[]
  claimedAmount: BigNumber
  totalAmount: BigNumber
  distributor: string
  token: string
  name: string
  owner: string
  startTime: number
  deadline: number
  escrowedAmount: BigNumber
}

export type GetPoolRes = [BasePool, PoolState]

export enum DPoolFactoryEvent {
  DistributionPoolCreated = 'DistributionPoolCreated',
}

export enum DPoolEvent {
  Created = 'Created',
  Cancel = 'Cancel',
  Claimed = 'Claimed',
  Funded = 'Funded',
  Distribute = 'Distribute',
  DisperseToken = 'DisperseToken',
}

export interface DPoolLocalStorageMeta {
  name: string
  poolIds: string[]
  chainId: number
  dPoolAddress: string
  creator: string
}
