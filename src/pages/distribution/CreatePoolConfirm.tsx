import { format } from 'date-fns'
import { BigNumber, ContractReceipt, ethers, utils } from 'ethers'
import { useCallback, useMemo, useState } from 'react'
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
import { DistributionType, PoolConfig } from './CreatePool'
import { hooks as metaMaskHooks } from '../../connectors/metaMask'
import { isAddress } from 'ethers/lib/utils'
import { AddressBookItem } from '../addressBook'
import { useNavigate } from 'react-router-dom'
import { dPoolABI } from '../../constants'
import useDPoolAddress from '../../hooks/useDPoolAddress'
import ApproveTokens from '../../components/token/ApproveTokens'

type TPoolRow = Omit<
  PoolRow & { secondParsedTokenAmount?: BigNumber },
  'name' | 'userInputAmount'
>

interface PoolMeta {
  name: string
  claimers: string[]
  length: number
  config: Omit<PoolConfig, 'distributionType'>
}
interface UIDataRow {
  address: string
  amounts: string[]
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

  const [isTokensApproved, setIsTokensApproved] = useState<boolean>(false)
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
      amounts: callData.map((pool, poolIndex) =>
        utils.formatUnits(
          pool[PoolCreator.Amounts][row],
          tokenMetaList[poolIndex].decimals
        )
      ),
    }))
  }, [poolMeta, tokenMetaList, callData])

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

  function CreateAction() {
    const waitApproved = (
      <div className="flex items-center">
        <EosIconsBubbleLoading className="mr-1" />
        Waiting for approval
      </div>
    )
    if (!isTokensApproved) return waitApproved
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
  if (!poolMeta || !poolMeta.length) return null
  return (
    <Dialog visible={visible} onClose={onClosePage}>
      <h1 className="flex justify-between items-center">
        <span></span>
        <div className="font-medium font-xl">{poolMeta.name}</div>
        <ZondiconsClose onClick={onClosePage} className="cursor-pointer" />
      </h1>

      <div className="border-b border-black border-dotted w-full my-2"></div>

      <div className="font-mono">
        {renderUIData.map((row) => (
          <div className="flex gap-4 my-1 justify-between">
            <div key={row.address} className="">
              {row.address}{' '}
              <span className="text-gray-500 italic text-xs">{`(${getAddressName(
                row.address
              )})`}</span>
            </div>
            <div className="flex gap-2">
              {row.amounts.map((amount, i) => (
                <div key={`${amount}-${i}`} className="flex">
                  <div className="text-right flex-1"> {amount}</div>
                  <span className="opacity-0 ml-1">
                    {tokenMetaList[i].symbol}
                  </span>
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
                {utils.formatUnits(total, tokenMetaList[index].decimals)}
              </div>
              <span className="ml-1 text-gray-500">
                {tokenMetaList[index].symbol}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="">
        {poolMeta.config.distributor &&
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
      <div className="mt-4">
        <ApproveTokens
          tokens={tokenMetaList.map((token, index) => ({
            address: token.address,
            amount: tokenTotalAmounts[index],
          }))}
          setIsTokensApproved={setIsTokensApproved}
        />
      </div>
      <div className="flex flex-col justify-between mt-6">
        <CreateAction />
        <div className="flex justify-center text-gray-500 text-sm my-2">
          <div>Pay {poolMeta.config.isFundNow ? 'Now' : 'Later'}</div>
        </div>
      </div>
    </Dialog>
  )
}
