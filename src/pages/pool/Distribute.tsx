import { useWeb3React } from '@web3-react/core'
import { BigNumber } from 'ethers'
import { useState, useCallback } from 'react'
import { ActionState } from '../../type/index'
import { PoolState, DPoolEvent, TokenMeta } from '../../type'
import { Pool } from './PoolDetail'
import { useCallDPoolContract } from '../../hooks/useContractCall'
import { Button } from '../../components/button'

interface DistributeProps {
  poolMeta: Pool | undefined
  dPoolAddress: string | undefined
  poolId: string
  getPoolDetail: Function
  submittable: boolean
  tokenMeta: TokenMeta | undefined
}
export function Distribute(props: DistributeProps) {
  const {
    poolMeta,
    dPoolAddress,
    submittable,
    poolId,
    getPoolDetail,
    tokenMeta,
  } = props
  if (!tokenMeta || !dPoolAddress || !poolMeta) return null
  const { account, chainId } = useWeb3React()
  const [distributionState, setDistributionState] = useState<ActionState>(
    ActionState.WAIT
  )

  const callDPool = useCallDPoolContract(dPoolAddress)

  const distributePool = useCallback(async () => {
    if (!poolId || !chainId) return
    setDistributionState(ActionState.ING)

    const result = await callDPool(
      'distribute',
      [poolId],
      DPoolEvent.Distributed
    )
    if (!result.success) {
      setDistributionState(ActionState.FAILED)
      return
    }
    setDistributionState(ActionState.SUCCESS)
    if (result.data.logs.length) {
      getPoolDetail()
    }
  }, [callDPool, chainId, poolMeta])
  if (!account) return null
  if (poolMeta.state !== PoolState.Funded) return null
  const distributor = BigNumber.from(poolMeta.distributor)
  if (distributor.eq(0)) return null
  if (account.toLowerCase() !== poolMeta.distributor.toLowerCase()) return null
  return (
    <Button
      disable={!submittable}
      loading={distributionState === ActionState.ING}
      onClick={distributePool}
      className="mt-8"
    >
      Distribute
    </Button>
  )
}
