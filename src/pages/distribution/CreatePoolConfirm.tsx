import { format } from 'date-fns'
import { BigNumber } from 'ethers'
import { useCallback, useEffect, useMemo, useState } from 'react'
import Action, { ActionState } from '../../components/action'
import { Dialog } from '../../components/dialog'
import { ZondiconsClose } from '../../components/icon'
import {
  DPoolEvent,
  PermitCallData,
  PoolCreateCallData as PoolCreateCallData,
  PoolCreator,
  TokenMeta,
} from '../../type'
import { DistributionType, PoolConfig } from './CreatePool'
import { hooks as metaMaskHooks } from '../../connectors/metaMask'
import { useNavigate } from 'react-router-dom'
import ApproveTokens, {
  ApproveState,
} from '../../components/token/ApproveTokens'
import { formatCurrencyAmount } from '../../utils/number'
import useAddressBook from '../../hooks/useAddressBook'
import { LOCAL_STORAGE_KEY } from '../../store/storeKey'
import { useCallDPoolContract } from '../../hooks/useContractCall'
import { LogDescription } from 'ethers/lib/utils'

interface PoolMeta {
  name: string
  claimers: string[]
  length: number
  config: Omit<PoolConfig, 'distributionType'>
}
interface UIDataRow {
  address: string
  amounts: BigNumber[]
}

interface CreatePoolConfirmProps {
  visible: boolean
  setVisible: (v: boolean) => void
  tokenMetaList: TokenMeta[]
  tokenBalanceList: BigNumber[]
  isTokenBalanceEnough: boolean
  callData: readonly PoolCreateCallData[]
  dPoolAddress: string
  distributionType: DistributionType
}

const { useAccount, useChainId } = metaMaskHooks

