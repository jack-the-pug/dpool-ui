import { format } from 'date-fns'
import { BigNumber, ContractReceipt, ethers } from 'ethers'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'react-toastify'
import Action, { ActionState } from '../../components/action'
import { Dialog } from '../../components/dialog'
import { EosIconsBubbleLoading, ZondiconsClose } from '../../components/icon'
import useDPool from '../../hooks/useDPool'
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
import dPoolABI from '../../abis/dPool.json'
import useDPoolAddress from '../../hooks/useDPoolAddress'
import ApproveTokens, {
  ApproveState,
} from '../../components/token/ApproveTokens'
import { formatCurrencyAmount } from '../../utils/number'
import useAddressBook from '../../hooks/useAddressBook'
import { LOCAL_STORAGE_KEY } from '../../store/storeKey'

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
  callData: readonly PoolCreateCallData[]
  distributionType: DistributionType
}

const { useAccount, useChainId } = metaMaskHooks
const dPoolInterface = new ethers.utils.Interface(dPoolABI)

export default function CreatePoolConfirm(props: CreatePoolConfirmProps) {
  const { visible, setVisible, callData, distributionType, tokenMetaList } =
    props
  const { dPoolAddress } = useDPoolAddress()
  const chainId = useChainId()
  const account = useAccount()
  const dPoolContract = useDPool(dPoolAddress)

  const navigate = useNavigate()

  const [poolIds, setPoolIds] = useState<string[]>([])

  // later mode.
  const [isTokensApproved, setIsTokensApproved] = useState<boolean>(() => {
    return !callData[0][PoolCreator.isFundNow]
  })
  const [createPoolState, setCreatePoolState] = useState<ActionState>(
    ActionState.WAIT
  )
  const [permitCallDataList, setPermitCallDataList] =
    useState<Array<undefined | PermitCallData>>()
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
  const isBalanceEnough = useMemo(() => {
    for (let i = 0; i < tokenTotalAmounts.length; i++) {
      const total = tokenTotalAmounts[i]
      const balance = tokenMetaList[i].balance
      if (balance.lt(total)) return false
    }
    return true
  }, [tokenTotalAmounts, tokenMetaList])

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

  const batchCreate = useCallback(
    async (callData: readonly PoolCreateCallData[]) => {
      console.log('batchCreate')
      if (!dPoolContract || !dPoolAddress) return
      let batchCreateRequest
      if (permitCallDataList) {
        console.log('callData', callData, permitCallDataList)

        batchCreateRequest = await dPoolContract.batchCreateWithPermit(
          callData,
          permitCallDataList.filter((d) => !!d),
          {
            value: nativeTokenValue,
          }
        )
      } else {
        batchCreateRequest = await dPoolContract.batchCreate(callData, {
          value: nativeTokenValue,
        })
      }
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
      return transactionHash
    },
    [
      dPoolContract,
      dPoolAddress,
      setCreatePoolState,
      setPoolIds,
      callData,
      nativeTokenValue,
      permitCallDataList,
    ]
  )
  const singleCreate = useCallback(
    async (callData: PoolCreateCallData): Promise<string | undefined> => {
      console.log('singleCreate')
      if (!dPoolContract || !dPoolAddress) return
      console.log('callData', callData, nativeTokenValue)

      let singleCreateRequest
      if (permitCallDataList && permitCallDataList[0]) {
        singleCreateRequest = await dPoolContract.createWithPermit(
          callData,
          permitCallDataList[0],
          {
            value: nativeTokenValue,
          }
        )
      } else {
        singleCreateRequest = await dPoolContract.create(callData, {
          value: nativeTokenValue,
        })
      }
      const singleCreateResponse: ContractReceipt =
        await singleCreateRequest.wait()
      const { transactionHash, logs: _logs } = singleCreateResponse
      const logs = _logs.filter((log) =>
        BigNumber.from(log.address).eq(dPoolAddress)
      )
      for (let i = 0; i < logs.length; i++) {
        const logJson = dPoolInterface.parseLog(logs[i])
        console.log('logJson', logJson)
        if (logJson.name === DPoolEvent.Created) {
          const poolId = logJson.args['poolId'].toString()
          setPoolIds([poolId])
          return transactionHash
        }
      }
    },
    [
      dPoolContract,
      dPoolAddress,
      nativeTokenValue,
      setPoolIds,
      permitCallDataList,
    ]
  )
  const singleDisperse = useCallback(
    async (callData: PoolCreateCallData) => {
      if (!dPoolContract) return
      let req
      if (BigNumber.from(callData[PoolCreator.Token]).eq(0)) {
        req = await dPoolContract.disperseEther(
          callData[PoolCreator.Claimers],
          callData[PoolCreator.Amounts]
        )
      } else {
        if (permitCallDataList?.[0]) {
          console.log('disperseTokenWithPermit', permitCallDataList[0])
          const { r, s, v, value, token, deadline } = permitCallDataList[0]
          req = await dPoolContract.disperseTokenWithPermit(
            callData[PoolCreator.Token],
            callData[PoolCreator.Claimers],
            callData[PoolCreator.Amounts],
            [token, value, deadline, v, r, s]
          )
        } else {
          req = await dPoolContract.disperseToken(
            callData[PoolCreator.Token],
            callData[PoolCreator.Claimers],
            callData[PoolCreator.Amounts]
          )
        }
      }
      const res: ContractReceipt = await req.wait()
      const { transactionHash } = res
      console.log('transactionHash', transactionHash)
      return transactionHash
    },
    [dPoolContract, permitCallDataList]
  )
  const batchDisperse = useCallback(
    async (callData: readonly PoolCreateCallData[]) => {
      console.log('PoolCreateCallData', callData)
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
      const _permitCallDataList =
        permitCallDataList?.filter((data) => !!data) || []
      console.log({ _callData, _permitCallDataList })
      const batchDisperseRequest = await dPoolContract.batchDisperseWithPermit(
        _callData,
        _permitCallDataList,
        {
          value: nativeTokenValue,
        }
      )
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
    },
    [dPoolContract, dPoolAddress, nativeTokenValue, permitCallDataList]
  )

  const submit = useCallback(async () => {
    if (!poolMeta || !isBalanceEnough) return
    setCreatePoolState(ActionState.ING)
    const poolLength = callData.length

    let tx: string | undefined
    try {
      if (
        poolMeta.config.isFundNow &&
        distributionType === DistributionType.Push
      ) {
        poolLength === 1
          ? (tx = await singleDisperse(callData[0]))
          : (tx = await batchDisperse(callData))
      } else {
        poolLength === 1
          ? (tx = await singleCreate(callData[0]))
          : (tx = await batchCreate(callData))
      }
      if (tx) {
        setCreatePoolState(ActionState.SUCCESS)
        setCreateTx(tx)
      } else {
        throw new Error('transaction not found')
      }
    } catch (err: any) {
      console.error('err', err)
      toast.error(
        `${typeof err === 'object' ? err.message || err.reason : err}`
      )
      setCreatePoolState(ActionState.FAILED)
    }
  }, [
    poolMeta,
    callData,
    batchCreate,
    batchDisperse,
    distributionType,
    singleCreate,
    poolIds,
    isBalanceEnough,
    singleDisperse,
    permitCallDataList,
  ])
  useEffect(() => {
    console.log('poolIds', poolIds)
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
    if (!isBalanceEnough) return false
    return isTokensApproved
  }, [isTokensApproved, account, poolMeta, isBalanceEnough])
  useEffect(() => {
    console.log('poolIds', poolIds)
  }, [poolIds])
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
          <div key={row.address} className="flex gap-4 my-1 justify-between">
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
                  tokenMeta.balance.lt(tokenTotalAmounts[index])
                    ? 'text-red-500'
                    : ''
                }`}
              >
                {formatCurrencyAmount(tokenMeta.balance, tokenMeta)}
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
              distributionType === DistributionType.Pull
                ? `Pool ${poolIds.join(',')} Created`
                : `Distribution Created`,
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
