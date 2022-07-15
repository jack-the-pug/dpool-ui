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
import PoolHeader from './PoolHeader'
import CreatePoolConfirm from './CreatePoolConfirm'
import useTokenMeta from '../../hooks/useTokenMeta'

import TextareaMode from './TextareaMode'
import useDPoolAddress from '../../hooks/useDPoolAddress'
import { toast } from 'react-toastify'

import DPoolFactory from './dPoolFactory/index'
import { isAddress } from 'ethers/lib/utils'
import { Pool } from '../pool/PoolDetail'

import { formatCurrencyAmount, parsed2NumberString } from '../../utils/number'

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

const createPoolEmptyItem = (): TPoolRow => ({
  address: '',
  userInputAmount: '',
  key: Date.now(),
})

const { useAccount, useChainId } = metaMaskHooks

export default function PoolsList() {
  usePageClose()
  const account = useAccount()
  const chainId = useChainId()
  const { getToken } = useTokenMeta()
  const { isOwner, dPoolAddress } = useDPoolAddress()
  const [dPoolFactoryVisible, setDPoolFactoryVisible] = useState<boolean>(false)

  useEffect(() => {
    setDPoolFactoryVisible(() => !dPoolAddress)
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

  const [poolName, setPoolName] = useState<string>('Distribution')
  const [tableHeaderInputList, setTableHeaderInputList] = useState<string[]>([])
  const [tokenMetaList, setTokenMetaList] = useState<TokenMeta[]>([])
  // setDefault token
  useEffect(() => {
    getToken('0x0000000000000000000000000000000000000000').then(
      (token) => token && setTokenMetaList([token])
    )
  }, [chainId])
  const [poolList, setPoolList] = useState<TPoolRow[]>([createPoolEmptyItem()])

  const isPercentMode = useMemo(() => {
    return !!tableHeaderInputList[0] && !isNaN(Number(tableHeaderInputList[0]))
  }, [tableHeaderInputList[0]])

  const userInputTotal: BigNumber = useMemo(
    () =>
      poolList.reduce(
        (pre, cur) =>
          pre.add(
            utils.parseUnits(
              parsed2NumberString(cur.userInputAmount),
              tokenMetaList[0]?.decimals
            )
          ),
        BigNumber.from(0)
      ),
    [poolList, tokenMetaList[0]]
  )

  const parsedTokenAmounts: BigNumber[][] = useMemo(() => {
    /**
     *  first column:
     *  tableHeaderInputList[0] has value ? percent mode : amount mode
     *  amount mode: user input number is token amount
     *  percent mode: user input number is percentage.   ActualTokenNumber = inputNumber / sumOfEachRowInputNumber * tableHeaderInputList[0]
     */
    const baseAmountTotal = utils.parseUnits(
      parsed2NumberString(tableHeaderInputList[0]),
      tokenMetaList[0]?.decimals
    )
    const tokenAmounts = Array(tokenMetaList.length)
    tokenAmounts[0] = poolList.map((row) => {
      const baseAmount = utils.parseUnits(
        parsed2NumberString(row.userInputAmount),
        tokenMetaList[0]?.decimals
      )
      return isPercentMode && userInputTotal.gt(0)
        ? baseAmount.mul(baseAmountTotal).div(userInputTotal)
        : baseAmount
    })
    // if has second token
    if (tokenMetaList[1]) {
      const totalAmount = utils.parseUnits(
        parsed2NumberString(tableHeaderInputList[1]),
        tokenMetaList[1].decimals
      )
      tokenAmounts[1] = poolList.map((row) => {
        const baseAmount = utils.parseUnits(
          parsed2NumberString(row.userInputAmount),
          tokenMetaList[0]?.decimals
        )
        return userInputTotal.gt(0)
          ? baseAmount.mul(totalAmount).div(userInputTotal)
          : BigNumber.from(0)
      })
    }
    return tokenAmounts
  }, [tokenMetaList, tableHeaderInputList, poolList, isPercentMode])

  // This total maybe have accuracy loss
  const parsedTokenAmountsTotal = useMemo(() => {
    return parsedTokenAmounts.map((amounts) =>
      amounts.reduce((pre, cur) => pre.add(cur), BigNumber.from(0))
    )
  }, [parsedTokenAmounts])

  const [textarea, setTextarea] = useState<string>('')
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

  // distribute pool again
  const initPool = useCallback(async () => {
    const poolDetail = localStorage.getItem('distributeAgainData')
    if (!poolDetail) return
    const poolDetailData = JSON.parse(poolDetail) as Pool
    const { claimers, amounts, token } = poolDetailData
    const tokenMeta: TokenMeta = (await getToken(token))!
    const poolRows: TPoolRow[] = []
    const tokenList = [tokenMeta]
    for (let i = 0; i < claimers.length; i++) {
      poolRows.push({
        address: claimers[i],
        userInputAmount: utils.formatUnits(amounts[i], tokenMeta.decimals),
        key: claimers[i],
      })
    }
    setTokenMetaList(tokenList)
    setPoolList(poolRows)
    localStorage.removeItem('distributeAgainData')
  }, [])
  useEffect(() => {
    initPool()
  }, [])

  const scrollToViewDiv = useRef<HTMLDivElement | null>()
  const addEmptyProfile = useCallback(() => {
    setPoolList([...poolList, createPoolEmptyItem()])
    scrollToViewDiv.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
      inline: 'center',
    })
  }, [poolList])

  const removeItemFromPool = useCallback(
    (index: number) => {
      if (poolList.length === 1) {
        setPoolList([createPoolEmptyItem()])
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
  // check repeated address
  const repeatedAddress = useMemo(() => {
    const addressMap: Map<string, number> = new Map()
    for (let i = 0; i < poolList.length; i++) {
      const row = poolList[i]
      if (!isAddress(row.address)) continue
      const n = addressMap.get(row.address.toLowerCase()) || 1
      if (n > 1) {
        return row.address
      }
      addressMap.set(row.address.toLowerCase(), n + 1)
    }
    return
  }, [poolList])

  // batchCreate callData
  const createPoolCallData: PoolCreateCallData[] | null = useMemo(() => {
    if (!tokenMetaList[0] || repeatedAddress || !account) return null
    if (!isOwner) return null
    const { isFundNow, date } = poolConfig
    const distributor = isAddress(poolConfig.distributor)
      ? poolConfig.distributor
      : account
    const _pool = poolList.filter((row) => isLegalPoolRow(row))
    if (_pool.length !== poolList.length) return null

    // address must be unique
    const poolAddressMap = new Map()
    _pool.forEach((row) => poolAddressMap.set(row.address, row))

    const pool: TPoolRow[] = Array.from(poolAddressMap.values())

    // dPool contract need sort by address.
    pool.sort((a, b) => (a.address > b.address ? 1 : -1))
    const claimer = pool.map((row) => row.address)

    const [startTime, endTime] = date

    // one token. one pool.
    const callDataList: PoolCreateCallData[] = []
    for (let i = 0; i < tokenMetaList.length; i++) {
      const amounts = parsedTokenAmounts[i]
      // if table have header.should handle accuracy loss. Rest token give to first address
      if (tableHeaderInputList[i] && !isNaN(Number(tableHeaderInputList[i]))) {
        const totalAmount = utils.parseUnits(
          tableHeaderInputList[i],
          tokenMetaList[i].decimals
        )
        const diff = totalAmount.sub(parsedTokenAmountsTotal[i])
        amounts[0] = amounts[0].add(diff)
      }
      const callData: PoolCreateCallData = [
        poolName,
        tokenMetaList[i].address,
        distributor,
        isFundNow,
        claimer,
        amounts,
        startTime,
        endTime,
      ]
      callDataList.push(callData)
    }
    return callDataList
  }, [
    poolConfig,
    poolName,
    poolList,
    account,
    tokenMetaList,
    parsedTokenAmountsTotal,
    tableHeaderInputList,
    repeatedAddress,
  ])

  // Total token amount of processed accuracy losses
  const tokenTotalAmounts = useMemo(() => {
    if (!createPoolCallData) return
    const totalAmount: BigNumber[] = []
    createPoolCallData.forEach((data) =>
      totalAmount.push(
        data[PoolCreator.Amounts].reduce(
          (sum, cur) => sum.add(cur),
          BigNumber.from(0)
        )
      )
    )
    return totalAmount
  }, [createPoolCallData])

  const callDataCheck = useMemo(() => {
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
      let amount = Number(baseAmount)
      if (isNaN(amount)) {
        amount = 0
      }
      const item: TPoolRow = {
        address,
        userInputAmount: amount.toString(),
        key: `${Date.now()}-${i}`,
      }
      _poolList.push(item)
    }
    setPoolList(() => (poolList.length ? _poolList : [createPoolEmptyItem()]))
  }, [textarea, isPercentMode, poolList])

  const [confirmVisible, setConfirmVisible] = useState<boolean>(false)
  const onConfirm = useCallback(() => {
    if (typeof callDataCheck !== 'boolean') return
    setConfirmVisible(true)
  }, [callDataCheck])
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
              <PoolHeader
                tokenMetaList={tokenMetaList}
                setTokenMetaList={setTokenMetaList}
                tableHeaderInputList={tableHeaderInputList}
                setTableHeaderInputList={setTableHeaderInputList}
              />
            </div>
          </div>
        </div>
        {isTextareaMode ? (
          <TextareaMode
            textarea={textarea}
            setTextarea={setTextarea}
            textarea2poolList={textarea2poolList}
            parsedTokenAmounts={parsedTokenAmounts}
            tokenMetaList={tokenMetaList}
          />
        ) : (
          <div className="w-full">
            {poolList.map((p, index) => (
              <Profile
                key={`${p.key}`}
                profileKey={`${p.key}`}
                profile={p}
                index={index}
                onRemove={removeItemFromPool}
                onChange={onPoolItemChange}
                repeatedAddress={repeatedAddress}
                parsedTokenAmounts={parsedTokenAmounts}
                isPercentMode={isPercentMode}
                tokenMetaList={tokenMetaList}
                userInputTotal={userInputTotal}
              />
            ))}
          </div>
        )}

        <div
          onClick={() => addEmptyProfile()}
          className="w-full cursor-cell flex items-center justify-center h-8 border border-dashed  border-gray-500"
        >
          <MaterialSymbolsAdd className="flex-1" />
        </div>
      </div>

      <PoolSetting poolConfig={poolConfig} setPoolConfig={setPoolConfig} />

      <div className="w-full mt-5 flex justify-between items-center">
        <div className="flex items-baseline">
          Total:
          <div className="flex flex-col font-medium mx-2">
            {tokenTotalAmounts &&
              tokenTotalAmounts.map((amount, index) => (
                <div key={'token-' + index}>
                  {formatCurrencyAmount(amount, tokenMetaList[index])}
                  <span className="ml-1 text-gray-500">
                    {tokenMetaList[index]?.symbol}
                  </span>
                </div>
              ))}
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
      {createPoolCallData && confirmVisible ? (
        <CreatePoolConfirm
          visible={confirmVisible}
          setVisible={setConfirmVisible}
          callData={createPoolCallData}
          tokenMetaList={tokenMetaList}
          distributionType={poolConfig.distributionType}
        />
      ) : null}
    </div>
  )
}
