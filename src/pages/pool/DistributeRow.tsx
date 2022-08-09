import { useWeb3React } from '@web3-react/core'
import { BigNumber, ContractReceipt, ethers } from 'ethers'
import { useState, useCallback, useEffect, useMemo } from 'react'
import { toast } from 'react-toastify'
import { ActionState } from '../../components/action'
import useAddressBook from '../../hooks/useAddressBook'
import { TokenMeta, PoolState, DPoolEvent } from '../../type'
import { formatCurrencyAmount } from '../../utils/number'
import { Pool } from './PoolDetail'
import useDPoolContract from '../../hooks/useDPool'
import dPoolABI from '../../abis/dPool.json'
import RenderActionButton from '../../components/action'
import { useCallDPoolContract } from '../../hooks/useContractCall'

export interface Claimer {
  address: string
  amount: BigNumber
}

interface ClaimProps {
  claimer: Claimer
  poolMeta: Pool | undefined
  dPoolAddress: string | undefined
  tokenMeta: TokenMeta | undefined
  poolId: string
  index: number
}

const contractIface = new ethers.utils.Interface(dPoolABI)

export function DistributeRow(props: ClaimProps) {
  const { account } = useWeb3React()
  const { claimer, index, poolMeta, tokenMeta, poolId, dPoolAddress } = props
  const { addressName } = useAddressBook()
  return (
    <tr key={claimer.address} className="py-2 px-4">
      <td className="text-gray-500 text-center">
        {claimer.address.toLowerCase() === account?.toLowerCase() ? (
          <span className="text-xs text-green-500 bg-green-200 px-2 rounded-md cursor-default">
            ME
          </span>
        ) : (
          index + 1
        )}
      </td>
      <td className="">
        {claimer.address}
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
      />
    </tr>
  )
}

export function RenderClaim(props: ClaimProps) {
  const { claimer, index, poolMeta, dPoolAddress, poolId, tokenMeta } = props
  if (!poolMeta || !dPoolAddress) return null
  const { chainId, account } = useWeb3React()
  const callDPool = useCallDPoolContract(dPoolAddress)
  const [claimState, setClaimState] = useState<ActionState>(ActionState.WAIT)
  const [claimedTx, setClaimedTx] = useState<string>()
  const [shouldClaimAmount, setShouldClaimAmount] = useState<BigNumber>(
    claimer.amount
  )
  const dPoolContract = useDPoolContract(dPoolAddress)
  const getClaimedAmount = useCallback(async () => {
    if (!dPoolContract) return
    if (poolMeta.state === PoolState.Initialized) {
      return claimer.amount
    }
    const claimedAmount = await dPoolContract.userClaimedAmount(
      claimer.address,
      poolId
    )
    const _shouldClaimAmount = claimer.amount.sub(claimedAmount)
    setShouldClaimAmount(_shouldClaimAmount)
  }, [dPoolContract, claimer])

  useEffect(() => {
    getClaimedAmount()
  }, [])

  const claim = useCallback(async () => {
    if (!dPoolContract || !poolId || !chainId) return
    setClaimState(ActionState.ING)
    const result = await callDPool(
      'claimSinglePool',
      [poolId, index],
      DPoolEvent.Claimed
    )
    if (!result.success) {
      setClaimState(ActionState.FAILED)
      return
    }
    const { transactionHash } = result.data
    setClaimedTx(transactionHash)
    setClaimState(ActionState.SUCCESS)
  }, [dPoolContract, chainId, poolId])

  const actionCell = useMemo(() => {
    const { startTime, deadline } = poolMeta
    const nowTime = Date.now() / 1000
    const isClaimer = claimer.address.toLowerCase() === account?.toLowerCase()
    // uint48
    if (poolMeta.state === PoolState.Initialized) return <div>Wait Fund</div>
    if (startTime === 2 ** 48 - 1) return <div>Wait Distribute</div>
    if (nowTime < startTime) return <div>Not Started</div>
    if (shouldClaimAmount.eq(0)) return <div>Received</div>
    if (nowTime >= deadline) return <div>Expired</div>
    if (isClaimer && poolMeta.state === PoolState.Funded) {
      return (
        <RenderActionButton
          state={claimState}
          stateMsgMap={{
            [ActionState.WAIT]: 'Claim',
            [ActionState.ING]: 'Claiming',
            [ActionState.SUCCESS]: 'Claimed',
            [ActionState.FAILED]: 'Claim failed.Try again',
          }}
          tx={claimedTx}
          onClick={() => claim()}
          waitClass="text-gray-200 bg-green-500 border-green-500 text-center rounded-2xl px-2"
        />
      )
    }
    return null
  }, [shouldClaimAmount, poolMeta, claim, claimState, claimedTx])
  return (
    <>
      <td className="font-medium text-lg">
        {formatCurrencyAmount(shouldClaimAmount, tokenMeta)}
      </td>
      <td className="text-gray-400">{actionCell}</td>
    </>
  )
}
