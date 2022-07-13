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
import useDPoolAddress from '../../hooks/useDPoolAddress'
import { toast } from 'react-toastify'

import DPoolFactory from './dPoolFactory/index'

export type TPoolRow = PoolRow & {
  key?: number | string
}

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

const creatPoolEmptyItem = (): TPoolRow => ({
  address: '',
  parsedTokenAmount: BigNumber.from(0),
  userInputAmount: '',
  key: Date.now(),
})

const { useAccount } = metaMaskHooks

export default function PoolsList() {
  usePageClose()
  const account = useAccount()
  const { getToken } = useTokenMeta()
  const { isOwner, dPoolAddress } = useDPoolAddress()
  const [dPoolFactoryVisible, setDPoolFactoryVisible] = useState<boolean>(false)
  useEffect(() => {
    if (!dPoolAddress) {
      setDPoolFactoryVisible(true)
    } else {
      setDPoolFactoryVisible(false)
    }
  }, [dPoolAddress])
  useEffect(() => {
    if (!isOwner) {
      toast.warning(
        ({ closeToast }) => (
          <div>
            <p className="break-normal">
              You are not the owner of this dPool contract.
            </p>
            <span
              className="text-green-500"
              onClick={() => {
                closeToast!()
                setDPoolFactoryVisible(true)
              }}
            >
              Create your own dPool -&gt;
            </span>
          </div>
        ),
        { autoClose: false }
      )
    }
  }, [isOwner])

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
      if (!cur.parsedTokenAmount) return pre
      return pre.add(cur.parsedTokenAmount)
    }, BigNumber.from(0))
  }, [poolList, baseTokenMeta])

  // use input secondTokenTotal
  const [secondTokenTotalAmount, setSecondTokenTotalAmount] =
    useState<number>(0)
  // compute each row secondTokenAmount by firstTokenAmount
  const secondTokenAmounts = useMemo(() => {
    if (!secondTokenMeta) return null
    const _secondTokenTotalAmount = utils.parseUnits(
      secondTokenTotalAmount.toString(),
      secondTokenMeta.decimals
    )
    return poolList.map(
      (row) =>
        row.parsedTokenAmount.mul(_secondTokenTotalAmount).div(baseTotalAmount),
      []
    )
  }, [
    secondTokenMeta,
    baseTokenMeta,
    poolList,
    secondTokenTotalAmount,
    baseTotalAmount,
  ])

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
        parsedTokenAmount: baseTokenAmounts[i],
        // TODO: get token deciamls
        userInputAmount: utils.formatUnits(baseTokenAmounts[i], 18),
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
  const [percentModeTokenTotalAmount, setPercentModeTokenTotalAmount] =
    useState<number>()
  const isPercentMode = useMemo(
    () => !!percentModeTokenTotalAmount && !isNaN(percentModeTokenTotalAmount),
    [percentModeTokenTotalAmount]
  )
  const percentModeRowAmountTotal = useMemo(() => {
    if (
      !percentModeTokenTotalAmount ||
      isNaN(percentModeTokenTotalAmount) ||
      !baseTokenMeta
    )
      return 0
    const total = poolList.reduce(
      (pre, cur) => pre + Number(cur.userInputAmount),
      0
    )
    return total
  }, [poolList, percentModeTokenTotalAmount, baseTokenMeta])
  // batchCreate callData
  const createPoolCallData: PoolCreateCallData[] | null = useMemo(() => {
    if (!baseTokenMeta || !account) return null
    const { isFundNow, date } = poolConfig
    const distributor = poolConfig.distributor || account
    const _pool = poolList.filter((row) => isLegalPoolRow(row))
    if (_pool.length === 0) return null
    const poolAddressMap = new Map()
    _pool.forEach((row) => poolAddressMap.set(row.address, row))
    const pool: TPoolRow[] = Array.from(poolAddressMap.values())

    pool.sort((a, b) => (a.address > b.address ? 1 : -1))
    const claimer = pool.map((row) => row.address)
    const baseAmounts = pool.map((row) => row.parsedTokenAmount)
    // handle accuracy loss. The rest give to the first address
    if (isPercentMode && percentModeTokenTotalAmount) {
      const total = utils.parseUnits(
        percentModeTokenTotalAmount.toString(),
        baseTokenMeta.decimals
      )
      const diff = total.sub(baseTotalAmount)
      baseAmounts[0] = baseAmounts[0].add(diff)
    }

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
      const secondTokenAmountSum = secondTokenAmounts.reduce(
        (pre, cur) => pre.add(cur),
        BigNumber.from(0)
      )
      const diff = secondTokenAmountSum.sub(
        utils.parseUnits(
          secondTokenTotalAmount.toString(),
          secondTokenMeta.decimals
        )
      )
      secondTokenAmounts[0] = secondTokenAmounts[0].add(diff)
      const secondCallData: PoolCreateCallData = [
        poolName,
        secondTokenMeta.address,
        distributor,
        isFundNow,
        claimer,
        secondTokenAmounts,
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
    isPercentMode,
    baseTotalAmount,
    percentModeTokenTotalAmount,
  ])

  const callDataCheck = useMemo(() => {
    console.log('createPoolCallData', createPoolCallData, isOwner)
    if (!createPoolCallData) return
    if (!isOwner) return
    const { distributionType } = poolConfig
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
  }, [createPoolCallData, poolConfig, isOwner])

  useEffect(() => {
    console.log('callDataCheck', callDataCheck)
    if (!callDataCheck) return
    if (typeof callDataCheck === 'string') {
      setErrMsg(callDataCheck)
    }
  }, [callDataCheck])

  /**
   * textarea,table Mode switch.
   */
  const poolList2textarea = useCallback(() => {
    const textarea = poolList.filter(isLegalPoolRow).reduce((pre, cur) => {
      return `${pre}${cur.address},${cur.userInputAmount}\n`
    }, '')
    setTextarea(textarea)
  }, [poolList])
  const textarea2poolList = useCallback(() => {
    if (!baseTokenMeta) return
    const textByRow = textarea.split('\n')
    const _poolList: TPoolRow[] = []
    for (let i = 0; i < textByRow.length; i++) {
      const text = textByRow[i]
      const maybeRowMetaList = [
        text.split(':'),
        text.split(' '),
        text.split(','),
        text.split('='),
      ]
      const rowMeta = maybeRowMetaList.find((item) => item.length === 2)
      if (!rowMeta) continue
      const [address, baseAmount] = rowMeta
      let baseTokenAmount = parseFloat(baseAmount)
      if (isNaN(baseTokenAmount)) {
        baseTokenAmount = 0
      }
      const item: TPoolRow = {
        address,
        userInputAmount: baseAmount,
        parsedTokenAmount: utils.parseUnits(baseAmount, baseTokenMeta.decimals),
        key: `${Date.now()}-${i}`,
      }
      _poolList.push(item)
    }
    setPoolList(() => (poolList.length ? poolList : [creatPoolEmptyItem()]))
  }, [textarea, isPercentMode, poolList, baseTokenMeta])

  const [confirmVisible, setConfirmVisible] = useState<boolean>(false)
  const onConfirm = useCallback(() => {
    if (typeof callDataCheck !== 'boolean') return
    setConfirmVisible(true)
  }, [callDataCheck])
  useEffect(() => {
    console.log('poolList', poolList)
  }, [poolList])
  return dPoolFactoryVisible ? (
    <DPoolFactory />
  ) : (
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
          secondTokenTotalAmount={secondTokenTotalAmount}
          setSecondTokenTotalAmount={setSecondTokenTotalAmount}
          secondTokenAmounts={
            secondTokenAmounts
              ? secondTokenAmounts.map((amount) =>
                  utils.formatUnits(amount, secondTokenMeta?.decimals)
                )
              : null
          }
          textarea2poolList={textarea2poolList}
          basePercentModeTotal={percentModeTokenTotalAmount}
          setBasePercentModeTotal={setPercentModeTokenTotalAmount}
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
                  basePercentModeTotal={percentModeTokenTotalAmount}
                  setBasePercentModeTotal={setPercentModeTokenTotalAmount}
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
                baseTokenMeta={baseTokenMeta}
                secondTokenMeta={secondTokenMeta}
                hasSecondToken={!!secondTokenMeta}
                secondTokenAmounts={secondTokenAmounts}
                percentModeTokenTotalAmount={percentModeTokenTotalAmount}
                percentModeRowAmountTotal={percentModeRowAmountTotal}
                isPercentMode={isPercentMode}
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
