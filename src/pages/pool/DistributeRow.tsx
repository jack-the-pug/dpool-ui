import { useWeb3React } from '@web3-react/core'
import { BigNumber } from 'ethers'
import { useState, useCallback, useEffect, useMemo } from 'react'
import useAddressBook from '../../hooks/useAddressBook'
import { TokenMeta, PoolState } from '../../type'
import { formatCurrencyAmount } from '../../utils/number'
import { Pool } from './PoolDetail'
import { AddressLink, TranSactionHash } from '../../components/hash'
import { MdiArrowTopRight } from '../../components/icon'
import { ActionEvent } from './PoolList'
import { DateDistance } from '../../components/dateDistance'
import { useDPoolContract } from '../../hooks/useContract'

export interface Claimer {
  address: string
  amount: BigNumber
}

interface ClaimProps {
  claimer: Claimer
  poolId: string
  index: number
  claimEvent: ActionEvent | undefined
  poolMeta: Pool | undefined
  dPoolAddress: string | undefined
  tokenMeta: TokenMeta | undefined
  getPoolEvent: Function
  getPoolDetail: Function
  distributeEvent?: ActionEvent
}

export function DistributeRow(props: ClaimProps) {
  const { account } = useWeb3React()
  const {
    claimer,
    index,
    poolMeta,
    tokenMeta,
    poolId,
    dPoolAddress,
    claimEvent,
    getPoolEvent,
    getPoolDetail,
    distributeEvent,
  } = props
  const { addressName } = useAddressBook()
  return (
    <tr key={claimer.address} className={`hover:bg-gray-200 dark:hover:bg-slate-700 ${index % 2 == 0 ? "bg-white dark:bg-slate-900" : "bg-gray-100 dark:bg-slate-800"}`}>
      <td className="text-gray-500 text-center py-2">
        {claimer.address.toLowerCase() === account?.toLowerCase() ? (
          <span className="text-xs text-green-500 bg-green-200 px-2 rounded-md cursor-default">
            ME
          </span>
        ) : (
          index + 1
        )}
      </td>
      <td className="text-sm">
        <AddressLink
          address={claimer.address}
          className="text-xs text-gray-500"
        >
          {claimer.address}
        </AddressLink>
        {addressName(claimer.address) ? (
          <span className="text-sm text-gray-500 px-1">
            ({addressName(claimer.address)})
          </span>
        ) : null}
      </td>
      <RenderClaim
        claimer={claimer}
        index={index}
        poolMeta={poolMeta}
        dPoolAddress={dPoolAddress}
        tokenMeta={tokenMeta}
        poolId={poolId}
        claimEvent={claimEvent}
        getPoolEvent={getPoolEvent}
        getPoolDetail={getPoolDetail}
        distributeEvent={distributeEvent}
      />
    </tr>
  )
}

export function RenderClaim(props: ClaimProps) {
  const {
    claimer,
    poolMeta,
    dPoolAddress,
    poolId,
    tokenMeta,
    claimEvent,
    distributeEvent,
  } = props
  if (!poolMeta || !dPoolAddress) return null

  const [shouldClaimAmount, setShouldClaimAmount] = useState<BigNumber | undefined>()
  const dPoolContract = useDPoolContract(dPoolAddress)

  const getClaimedAmount = useCallback(async () => {
    if (!dPoolContract) return
    const claimedAmount = await dPoolContract.userClaimedAmount(
      claimer.address,
      poolId
    )
    const _shouldClaimAmount = claimer.amount.sub(claimedAmount)
    setShouldClaimAmount(_shouldClaimAmount)
  }, [dPoolContract, claimer, poolId])

  useEffect(() => {
    if (claimEvent) return
    getClaimedAmount()
  }, [getClaimedAmount, claimEvent])

  const actionCell = useMemo(() => {
    if (!shouldClaimAmount) return "loading..."
    const { startTime, deadline, state } = poolMeta
    const nowTime = Date.now() / 1000
    if (distributeEvent) {
      return (
        <div className="flex items-center">
          <span className="mr-1">Distributed</span>
          <DateDistance date={new Date(distributeEvent.timestamp * 1000)} />.
          <TranSactionHash
            hash={distributeEvent.transactionHash}
            className="text-gray-400 flex items-center ml-2"
          >
            TX <MdiArrowTopRight />
          </TranSactionHash>
        </div>
      )
    }
    if (claimEvent)
      return (
        <div className="flex items-center">
          <span className="mr-1"> Claimed</span>
          <DateDistance date={new Date(claimEvent.timestamp * 1000)} />.
          <TranSactionHash
            hash={claimEvent.transactionHash}
            className="text-gray-400 flex items-center ml-2"
          >
            TX <MdiArrowTopRight />
          </TranSactionHash>
        </div>
      )
    if (state === PoolState.Funded && poolMeta.startTime == (2 ** 48 - 1)) return <div>Wait Distribute</div>
    if (state === PoolState.Initialized) return <div>Unfunded</div>
    if (shouldClaimAmount.eq(0)) return <div>Received</div>
    if (startTime !== 2 ** 48 - 1) {
      if (nowTime < startTime) return <div>Not Started</div>
      if (
        nowTime >= deadline ||
        (state === PoolState.Closed && !shouldClaimAmount.eq(0))
      )
        return <div>Expired</div>
    }
    return <div>Unclaimed</div>
  }, [
    shouldClaimAmount,
    poolMeta,
    claimEvent,
    distributeEvent,
  ])
  return (
    <>
      <td className="text-sm" title={formatCurrencyAmount(claimer.amount, tokenMeta, tokenMeta ? tokenMeta.decimals: 4)}>
        {formatCurrencyAmount(claimer.amount, tokenMeta)}
      </td>
      <td className="text-gray-400 text-sm">{actionCell}</td>
    </>
  )
}
