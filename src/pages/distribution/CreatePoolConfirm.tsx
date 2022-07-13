import { format } from 'date-fns'
import { BigNumber, ContractReceipt, ethers, utils } from 'ethers'
import { useCallback, useMemo, useState, useEffect } from 'react'
import { toast } from 'react-toastify'
import Action, { ActionState } from '../../components/action'
import { Dialog } from '../../components/dialog'
import { EosIconsBubbleLoading, ZondiconsClose } from '../../components/icon'
import useDPool from '../../hooks/useDPool'
import {
  DPoolEvent,
  DPoolLocalStorageMeta,
  PoolCreateCallData as PoolCreateCallData,
  PoolCreator,
  PoolRow,
  TokenMeta,
} from '../../type'
import { addKilobits } from '../../utils/number'
import { DistributionType, PoolConfig } from './CreatePool'
import { hooks as metaMaskHooks } from '../../connectors/metaMask'
import { isAddress } from 'ethers/lib/utils'
import { AddressBookItem } from '../addressBook'
import { useNavigate } from 'react-router-dom'
import { dPoolABI } from '../../constants'
import { useApproveToken } from '../../hooks/useApproveToken'
import useDPoolAddress from '../../hooks/useDPoolAddress'
import ApproveToken from './Token/ApproveToken'

type TPoolRow = Omit<
  PoolRow & { secondParsedTokenAmount?: BigNumber },
  'name' | 'userInputAmount'
>

interface PoolMeta {
  name: string
  pool: TPoolRow[]
  length: number
  baseTokenTotal: BigNumber
  secondTokenTotal?: BigNumber
  config: Omit<PoolConfig, 'distributionType'>
}

interface CreatePoolConfirmProps {
  visible: boolean
  setVisible: (v: boolean) => void
  baseTokenMeta: TokenMeta
  secondTokenMeta: TokenMeta | undefined
  callData: readonly PoolCreateCallData[]
  distributionType: DistributionType
}

const { useAccount, useChainId } = metaMaskHooks
const dPoolInterface = new ethers.utils.Interface(dPoolABI)

