import { BigNumber } from 'ethers'

export enum ChainId {
  RinkeBy = 4,
  Polygon = 137,
  Mumbai = 800001,
}
export interface PoolRow {
  address: string
  userInputAmount: string
}

export interface TokenMeta {
  symbol: string
  decimals: number
  address: string
  chainId: number
}

export enum ActionState {
  WAIT,
  ING,
  SUCCESS,
  FAILED,
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
  boolean, // isEscrow
  string[], // claimers
  BigNumber[], // amounts
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
  Canceled = 'Canceled',
  Claimed = 'Claimed',
  Funded = 'Funded',
  Distributed = 'Distributed',
  DisperseToken = 'DisperseToken',
}

export interface DPoolLocalStorageMeta {
  name: string
  poolIds: string[]
  chainId: number
  dPoolAddress: string
  creator: string
}

export interface PermitCallData {
  token: string
  value: string
  deadline: number
  v: number
  r: string
  s: string
}