export default function CreatePoolConfirm(props: CreatePoolConfirmProps) {
  const {
    visible,
    setVisible,
    callData,
    distributionType,
    tokenMetaList,
    tokenBalanceList,
    isTokenBalanceEnough,
    dPoolAddress,
  } = props
  const chainId = useChainId()
  const account = useAccount()
  const navigate = useNavigate()
  const [poolIds, setPoolIds] = useState<string[]>([])
  // later mode.
  const [isTokensApproved, setIsTokensApproved] = useState<boolean>(() => {
    return !callData[0][PoolCreator.isFundNow]
  })
  const [createPoolState, setCreatePoolState] = useState<ActionState>(
    ActionState.WAIT
  )
  const [permitCallDataList, setPermitCallDataList] = useState<
    Array<undefined | PermitCallData>
  >([])
  const [createTx, setCreateTx] = useState<string>()
  const { addressName } = useAddressBook()

  const poolMeta = useMemo((): PoolMeta | null => {
    if (!callData) return null
    const baseCallData = callData[0]
    const claimers = baseCallData[PoolCreator.Claimers]
    const len = claimers.length
    const poolMeta: PoolMeta = {
      name: baseCallData[PoolCreator.Name],
      claimers,
      length: len,
      config: {
        isFundNow: baseCallData[PoolCreator.isFundNow],
        date: [
          baseCallData[PoolCreator.StartTime],
          baseCallData[PoolCreator.EndTime],
        ],
        distributor: baseCallData[PoolCreator.Distributor],
      },
    }
    return poolMeta
  }, [callData])

  const tokenTotalAmounts = useMemo(() => {
    const totalAmount: BigNumber[] = []
    callData.forEach((data) =>
      totalAmount.push(
        data[PoolCreator.Amounts].reduce(
          (sum, cur) => sum.add(cur),
          BigNumber.from(0)
        )
      )
    )
    return totalAmount
  }, [callData])

  const nativeTokenValue = useMemo((): string => {
    if (!poolMeta) return '0'
    // fund later.
    if (
      !poolMeta.config.isFundNow &&
      distributionType === DistributionType.Push
    )
      return '0'

    return tokenMetaList
      .reduce(
        (sum, token, index) =>
          BigNumber.from(token.address).eq(0)
            ? sum.add(tokenTotalAmounts[index])
            : sum,
        BigNumber.from(0)
      )
      .toString()
  }, [poolMeta, tokenMetaList])

  const renderUIData = useMemo((): UIDataRow[] => {
    if (!poolMeta) return []
    // table list
    return poolMeta.claimers.map((address, row) => ({
      address,
      amounts: callData.map((pool) => pool[PoolCreator.Amounts][row]),
    }))
  }, [poolMeta, tokenMetaList, callData])

  const onCreateSuccess = useCallback(
    (ids: string[]) => {
      if (!poolMeta || !chainId || !account || !dPoolAddress) return
      const localPoolMeta = {
        name: poolMeta.name,
        creator: account,
        dPoolAddress,
        chainId,
        poolIds: ids,
      }
      const localPoolMetaList = JSON.parse(
        localStorage.getItem(LOCAL_STORAGE_KEY.LOCAL_POOL_META_LIST) || '[]'
      )
      localPoolMetaList.push(localPoolMeta)
      localStorage.setItem(
        LOCAL_STORAGE_KEY.LOCAL_POOL_META_LIST,
        JSON.stringify(localPoolMetaList)
      )
      localStorage.removeItem(LOCAL_STORAGE_KEY.DISTRIBUTE_CATCH_DATA)
    },
    [poolMeta, dPoolAddress, chainId, account]
  )

  const createPoolOption = useMemo(() => {
    if (!poolMeta) return
    const permitData = permitCallDataList
      .filter((d) => !!d)
      .map((sign) => {
        const { r, s, v, value, token, deadline } = sign!
        return [token, value, deadline, v, r, s]
      })
    if (callData.length === 1) {
      const token = callData[0][PoolCreator.Token]
      const claimers = callData[0][PoolCreator.Claimers]
      const amounts = callData[0][PoolCreator.Amounts]
      const isEther = BigNumber.from(token).eq(0)
      if (poolMeta.config.isFundNow) {
        if (distributionType === DistributionType.Push) {
          if (isEther) {
            return {
              method: 'disperseEther',
              params: [
                claimers,
                amounts,
                {
                  value: nativeTokenValue,
                },
              ],
              event: DPoolEvent.DisperseToken,
            }
          } else {
            if (permitData.length) {
              return {
                method: 'disperseTokenWithPermit',
                params: [token, claimers, amounts, permitData[0]],
                event: DPoolEvent.DisperseToken,
              }
            } else {
              return {
                method: 'disperseToken',
                params: [token, claimers, amounts],
                event: DPoolEvent.DisperseToken,
              }
            }
          }
        } else {
          if (isEther) {
            return {
              method: 'create',
              params: [
                callData[0],
                {
                  value: nativeTokenValue,
                },
              ],
              event: DPoolEvent.Created,
            }
          } else {
            if (permitData.length) {
              return {
                method: 'createWithPermit',
                params: [callData[0], permitData[0]],
                event: DPoolEvent.Created,
              }
            } else {
              return {
                method: 'create',
                params: [callData[0]],
                event: DPoolEvent.Created,
              }
            }
          }
        }
      } else {
        return {
          method: 'create',
          params: [callData[0]],
          event: DPoolEvent.Created,
        }
      }
    } else {
      if (poolMeta.config.isFundNow) {
        if (distributionType === DistributionType.Push) {
          if (permitData.length) {
            return {
              method: 'batchDisperseWithPermit',
              params: [
                [
                  [
                    callData[0][PoolCreator.Token],
                    callData[0][PoolCreator.Claimers],
                    callData[0][PoolCreator.Amounts],
                  ],
                  [
                    callData[1][PoolCreator.Token],
                    callData[1][PoolCreator.Claimers],
                    callData[1][PoolCreator.Amounts],
                  ],
                ],
                permitData,
                {
                  value: nativeTokenValue,
                },
              ],
              event: DPoolEvent.DisperseToken,
            }
          } else {
            return {
              method: 'batchDisperse',
              params: [
                [
                  [
                    callData[0][PoolCreator.Token],
                    callData[0][PoolCreator.Claimers],
                    callData[0][PoolCreator.Amounts],
                  ],
                  [
                    callData[1][PoolCreator.Token],
                    callData[1][PoolCreator.Claimers],
                    callData[1][PoolCreator.Amounts],
                  ],
                ],
                {
                  value: nativeTokenValue,
                },
              ],
              event: DPoolEvent.DisperseToken,
            }
          }
        } else {
          if (permitData.length) {
            return {
              method: 'batchCreateWithPermit',
              params: [
                callData,
                permitData,
                {
                  value: nativeTokenValue,
                },
              ],
              event: DPoolEvent.Created,
            }
          } else {
            return {
              method: 'batchCreate',
              params: [
                callData,
                {
                  value: nativeTokenValue,
                },
              ],
              event: DPoolEvent.Created,
            }
          }
        }
      } else {
        return {
          method: 'batchCreate',
          params: [callData],
          event: DPoolEvent.Created,
        }
      }
    }
  }, [poolMeta, callData, permitCallDataList, nativeTokenValue])

  const callDPool = useCallDPoolContract(dPoolAddress)
  const submit = useCallback(async () => {
    if (!createPoolOption) return
    setCreatePoolState(ActionState.ING)
    const result = await callDPool(
      createPoolOption.method,
      createPoolOption.params,
      createPoolOption.event
    )
    if (!result.success) {
      setCreatePoolState(ActionState.FAILED)
      return
    }
    const { transactionHash, logs } = result.data

    setCreateTx(transactionHash)
    const ids: string[] = []
    logs.forEach((log) => {
      const { name, args } = log as LogDescription
      if (name === DPoolEvent.Created) {
        ids.push(args['poolId'].toString())
      }
    })
    if (ids.length) {
      setPoolIds(ids)
    }
    setCreatePoolState(ActionState.SUCCESS)
  }, [createPoolOption])

  useEffect(() => {
    if (!poolIds || poolIds.length === 0) return
    onCreateSuccess(poolIds)
  }, [poolIds])
  const routerToPoolDetail = useCallback(() => {
    if (
      distributionType === DistributionType.Push &&
      poolMeta?.config.isFundNow
    )
      return
    const path = `/distributions/${poolIds.join(',')}`
    navigate(path)
  }, [poolIds, distributionType, poolMeta])

  const onClosePage = useCallback(() => {
    if (createPoolState !== ActionState.ING) {
      setVisible(false)
    }
  }, [createPoolState, setVisible])

  const onTokensApproved = useCallback((state: ApproveState[]) => {
    setIsTokensApproved(true)
    const signatureData = state.map((state) => state.signatureData)
    setPermitCallDataList(signatureData)
  }, [])
  const submittable = useMemo(() => {
    if (!poolMeta?.config.isFundNow) return true
    if (!isTokenBalanceEnough) return false
    return isTokensApproved
  }, [isTokensApproved, account, poolMeta, isTokenBalanceEnough])
  if (!poolMeta || !poolMeta.length) return null
  return (
    <Dialog visible={visible} onClose={onClosePage}>
      <h1 className="flex justify-between items-center cur">
        <span></span>
        <div className="font-medium font-xl">{poolMeta.name}</div>
        <ZondiconsClose onClick={onClosePage} className="cursor-pointer" />
      </h1>
      <div className="border-b border-black border-dotted w-full my-2"></div>
      <div className="font-mono">
        {renderUIData.map((row) => (
          <div key={row.address} className="flex gap-8 my-1 justify-between">
            <div className="">
              {row.address}{' '}
              {addressName(row.address) ? (
                <span className="text-gray-500 italic text-xs">
                  {`(${addressName(row.address)})`}{' '}
                </span>
              ) : null}
            </div>
            <div className="flex gap-2">
              {row.amounts.map((amount, i) => (
                <div key={`${amount}-${i}`} className="flex">
                  <div className="text-right flex-1">
                    {' '}
                    {formatCurrencyAmount(amount, tokenMetaList[i])}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="border-b border-black border-dotted w-full my-2"></div>
      <div className="flex justify-between my-2">
        <div className="flex">
          Total: <div>{renderUIData.length} Recipient(s)</div>
        </div>
        <div className="flex gap-2">
          {tokenTotalAmounts.map((total, index) => (
            <div key={tokenMetaList[index].address} className="flex">
              <div className="text-right flex-1">
                {formatCurrencyAmount(total, tokenMetaList[index])}
              </div>
              <div className="ml-1 text-gray-500">
                {tokenMetaList[index].symbol}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="flex justify-between my-2">
        <div>Balance</div>
        <div className="flex gap-2">
          {tokenMetaList.map((tokenMeta, index) => (
            <div className="flex" key={tokenMeta.address}>
              <div
                className={`${
                  tokenBalanceList[index] &&
                  tokenBalanceList[index].lt(tokenTotalAmounts[index])
                    ? 'text-red-500'
                    : ''
                }`}
              >
                {formatCurrencyAmount(
                  tokenBalanceList[index] || BigNumber.from(0),
                  tokenMeta
                )}
              </div>
              <div className="ml-1 text-gray-500">{tokenMeta.symbol}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="">
        {BigNumber.from(poolMeta.config.distributor).gt(0) &&
        poolMeta.config.distributor.toLowerCase() !== account?.toLowerCase() ? (
          <div className="flex justify-between my-4">
            <div>Distributor</div>
            <div>{poolMeta.config.distributor}</div>
          </div>
        ) : null}
        {distributionType === DistributionType.Push ? null : (
          <div className="flex justify-between my-4">
            <div>Date Range</div>
            <div className="flex flex-col">
              <div className="grid grid-cols-2 ">
                <span className="text-right"></span>
                <span className="ml-1">
                  {format(new Date(poolMeta.config.date[0] * 1000), 'Pp')}
                </span>
              </div>
              <div className="grid grid-cols-2">
                <span className="text-right"></span>
                <span className="ml-1">
                  {format(new Date(poolMeta.config.date[1] * 1000), 'Pp')}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
      {poolMeta.config.isFundNow ? (
        <div className="mt-4">
          <ApproveTokens
            tokens={tokenMetaList.map((token, index) => ({
              address: token.address,
              amount: tokenTotalAmounts[index],
            }))}
            onTokensApproved={onTokensApproved}
          />
        </div>
      ) : null}
      <div className="flex flex-col justify-between mt-6">
        <Action
          state={createPoolState}
          stateMsgMap={{
            [ActionState.WAIT]:
              distributionType === DistributionType.Pull
                ? 'Create Pool'
                : poolMeta!.config.isFundNow
                ? 'Distribute Now'
                : 'Create Distribution',
            [ActionState.ING]:
              distributionType === DistributionType.Pull ||
              !poolMeta!.config.isFundNow
                ? 'Creating'
                : 'Distributing',
            [ActionState.FAILED]: 'Failed. Try Again',
            [ActionState.SUCCESS]:
              poolMeta.config.isFundNow &&
              distributionType === DistributionType.Push
                ? `Distribution Created`
                : `Pool ${poolIds.join(',')} Created`,
          }}
          tx={createTx}
          onClick={submittable ? submit : () => {}}
          onSuccess={routerToPoolDetail}
          waitClass={
            submittable ? 'text-black' : 'text-gray-500 cursor-not-allowed'
          }
          successClass="w-full"
        ></Action>
        <div className="flex justify-center text-gray-500 text-sm my-2">
          <div>Pay {poolMeta.config.isFundNow ? 'Now' : 'Later'}</div>
        </div>
      </div>
    </Dialog>
  )
}