export default function CreatePoolConfirm(props: CreatePoolConfirmProps) {
  const {
    visible,
    setVisible,
    baseTokenMeta,
    callData,
    secondTokenMeta,
    distributionType,
  } = props
  const { dPoolAddress } = useDPoolAddress()
  const chainId = useChainId()
  const account = useAccount()
  const dPoolContract = useDPool(dPoolAddress)

  const navigate = useNavigate()

  const [poolIds, setPoolIds] = useState<string[]>([])

  const [createPoolState, setCreatePoolState] = useState<ActionState>(
    ActionState.WAIT
  )
  const [createTx, setCreateTx] = useState<string>()

  const addressBook = useMemo(() => {
    const localAddress = localStorage.getItem('ADDRESS_BOOK') || '{}'
    return JSON.parse(localAddress)
  }, [])
  const getAddressName = useCallback(
    (address: string): string | null => {
      if (!address || !isAddress(address)) return null
      const lowerAddress = address.toLowerCase()
      const addressMeta: AddressBookItem = addressBook[lowerAddress]
      return addressMeta ? addressMeta.name : null
    },
    [addressBook]
  )

  const poolMeta = useMemo((): PoolMeta | null => {
    if (!callData) return null
    const baseCallData = callData[0]
    const claimers = baseCallData[PoolCreator.Claimers]
    const len = claimers.length
    const poolMeta: PoolMeta = {
      name: baseCallData[PoolCreator.Name],
      pool: [],
      length: len,
      baseTokenTotal: BigNumber.from(0),
      config: {
        isFundNow: baseCallData[PoolCreator.isFundNow],
        date: [
          baseCallData[PoolCreator.StartTime],
          baseCallData[PoolCreator.EndTime],
        ],
        distributor: baseCallData[PoolCreator.Distributor],
      },
    }
    const amounts = baseCallData[PoolCreator.Amounts]
    poolMeta.baseTokenTotal = amounts.reduce(
      (sum, cur) => sum.add(BigNumber.from(cur)),
      BigNumber.from(0)
    )

    const _pool: TPoolRow[] = []
    for (let i = 0; i < len; i++) {
      const row: TPoolRow = {
        address: claimers[i],
        parsedTokenAmount: amounts[i],
      }
      _pool.push(row)
    }
    if (secondTokenMeta) {
      const secondCallData = callData[1]
      const amounts = secondCallData[PoolCreator.Amounts]
      poolMeta.secondTokenTotal = amounts.reduce(
        (sum, cur) => sum.add(cur),
        BigNumber.from(0)
      )
      _pool.forEach(
        (row, index) => (row.secondParsedTokenAmount = amounts[index])
      )
    }

    poolMeta.pool = _pool
    return poolMeta
  }, [callData, baseTokenMeta, secondTokenMeta])

  const nativeTokenValue = useMemo((): string => {
    if (!poolMeta) return '0'
    // fund later.
    if (
      !poolMeta.config.isFundNow &&
      distributionType === DistributionType.Push
    )
      return '0'
    let value = BigNumber.from(0)
    if (BigNumber.from(baseTokenMeta.address).eq(0)) {
      value = value.add(poolMeta.baseTokenTotal)
    }
    if (secondTokenMeta && BigNumber.from(secondTokenMeta.address).eq(0)) {
      value = value.add(poolMeta.secondTokenTotal || BigNumber.from(0))
    }
    return value.toString()
  }, [poolMeta, baseTokenMeta, secondTokenMeta])

  const [baseTokenApproveState, setBaseTokenApproveState] =
    useState<ActionState>(ActionState.WAIT)
  const [secondTokenApproveState, setSecondTokenApproveState] =
    useState<ActionState>(ActionState.WAIT)

  const onCreateSuccess = useCallback(
    (ids: string[]) => {
      if (!poolMeta || !chainId || !account || !dPoolAddress) return

      const localPoolMeta: DPoolLocalStorageMeta = {
        name: poolMeta.name,
        creator: account,
        dPoolAddress,
        chainId,
        poolIds: ids,
      }

      const localPoolMetaList = JSON.parse(
        localStorage.getItem('localPoolMetaList') || '[]'
      )
      localPoolMetaList.push(localPoolMeta)
      localStorage.setItem(
        'localPoolMetaList',
        JSON.stringify(localPoolMetaList)
      )
    },
    [poolMeta, dPoolAddress, chainId, account]
  )

  const batchCreate = useCallback(
    async (callData: readonly PoolCreateCallData[]) => {
      if (!dPoolContract || !dPoolAddress) return
      const batchCreateRequest = await dPoolContract.batchCreate(callData, {
        value: nativeTokenValue,
      })
      const batchCreateResponse: ContractReceipt =
        await batchCreateRequest.wait()
      const { transactionHash, logs: _logs } = batchCreateResponse
      const logs = _logs.filter((log) =>
        BigNumber.from(log.address).eq(dPoolAddress)
      )
      const poolIds: string[] = []
      for (let i = 0; i < logs.length; i++) {
        const logJson = dPoolInterface.parseLog(logs[i])

        if (logJson.name === DPoolEvent.Created) {
          poolIds.push(logJson.args['poolId'].toString())
        }
      }

      setPoolIds(poolIds)
      onCreateSuccess(poolIds)
      return transactionHash
    },
    [
      dPoolContract,
      dPoolAddress,
      setCreatePoolState,
      setPoolIds,
      callData,
      nativeTokenValue,
    ]
  )

  const singleCreate = useCallback(
    async (callData: PoolCreateCallData): Promise<string | undefined> => {
      if (!dPoolContract || !dPoolAddress) return
      const singleCreateRequest = await dPoolContract.create(callData, {
        value: nativeTokenValue,
      })
      const singleCreateResponse: ContractReceipt =
        await singleCreateRequest.wait()
      const { transactionHash, logs: _logs } = singleCreateResponse
      const logs = _logs.filter((log) =>
        BigNumber.from(log.address).eq(dPoolAddress)
      )
      for (let i = 0; i < logs.length; i++) {
        const logJson = dPoolInterface.parseLog(logs[i])

        if (logJson.name === DPoolEvent.Created) {
          const poolId = logJson.args['poolId'].toString()

          setPoolIds([poolId])
          onCreateSuccess([poolId])
          return transactionHash
        }
      }
    },
    [dPoolContract, dPoolAddress, nativeTokenValue, setPoolIds]
  )

  const batchDisperse = useCallback(async () => {
    if (!dPoolContract || !dPoolAddress) return
    const _callData = callData.map((pool) => {
      const token = pool[PoolCreator.Token]
      const amounts = pool[PoolCreator.Amounts]
      const claimer = pool[PoolCreator.Claimers]
      return {
        token,
        recipients: claimer,
        values: amounts,
      }
    })

    const batchDisperseRequest = await dPoolContract.batchDisperse(_callData, {
      value: nativeTokenValue,
    })
    const batchDisperseResponse: ContractReceipt =
      await batchDisperseRequest.wait()

    const { transactionHash, logs: _logs } = batchDisperseResponse
    const logs = _logs.filter((log) =>
      BigNumber.from(log.address).eq(dPoolAddress)
    )
    for (let i = 0; i < logs.length; i++) {
      const logJson = dPoolInterface.parseLog(logs[i])
      if (logJson.name === DPoolEvent.DisperseToken) {
        return transactionHash
      }
    }
  }, [dPoolContract, dPoolAddress, callData, nativeTokenValue])

  const submit = useCallback(async () => {
    if (!poolMeta) return
    setCreatePoolState(ActionState.ING)
    const poolLength = callData.length
    let tx: string | undefined
    try {
      if (
        distributionType === DistributionType.Push &&
        poolMeta.config.isFundNow
      ) {
        tx = await batchDisperse()
      } else {
        poolLength === 1
          ? (tx = await singleCreate(callData[0]))
          : (tx = await batchCreate(callData))
      }
      if (tx) {
        setCreatePoolState(ActionState.SUCCESS)
        setCreateTx(tx)
      }
    } catch (err: any) {
      toast.error(
        `${typeof err === 'object' ? err.reason || JSON.stringify(err) : err}`
      )
      setCreatePoolState(ActionState.FAILED)
    }
  }, [
    poolMeta,
    callData,
    batchCreate,
    batchDisperse,
    distributionType,
    onCreateSuccess,
    singleCreate,
    poolIds,
  ])

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

  useEffect(() => {
    if (!account) return
    if (poolMeta?.config.distributor.toLowerCase() !== account.toLowerCase()) {
      setBaseTokenApproveState(ActionState.SUCCESS)
      setSecondTokenApproveState(ActionState.SUCCESS)
    }
  }, [account, poolMeta])

  function CreateAction() {
    const waitApproved = (
      <div className="flex items-center">
        <EosIconsBubbleLoading className="mr-1" />
        Waiting for approval
      </div>
    )

    if (baseTokenApproveState !== ActionState.SUCCESS) {
      return waitApproved
    }
    if (secondTokenMeta && secondTokenApproveState !== ActionState.SUCCESS) {
      return waitApproved
    }
    return (
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
            distributionType === DistributionType.Pull
              ? `Pool ${poolIds.join(',')} Created`
              : `Distribution Success`,
        }}
        tx={createTx}
        onClick={submit}
        onSuccess={routerToPoolDetail}
        successClass="w-full"
        failedClass="w-full"
      ></Action>
    )
  }
  if (!poolMeta || !poolMeta.pool.length) return null
  return (
    <Dialog visible={visible} onClose={onClosePage}>
      <h1 className="flex justify-between items-center">
        <span></span>
        <div className="font-medium font-xl">{poolMeta.name}</div>
        <ZondiconsClose onClick={onClosePage} className="cursor-pointer" />
      </h1>

      <div className="border-b border-black border-dotted w-full my-2"></div>
      <div className="font-mono">
        <div>
          {poolMeta?.pool.map((row, index) => (
            <div
              key={row.address + index}
              className={`grid ${
                secondTokenMeta ? 'grid-cols-4' : 'grid-cols-3'
              } gap-4 my-4 justify-between`}
            >
              <div className="col-span-2 flex items-center">
                {row.address}{' '}
                {getAddressName(row.address) ? (
                  <div className="text-xs font-thin italic text-gray-500">
                    {`(${getAddressName(row.address)})`}
                  </div>
                ) : null}
              </div>
              <div className="flex-1 flex justify-end">
                <div className="flex-1 flex justify-end">
                  {utils.formatUnits(
                    row.parsedTokenAmount,
                    baseTokenMeta.decimals
                  )}
                </div>
                <div className="w-16"></div>
              </div>
              {row.secondParsedTokenAmount && (
                <div className="text-right flex">
                  <div className="flex-1">
                    {utils.formatUnits(
                      row.secondParsedTokenAmount,
                      baseTokenMeta.decimals
                    )}
                  </div>
                  <div className="w-16"></div>
                </div>
              )}
            </div>
          ))}
        </div>
        <div className=" border-b border-black border-dotted w-full my-2"></div>
        <div
          className={`grid ${
            secondTokenMeta ? 'grid-cols-4' : 'grid-cols-3'
          } gap-4 w-full  my-4 justify-between items-center`}
        >
          <div className="flex items-center col-span-2">
            Total: <span>{poolMeta.length} Recipient(s)</span>
          </div>

          <div className="flex-1 flex justify-end">
            <div className="flex-1 flex justify-end">
              {addKilobits(
                parseFloat(
                  utils.formatUnits(
                    poolMeta.baseTokenTotal,
                    baseTokenMeta.decimals
                  )
                ),
                3
              )}
            </div>
            <div className="w-16 text-left pl-2 text-gray-500 italic">
              {baseTokenMeta.symbol}
            </div>
          </div>
          {poolMeta.secondTokenTotal && secondTokenMeta && (
            <div className="text-right flex">
              <div className="flex-1">
                {addKilobits(
                  parseFloat(
                    utils.formatUnits(
                      poolMeta.secondTokenTotal,
                      secondTokenMeta.decimals
                    )
                  ),
                  3
                )}
              </div>
              <div className="w-16 text-left pl-2 text-gray-500 italic">
                {secondTokenMeta.symbol}
              </div>
            </div>
          )}
        </div>
      </div>
      <div
        className={`grid ${
          secondTokenMeta ? 'grid-cols-4' : 'grid-cols-3'
        } gap-4 w-full  my-4 justify-between items-center`}
      >
        <div className="flex items-center col-span-2">Balance</div>

        <div className="flex-1 flex justify-end">
          <div className="flex-1 flex justify-end">
            {addKilobits(
              parseFloat(
                utils.formatUnits(baseTokenMeta.balance, baseTokenMeta.decimals)
              ),
              3
            )}
          </div>
          <div className="w-16 text-left pl-2 text-gray-500 italic">
            {baseTokenMeta.symbol}
          </div>
        </div>
        {poolMeta.secondTokenTotal && secondTokenMeta && (
          <div className="text-right flex">
            <div className="flex-1">
              {addKilobits(
                parseFloat(
                  utils.formatUnits(
                    secondTokenMeta.balance,
                    secondTokenMeta.decimals
                  )
                ),
                3
              )}
            </div>
            <div className="w-16 text-left pl-2 text-gray-500 italic">
              {secondTokenMeta.symbol}
            </div>
          </div>
        )}
      </div>
      <div className="">
        {poolMeta.config.distributor.toLowerCase() !==
        account?.toLowerCase() ? (
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

      {poolMeta.config.distributor.toLowerCase() === account?.toLowerCase() ? (
        <div className="flex justify-between mb-2 mt-6">
          <div className="flex">
            <div className="ml-1 flex flex-col gap-2 ">
              {/* exclude native token */}
              {dPoolAddress ? (
                <ApproveToken
                  dPoolAddress={dPoolAddress}
                  tokenAddress={baseTokenMeta.address}
                  approveState={baseTokenApproveState}
                  setApproveState={setBaseTokenApproveState}
                  approveAmount={poolMeta.baseTokenTotal}
                />
              ) : null}
              {secondTokenMeta && dPoolAddress ? (
                <ApproveToken
                  dPoolAddress={dPoolAddress}
                  tokenAddress={secondTokenMeta.address}
                  approveState={secondTokenApproveState}
                  setApproveState={setSecondTokenApproveState}
                  approveAmount={poolMeta.secondTokenTotal!}
                />
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
      <div className="flex flex-col justify-between mt-12">
        <CreateAction />
        <div className="flex justify-center text-gray-500 text-sm my-2">
          <div>Pay {poolMeta.config.isFundNow ? 'Now' : 'Later'}</div>
        </div>
      </div>
    </Dialog>
  )
}
