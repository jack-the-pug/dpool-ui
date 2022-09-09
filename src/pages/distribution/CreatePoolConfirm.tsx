import { format } from 'date-fns'
import { BigNumber } from 'ethers'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Dialog } from '../../components/dialog'
import { ZondiconsClose } from '../../components/icon'
import {
  ActionState,
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
import { Button } from '../../components/button'
import { AddressLink, TranSactionHash } from '../../components/hash'

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
  onDistributeSuccess: Function
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
    onDistributeSuccess,
  } = props
  const chainId = useChainId()
  const account = useAccount()
  const navigate = useNavigate()
  const callDPool = useCallDPoolContract(dPoolAddress)
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
    },
    [poolMeta, dPoolAddress, chainId, account]
  )

  const createPoolOption = useMemo(() => {
    if (!poolMeta) return

    const sortedCallData = callData.map((data) => {
      data = [...data]
      const claimers = data[PoolCreator.Claimers]
      const amounts = data[PoolCreator.Amounts]
      const claimerAmountList = claimers.map((address, index) => ({
        address,
        amount: BigNumber.from(amounts[index]),
      }))
      claimerAmountList.sort((a, b) =>
        BigNumber.from(a.address).gt(b.address) ? 1 : -1
      )
      data[PoolCreator.Claimers] = claimerAmountList.map((row) => row.address)
      data[PoolCreator.Amounts] = claimerAmountList.map((row) => row.amount)
      return data
    })
    const permitData = permitCallDataList
      .filter((d) => !!d)
      .map((sign) => {
        const { r, s, v, value, token, deadline } = sign!
        return [token, value, deadline, v, r, s]
      })
    if (sortedCallData.length === 1) {
      const token = sortedCallData[0][PoolCreator.Token]
      const claimers = sortedCallData[0][PoolCreator.Claimers]
      const amounts = sortedCallData[0][PoolCreator.Amounts]
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
                sortedCallData[0],
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
                params: [sortedCallData[0], permitData[0]],
                event: DPoolEvent.Created,
              }
            } else {
              return {
                method: 'create',
                params: [sortedCallData[0]],
                event: DPoolEvent.Created,
              }
            }
          }
        }
      } else {
        return {
          method: 'create',
          params: [sortedCallData[0]],
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
                    sortedCallData[0][PoolCreator.Token],
                    sortedCallData[0][PoolCreator.Claimers],
                    sortedCallData[0][PoolCreator.Amounts],
                  ],
                  [
                    sortedCallData[1][PoolCreator.Token],
                    sortedCallData[1][PoolCreator.Claimers],
                    sortedCallData[1][PoolCreator.Amounts],
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
                    sortedCallData[0][PoolCreator.Token],
                    sortedCallData[0][PoolCreator.Claimers],
                    sortedCallData[0][PoolCreator.Amounts],
                  ],
                  [
                    sortedCallData[1][PoolCreator.Token],
                    sortedCallData[1][PoolCreator.Claimers],
                    sortedCallData[1][PoolCreator.Amounts],
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
                sortedCallData,
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
                sortedCallData,
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
          params: [sortedCallData],
          event: DPoolEvent.Created,
        }
      }
    }
  }, [poolMeta, callData, permitCallDataList, nativeTokenValue])

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
  }, [createPoolOption, callDPool])
  useEffect(() => {
    if (createPoolState === ActionState.SUCCESS) {
      localStorage.removeItem(LOCAL_STORAGE_KEY.DISTRIBUTE_CATCH_DATA)
    }
  }, [createPoolState])
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
    // if success. clear table
    if (createPoolState === ActionState.SUCCESS) {
      onDistributeSuccess()
    }
  }, [createPoolState, setVisible, onDistributeSuccess])

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

      <table
        className="border-collapse w-full mt-4"
        style={{ borderSpacing: '20px' }}
      >
        <thead>
          <tr className="border-b border-black border-dotted w-full my-2 bg-gray-100">
            <td className='py-2'>Address</td>
            {tokenMetaList.map((tokenMeta) => (
              <td>
                <AddressLink address={tokenMeta.address} className="text-black">
                  {tokenMeta.symbol}
                </AddressLink>
              </td>
            ))}
          </tr>
        </thead>
        <tbody className="font-mono">
          {renderUIData.map((row) => (
            <tr key={row.address} className="my-2 hover:bg-gray-200">
              {' '}
              <td className="py-2">
                <AddressLink
                  address={row.address}
                  className="text-xs text-gray-500"
                >
                  {row.address}
                </AddressLink>{' '}
                {addressName(row.address) ? (
                  <span className="text-gray-500 italic text-xs">
                    {`(${addressName(row.address)})`}{' '}
                  </span>
                ) : null}
              </td>
              {row.amounts.map((amount, i) => (
                <td key={`${amount}-${i}`} className="py-2">
                  {formatCurrencyAmount(amount, tokenMetaList[i])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="my-2 border-t border-black border-dotted w-full bg-white">
            <td className="text-gray-500">
              Total: {renderUIData.length} Recipient(s)
            </td>
            {tokenTotalAmounts.map((total, index) => (
              <td key={tokenMetaList[index].address} className="py-2">
                {formatCurrencyAmount(total, tokenMetaList[index])}
              </td>
            ))}
          </tr>
          {poolMeta.config.isFundNow ? (
            <tr className="my-2 bg-white">
              <td className="text-gray-500">Balance:</td>
              {tokenMetaList.map((tokenMeta, index) => (
                <td
                  className={`${tokenBalanceList[index] &&
                    tokenBalanceList[index].lt(tokenTotalAmounts[index])
                    ? 'text-red-500'
                    : ''
                    } py-2`}
                  key={tokenMeta.address}
                >
                  {formatCurrencyAmount(
                    tokenBalanceList[index] || BigNumber.from(0),
                    tokenMeta
                  )}
                </td>
              ))}
            </tr>
          ) : null}
        </tfoot>
      </table>

      <div>
        {BigNumber.from(poolMeta.config.distributor).gt(0) &&
          poolMeta.config.distributor.toLowerCase() !== account?.toLowerCase() ? (
          <div className="flex justify-between my-4">
            <div>Distributor:</div>
            <div>{poolMeta.config.distributor}</div>
          </div>
        ) : null}
        {distributionType === DistributionType.Push ? null : (
          <div className="flex justify-between my-4">
            <div>Date Range:</div>
            <div className="flex flex-col text-sm">
              <span className="ml-1 text">
                {format(new Date(poolMeta.config.date[0] * 1000), 'Pp')}
              </span>

              <span className="ml-1">
                {format(new Date(poolMeta.config.date[1] * 1000), 'Pp')}
              </span>
            </div>
          </div>
        )}
      </div>
      <div className="w-full mt-10">
        {createPoolState !== ActionState.SUCCESS ? (
          <div>
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
            <Button
              disable={!submittable}
              loading={createPoolState === ActionState.ING}
              onClick={submit}
              className="mt-2"
            >
              {distributionType === DistributionType.Pull
                ? 'Create Pool'
                : poolMeta!.config.isFundNow
                  ? 'Distribute Now'
                  : 'Create Distribution'}
            </Button>
            <div className="flex justify-center text-gray-500 text-sm my-2">
              <div>Pay {poolMeta.config.isFundNow ? 'Now' : 'Later'}</div>
            </div>
          </div>
        ) : (
          <div className="flex items-center">
            <div className="mr-2">
              {poolIds.length ? (
                <div>
                  {distributionType === DistributionType.Push
                    ? 'Pool'
                    : 'Distribution'}
                  <span
                    className="text-green-500 cursor-pointer mx-1"
                    onClick={routerToPoolDetail}
                  >
                    {poolMeta.name}
                  </span>
                  created.
                </div>
              ) : (
                'Distribute Success.'
              )}
            </div>
            {createTx && (
              <TranSactionHash hash={createTx}>
                View on Explorer
              </TranSactionHash>
            )}
          </div>
        )}
      </div>
    </Dialog>
  )
}
