import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { MaterialSymbolsAdd } from '../../components/icon'
import { usePageClose } from '../../hooks/usePageClose'

import { BigNumber, utils } from 'ethers'
import { hooks as metaMaskHooks } from '../../connectors/metaMask'
import {
  PoolRow,
  PoolCreateCallData,
  PoolCreator,
  TokenMeta,
} from '../../type/index'
import { isLegalPoolRow } from '../../utils/verify'
import PoolSetting from './PoolSetting'
import { Profile } from './ProfileForm'
import TokensSelect, { TokenMetaList } from './Token'
import CreatePoolConfirm from './CreatePoolConfirm'
import { Pool } from '../pool/PoolDetail'
import useTokenMeta from '../../hooks/useTokenMeta'

import TextareaMode from './TextareaMode'

export type TPoolRow = PoolRow & { key?: number | string }

export enum DistributionType {
  Pull = 'pull',
  Push = 'push',
}

export interface PoolConfig {
  isFundNow: boolean
  distributionType: DistributionType
  distributor: string
  date: [number, number]
}

const creatPoolEmptyItem = () => ({
  name: '',
  address: '',
  baseTokenAmount: 0,
  key: Date.now(),
})

const { useAccount, useChainId } = metaMaskHooks

export default function PoolsList() {
  usePageClose()
  const account = useAccount()
  const { getToken } = useTokenMeta()
  const [tokenMetaList, setTokenMetaList] = useState<TokenMetaList>([undefined])
  const [poolName, setPoolName] = useState<string>('Distribution')
  const [poolList, setPoolList] = useState<TPoolRow[]>([creatPoolEmptyItem()])
  const [textarea, setTextarea] = useState<string>('')

  const baseTokenMeta = useMemo(() => tokenMetaList[0], [tokenMetaList[0]])
  const secondTokenMeta = useMemo(() => tokenMetaList[1], [tokenMetaList[1]])
  const [poolConfig, setPoolConfig] = useState<PoolConfig>({
    isFundNow: true,
    distributionType: DistributionType.Push,
    distributor: '',
    date: [
      Math.round(Date.now() / 1000 + 60 * 2),
      Math.round(Date.now() + 60 * 60),
    ],
  })

  const [errMsg, setErrMsg] = useState<string>('')

  const [isTextareaMode, setIsTextareaMode] = useState(false)

  const baseTotalAmount: BigNumber = useMemo(() => {
    if (!baseTokenMeta || !baseTokenMeta.decimals) return BigNumber.from(0)
    return poolList.reduce((pre: BigNumber, cur) => {
      if (!cur.baseTokenAmount) return pre
      return pre.add(
        BigNumber.from(
          utils.parseUnits(
            cur.baseTokenAmount.toString(),
            baseTokenMeta.decimals
          )
        )
      )
    }, BigNumber.from(0))
  }, [poolList, baseTokenMeta])
  const [secondTokenAmounts, setSecondTokenAmounts] = useState<number[]>([])
  const [secondTokenTotalAmount, setSecondTokenTotalAmount] =
    useState<number>(0)

  // add new token
  function onAddTokenCallBack() {
    setSecondTokenTotalAmount(
      Number(utils.formatUnits(baseTotalAmount, baseTokenMeta?.decimals))
    )
    const amounts = poolList.map((col) => col.baseTokenAmount)
    setSecondTokenAmounts(amounts)
  }
  // remove token
  function onRemoveTokenCallBack() {
    setSecondTokenAmounts([])
  }

  // distribute pool again
  const initPool = useCallback(async () => {
    const poolDetail = localStorage.getItem('distributeAgainData')
    if (!poolDetail) return
    const poolDetailData = JSON.parse(poolDetail) as Pool
    const {
      claimers,
      baseToken: _baseToken,
      baseTokenAmounts,
      secondToken: _secondToken,
      secondTokenAmounts,
    } = poolDetailData
    const baseToken: TokenMeta = (await getToken(_baseToken))!
    const poolRows: TPoolRow[] = []
    const tokenList = [baseToken]
    for (let i = 0; i < claimers.length; i++) {
      poolRows.push({
        address: claimers[i],
        baseTokenAmount: parseFloat(
          utils.formatUnits(baseTokenAmounts[i], baseToken.decimals)
        ),
        name: '',
        key: claimers[i],
      })
    }
    if (_secondToken && secondTokenAmounts) {
      const secondToken = (await getToken(_secondToken))!
      const secondTokenTotalAmount = parseFloat(
        utils.formatUnits(
          secondTokenAmounts.reduce(
            (pre, cur) => pre.add(cur),
            BigNumber.from(0)
          ),
          secondToken.decimals
        )
      )
      tokenList.push(secondToken)
      setSecondTokenTotalAmount(secondTokenTotalAmount)
    }
    setTokenMetaList(tokenList as TokenMetaList)
    setPoolList(poolRows)
    localStorage.removeItem('distributeAgainData')
  }, [])
  useEffect(() => {
    initPool()
  }, [])

  useEffect(() => {
    if (!baseTokenMeta || !secondTokenMeta) return
    const amounts = poolList.map((col) => {
      if (baseTotalAmount.eq(0)) return 0
      const formatBaseAmount = utils.parseUnits(
        col.baseTokenAmount.toString(),
        baseTokenMeta.decimals
      )
      const formatSecontTokenTotoalAmount = utils.parseUnits(
        secondTokenTotalAmount ? secondTokenTotalAmount.toString() : '0',
        secondTokenMeta.decimals
      )

      const value = formatBaseAmount
        .mul(formatSecontTokenTotoalAmount)
        .div(baseTotalAmount)

      return parseFloat(utils.formatUnits(value, secondTokenMeta.decimals))
    })

    setSecondTokenAmounts(amounts)
  }, [
    secondTokenTotalAmount,
    poolList,
    baseTotalAmount,
    baseTokenMeta,
    secondTokenMeta,
  ])

  const scrollToViewDiv = useRef<HTMLDivElement | null>()
  const addEmptyProfile = useCallback(() => {
    setPoolList([...poolList, creatPoolEmptyItem()])
    scrollToViewDiv.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
      inline: 'center',
    })
  }, [poolList])

  const removeItemFromPool = useCallback(
    (index: number) => {
      if (poolList.length === 1) {
        setPoolList([creatPoolEmptyItem()])
        return
      }
      const newPool = [...poolList]
      newPool.splice(index, 1)
      setPoolList(newPool)
    },
    [poolList]
  )

  const onPoolItemChange = (index: number, profile: TPoolRow) => {
    setPoolList((_pool) => {
      _pool[index] = { ...profile }
      return [..._pool]
    })
  }

  // batchCreate callData
  const createPoolCallData: PoolCreateCallData[] | null = useMemo(() => {
    if (!baseTokenMeta || !account) return null
    const { isFundNow, date } = poolConfig
    const distributor = poolConfig.distributor || account
    const _pool = poolList.filter((row) => isLegalPoolRow(row))
    if (_pool.length === 0) return null
    const poolAddressMap = new Map()
    _pool.forEach((row) => poolAddressMap.set(row.address, row))
    const pool = Array.from(poolAddressMap.values())

    pool.sort((a, b) => (a.address > b.address ? 1 : -1))
    const claimer = pool.map((row) => row.address)
    const baseAmounts = pool.map((row) =>
      utils
        .parseUnits(row.baseTokenAmount.toString(), baseTokenMeta.decimals)
        .toString()
    )
    const [startTime, endTime] = date
    const callData: PoolCreateCallData[] = []
    const baseCallData: PoolCreateCallData = [
      poolName,
      baseTokenMeta.address,
      distributor,
      isFundNow,
      claimer,
      baseAmounts,
      startTime,
      endTime,
    ]
    callData.push(baseCallData)

    // if have second token
    if (secondTokenMeta && secondTokenAmounts) {
      const _secondTokenAmounts = secondTokenAmounts.map((amount) =>
        utils.parseUnits(amount.toString(), secondTokenMeta.decimals).toString()
      )
      const secondCallData: PoolCreateCallData = [
        poolName,
        secondTokenMeta.address,
        distributor,
        isFundNow,
        claimer,
        _secondTokenAmounts,
        startTime,
        endTime,
      ]
      callData.push(secondCallData)
    }

    return callData
  }, [
    account,
    poolConfig,
    poolName,
    poolList,
    baseTokenMeta,
    secondTokenMeta,
    secondTokenAmounts,
  ])

  const callDataCheck = useMemo(() => {
    if (!createPoolCallData) return
    const { isFundNow, distributionType } = poolConfig
    const callData = createPoolCallData[0]

    const claimer = callData[PoolCreator.Claimers]
    const amounts = callData[PoolCreator.Amounts]
    const startTime = callData[PoolCreator.StartTime]
    const endTime = callData[PoolCreator.EndTime]
    if (distributionType === DistributionType.Pull) {
      if (endTime <= startTime) return 'end time must be after the start time '
      const nowTime = Math.round(Date.now() / 1000)
      if (nowTime >= startTime) return 'start time must in future'
    }

    if (!claimer.length || !amounts.length) return 'no claimers'
    setErrMsg('')
    return true
  }, [createPoolCallData, poolConfig])

  useEffect(() => {
    if (!callDataCheck) return
    if (typeof callDataCheck === 'string') {
      setErrMsg(callDataCheck)
    }
  }, [callDataCheck])

  /**
   * textarea.table Mode switch.
   *
   */
  const poolList2textarea = useCallback(() => {
    const textarea = poolList.filter(isLegalPoolRow).reduce((pre, cur) => {
      return `${pre}${cur.address},${cur.baseTokenAmount}\n`
    }, '')
    setTextarea(textarea)
  }, [poolList])
  const textarea2poolList = useCallback(() => {
    const textByRow = textarea.split('\n')
    const poolList: TPoolRow[] = []
    for (let i = 0; i < textByRow.length; i++) {
      const text = textByRow[i]
      const maybeRowMetaList = [
        text.split(':'),
        text.split(' '),
        text.split(','),
      ]
      const rowMeta = maybeRowMetaList.find((item) => item.length === 2)
      if (!rowMeta) continue
      const [address, baseAmount] = rowMeta
      let baseTokenAmount = parseFloat(baseAmount)
      if (isNaN(baseTokenAmount)) {
        baseTokenAmount = 0
      }
      const item = {
        address,
        baseTokenAmount: baseTokenAmount,
        name: '',
        key: `${Date.now()}-${i}`,
      }
      poolList.push(item)
    }

    setPoolList(() => (poolList.length ? poolList : [creatPoolEmptyItem()]))
  }, [textarea])

  const [confirmVisible, setConfirmVisible] = useState<boolean>(false)
  const onConfirm = useCallback(() => {
    if (typeof callDataCheck !== 'boolean') return
    setConfirmVisible(true)
  }, [callDataCheck])

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="w-full flex justify-center items-center">
        <input
          className="bg-neutral-200 text-center text-xl font-medium px-2 my-5 outline-dashed focus:outline-dashed outline-gray-400"
          autoFocus
          value={poolName}
          placeholder="Name"
          onChange={(e) => setPoolName(e.target.value)}
        />
      </div>
      <div className="flex flex-row items-center mb-2 w-full">
        <span className={`${isTextareaMode ? 'opacity-30' : 'text-green-500'}`}>
          Table View
        </span>
        <label className="switch mx-2">
          <input
            onChange={(e) => {
              setIsTextareaMode(e.target.checked)
              e.target.checked ? poolList2textarea() : textarea2poolList()
            }}
            type="checkbox"
            checked={isTextareaMode}
          />
          <span className="slider rounded-lg"></span>
        </label>

        <span className={`${isTextareaMode ? 'text-green-500' : 'opacity-30'}`}>
          Plain Text
        </span>
      </div>
      {isTextareaMode ? (
        <TextareaMode
          textarea={textarea}
          setTextarea={setTextarea}
          tokenMetaList={tokenMetaList}
          setTokenMetaList={setTokenMetaList}
          onAddTokenCallBack={onAddTokenCallBack}
          onRemoveTokenCallBack={onRemoveTokenCallBack}
          secondTokenTotalAmount={secondTokenTotalAmount}
          setSecondTokenTotalAmount={setSecondTokenTotalAmount}
          secondTokenAmounts={secondTokenAmounts}
          textarea2poolList={textarea2poolList}
        />
      ) : (
        <div className="w-full">
          <div className="flex  w-full  justify-between font-medium text-lg border border-solid  border-b-0 border-gray-400">
            {/* <div>Name</div> */}
            <div className="flex flex-1 justify-center items-center text-center ">
              <div className="text-sm">Address</div>
            </div>
            <div className="flex flex-col border-l border-gray-400">
              <div className="text-center text-sm border-b border-gray-400">
                Amount
              </div>
              <div>
                <TokensSelect
                  tokenMetaList={tokenMetaList}
                  setTokenMetaList={setTokenMetaList}
                  onAddTokenCallBack={onAddTokenCallBack}
                  onRemoveTokenCallBack={onRemoveTokenCallBack}
                  secondTokenTotalAmount={secondTokenTotalAmount}
                  setSecondTokenTotalAmount={setSecondTokenTotalAmount}
                />
              </div>
            </div>
          </div>
          <div className="w-full">
            {poolList.map((p, index) => (
              <Profile
                key={`${p.key}`}
                profileKey={`${p.key}`}
                profile={p}
                index={index}
                onRemove={removeItemFromPool}
                onChange={onPoolItemChange}
                hasSecondToken={!!secondTokenMeta}
                secondTokenAmounts={secondTokenAmounts}
              />
            ))}
          </div>
          <div
            onClick={() => addEmptyProfile()}
            className="w-full cursor-cell flex items-center justify-center h-8 border border-dashed  border-gray-500"
          >
            <MaterialSymbolsAdd className="flex-1" />
          </div>
        </div>
      )}
      <PoolSetting poolConfig={poolConfig} setPoolConfig={setPoolConfig} />

      <div className="w-full mt-5 flex justify-between items-center">
        <div className="flex items-baseline">
          Total:
          <div className="flex flex-col font-medium mx-2">
            <div>
              {baseTokenMeta
                ? utils.formatUnits(
                    baseTotalAmount.toString(),
                    baseTokenMeta.decimals
                  )
                : 0}
              <span className="ml-2">{baseTokenMeta?.symbol}</span>
            </div>

            {secondTokenMeta && (
              <div>
                {secondTokenMeta ? secondTokenTotalAmount : 0}
                <span className="ml-2">{secondTokenMeta?.symbol}</span>
              </div>
            )}
          </div>
        </div>
        <div>
          {errMsg ? <span className=" text-red-500 mr-2">{errMsg}</span> : null}
          <button
            onClick={typeof callDataCheck === 'boolean' ? onConfirm : undefined}
            className={`border border-gray-900 px-2 rounded-md hover:bg-gray-100 ${
              typeof callDataCheck === 'boolean'
                ? 'text-black'
                : 'text-gray-500 cursor-not-allowed'
            }`}
          >
            Preview Distributions
          </button>
        </div>
      </div>

      <div ref={(el) => (scrollToViewDiv.current = el)} className="h-20"></div>
      {createPoolCallData && baseTokenMeta && confirmVisible ? (
        <CreatePoolConfirm
          visible={confirmVisible}
          setVisible={setConfirmVisible}
          callData={createPoolCallData}
          baseTokenMeta={baseTokenMeta}
          secondTokenMeta={secondTokenMeta}
          distributionType={poolConfig.distributionType}
        />
      ) : null}
    </div>
  )
}
