import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { MaterialSymbolsAdd } from '../../components/icon'
import { usePageClose } from '../../hooks/usePageClose'

import { BigNumber, constants, ethers, utils } from 'ethers'
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

import {
  formatCurrencyAmount,
  parsed2NumberString,
  parsedNumberByDecimal,
} from '../../utils/number'
import { LOCAL_STORAGE_KEY } from '../../store/storeKey'
import { Provider } from 'urql'
import { useWeb3React } from '@web3-react/core'

export type TPoolRow = PoolRow & {
  key?: number | string
}

export enum DistributionType {
  Pull = 'pull',
  Push = 'push',
}

export interface DistributePageCache {
  poolList: TPoolRow[]
  tokenMetaList: TokenMeta[]
  poolName: string
  poolConfig?: PoolConfig
  tableHeaderInputList?: string[]
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
  key: `${Date.now()}-${Math.random()}`,
})

const { useAccount } = metaMaskHooks

export default function PoolsList() {
  usePageClose()
  const account = useAccount()
  const { getToken, getTokenBalance } = useTokenMeta()
  const { isOwner, dPoolAddress } = useDPoolAddress()
  const [dPoolFactoryVisible, setDPoolFactoryVisible] = useState<boolean>(false)
  const [poolName, setPoolName] = useState<string>('Distribution')
  const [tableHeaderInputList, setTableHeaderInputList] = useState<string[]>([])
  const [tokenMetaList, setTokenMetaList] = useState<TokenMeta[]>([])
  const [tokenBalanceList, setTokenBalanceList] = useState<BigNumber[]>([])
  const [poolList, setPoolList] = useState<TPoolRow[]>([createPoolEmptyItem()])
  const [textarea, setTextarea] = useState<string>('')
  const [isTextareaMode, setIsTextareaMode] = useState(false)
  const [confirmVisible, setConfirmVisible] = useState<boolean>(false)
  const [poolConfig, setPoolConfig] = useState<PoolConfig>({
    isFundNow: true,
    distributionType: DistributionType.Push,
    distributor: '',
    date: [
      Math.round(Date.now() / 1000 + 60 * 5),
      Math.round(Date.now() + 60 * 60),
    ],
  })

  const isPercentMode = useMemo(() => {
    return !!tableHeaderInputList[0] && !isNaN(Number(tableHeaderInputList[0]))
  }, [tableHeaderInputList[0]])

  const baseUserInputTotal: BigNumber = useMemo(() => {
    if (!tokenMetaList[0]) return BigNumber.from(0)
    return poolList.reduce((pre, cur) => {
      return pre.add(
        utils.parseUnits(
          parsedNumberByDecimal(
            parsed2NumberString(cur.userInputAmount),
            tokenMetaList[0].decimals
          ),
          tokenMetaList[0]?.decimals
        )
      )
    }, BigNumber.from(0))
  }, [poolList, tokenMetaList[0]])

  const parsedTokenAmounts: BigNumber[][] = useMemo(() => {
    /**
     *  first column:
     *  tableHeaderInputList[0] has value ? percent mode : amount mode
     *  amount mode: user input number is token amount
     *  percent mode: user input number is percentage.   ActualTokenNumber = inputNumber / sumOfEachRowInputNumber * tableHeaderInputList[0]
     */
    const baseAmountTotal = utils.parseUnits(
      parsedNumberByDecimal(
        parsed2NumberString(tableHeaderInputList[0]),
        tokenMetaList[0]?.decimals || 0
      ),
      tokenMetaList[0]?.decimals
    )
    const tokenAmounts = Array(tokenMetaList.length)
    tokenAmounts[0] = poolList.map((row) => {
      const baseAmount = utils.parseUnits(
        parsedNumberByDecimal(
          parsed2NumberString(row.userInputAmount),
          tokenMetaList[0]?.decimals
        ),
        tokenMetaList[0]?.decimals
      )
      if (baseAmount.eq(0)) return BigNumber.from(0)
      return isPercentMode && baseUserInputTotal.gt(0)
        ? baseAmount.mul(baseAmountTotal).div(baseUserInputTotal)
        : baseAmount
    })

    // if has second token
    if (tokenMetaList[1]) {
      const totalAmount = utils.parseUnits(
        parsedNumberByDecimal(
          parsed2NumberString(tableHeaderInputList[1]),
          tokenMetaList[1].decimals
        ),
        tokenMetaList[1].decimals
      )
      tokenAmounts[1] = poolList.map((row) => {
        const baseAmount = utils.parseUnits(
          parsedNumberByDecimal(
            parsed2NumberString(row.userInputAmount),
            tokenMetaList[0]?.decimals
          ),
          tokenMetaList[0]?.decimals
        )
        return baseUserInputTotal.gt(0)
          ? baseAmount.mul(totalAmount).div(baseUserInputTotal)
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

  // cache distribute data
  useEffect(() => {
    const _poolList = poolList.filter((row) => isAddress(row.address))
    if (_poolList.length === 0) return
    const distributeCacheData = {
      poolList,
      tokenMetaList,
      tableHeaderInputList,
      poolConfig,
      poolName,
    }
    localStorage.setItem(
      LOCAL_STORAGE_KEY.DISTRIBUTE_CATCH_DATA,
      JSON.stringify(distributeCacheData)
    )
  }, [poolList, tokenMetaList, tableHeaderInputList, poolConfig, poolName])

  const initPool = useCallback(async () => {
    const poolDetail = localStorage.getItem(
      LOCAL_STORAGE_KEY.DISTRIBUTE_CATCH_DATA
    )
    if (!poolDetail) {
      getToken(constants.AddressZero).then((token) =>
        setTokenMetaList([token!])
      )
      return
    }
    // set data from local
    const poolDetailData = JSON.parse(poolDetail) as DistributePageCache
    const {
      poolList,
      tokenMetaList,
      tableHeaderInputList,
      poolName,
      poolConfig,
    } = poolDetailData
    setPoolList(poolList)
    setPoolName(poolName)
    setTokenMetaList(tokenMetaList)

    if (poolConfig) {
      setPoolConfig(poolConfig)
    }
    if (tableHeaderInputList) {
      setTableHeaderInputList(tableHeaderInputList)
    }
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
    // if (!isOwner) return null
    const { isFundNow, date } = poolConfig

    const distributor = poolConfig.isFundNow
      ? account
      : poolConfig.distributor || constants.AddressZero
    const _pool = poolList.filter(isLegalPoolRow)
    if (_pool.length !== parsedTokenAmounts[0].length) return null

    // address must be unique
    const poolAddressMap = new Map()
    _pool.forEach((row) => poolAddressMap.set(row.address.toLowerCase(), row))
    const pool: TPoolRow[] = Array.from(poolAddressMap.values())
    // dPool contract need sort by address.
    pool.sort((a, b) => (BigNumber.from(a.address).gt(b.address) ? 1 : -1))

    const claimer = pool.map((row) => row.address)
    let [startTime, endTime] = date
    if (
      poolConfig.distributionType === DistributionType.Push &&
      !poolConfig.isFundNow
    ) {
      // max uint48
      startTime = 2 ** 48 - 1
      endTime = 2 ** 48 - 1
    }

    // one token. one pool.
    const callDataList: PoolCreateCallData[] = []
    for (let i = 0; i < tokenMetaList.length; i++) {
      //  must clone origin parsedTokenAmounts.
      const amounts = parsedTokenAmounts[i].map((v) => BigNumber.from(v))
      // if table have header input. should handle accuracy loss. Rest token give to first address
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
    parsedTokenAmounts,
    parsedTokenAmountsTotal,
    tableHeaderInputList,
    repeatedAddress,
  ])

  // Total token amount of processed accuracy losses
  const tokenTotalAmounts = useMemo(() => {
    if (!createPoolCallData) return
    const totalAmounts: BigNumber[] = []
    createPoolCallData.forEach((data) =>
      totalAmounts.push(
        data[PoolCreator.Amounts].reduce(
          (sum, cur) => sum.add(cur),
          BigNumber.from(0)
        )
      )
    )
    return totalAmounts
  }, [createPoolCallData])
  const isTokenBalanceEnough = useMemo(() => {
    if (
      !tokenTotalAmounts ||
      tokenTotalAmounts.length === 0 ||
      tokenBalanceList.length === 0
    )
      return false
    for (let i = 0; i < tokenBalanceList.length; i++) {
      if (
        tokenBalanceList[i] &&
        tokenTotalAmounts[i] &&
        tokenBalanceList[i].lt(tokenTotalAmounts[i])
      )
        return false
    }
    return true
  }, [tokenTotalAmounts, tokenBalanceList])
  const callDataCheck = useMemo(() => {
    if (!createPoolCallData) return
    if (!isOwner) return
    const { distributionType, isFundNow } = poolConfig
    const callData = createPoolCallData[0]
    const claimer = callData[PoolCreator.Claimers]
    const amounts = callData[PoolCreator.Amounts]
    const startTime = callData[PoolCreator.StartTime]
    const endTime = callData[PoolCreator.EndTime]
    if (distributionType === DistributionType.Pull) {
      if (endTime <= startTime) return 'End time must be after the start time '
      const nowTime = Math.round(Date.now() / 1000)
      if (nowTime >= startTime) return 'Start time must in future'
    }
    if (!claimer.length || !amounts.length) return 'No claimers'
    if (isFundNow && !isTokenBalanceEnough) return 'Insufficient balance'
    for (let i = 0; i < parsedTokenAmountsTotal.length; i++) {
      if (parsedTokenAmountsTotal[0].eq(0)) return 'Total amount can not be 0'
    }
    return true
  }, [createPoolCallData, poolConfig, isOwner, isTokenBalanceEnough])

  const getTokensBalance = useCallback(async () => {
    const balanceList: BigNumber[] = []
    if (!tokenMetaList[0]) return balanceList
    for (let i = 0; i < tokenMetaList.length; i++) {
      const balance = await getTokenBalance(tokenMetaList[i].address)
      balanceList.push(balance)
    }
    return balanceList
  }, [tokenMetaList, getTokenBalance])
  useEffect(() => {
    getTokensBalance().then(setTokenBalanceList)
  }, [getTokenBalance, tokenMetaList])

  /**
   * textarea,table Mode switch.
   */
  const poolList2textarea = useCallback(() => {
    const textarea = poolList
      .filter((row) => isAddress(row.address))
      .reduce((pre, cur) => {
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
        userInputAmount: baseAmount,
        key: `${Date.now()}-${Math.random()}`,
      }
      _poolList.push(item)
    }
    _poolList.length > 0
      ? setPoolList(_poolList)
      : setPoolList([createPoolEmptyItem()])
  }, [textarea, poolList])

  useEffect(() => {
    setDPoolFactoryVisible(() => !dPoolAddress)
  }, [dPoolAddress, isOwner])

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

  const onConfirm = useCallback(() => {
    if (typeof callDataCheck !== 'boolean') return
    setConfirmVisible(true)
  }, [callDataCheck])

  const onDistributeSuccess = useCallback(() => {
    setPoolList([createPoolEmptyItem()])
    setTableHeaderInputList([])
  }, [])

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
        <div className="flex  w-full  justify-between  text-base ">
          <div className="flex flex-1 justify-center items-center text-center  border border-solid  border-b-0 border-r-0 border-gray-400">
            <div className="w-10"></div>
            <div className="w-96">Address</div>
          </div>
          <div className="flex flex-col border border-b-0 border-gray-400">
            <div className="text-center border-b border-gray-400 py-1">
              Amount
            </div>

            <PoolHeader
              tokenMetaList={tokenMetaList}
              setTokenMetaList={setTokenMetaList}
              tableHeaderInputList={tableHeaderInputList}
              setTableHeaderInputList={setTableHeaderInputList}
            />
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
                userInputTotal={baseUserInputTotal}
              />
            ))}
          </div>
        )}

        {isTextareaMode ? (
          <div className="w-full border-t border-gray-400"></div>
        ) : (
          <div
            onClick={() => addEmptyProfile()}
            className="w-full cursor-pointer flex items-center justify-center h-8 border border-dashed  border-gray-500"
          >
            <MaterialSymbolsAdd className="flex-1" />
          </div>
        )}
      </div>

      <PoolSetting poolConfig={poolConfig} setPoolConfig={setPoolConfig} />

      <div className="w-full mt-5 flex justify-between items-center">
        <div className="flex items-baseline">
          {tokenTotalAmounts ? `Total:` : null}
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
          {typeof callDataCheck === 'boolean' ? null : (
            <span className=" text-red-500 mr-2">{callDataCheck}</span>
          )}
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

      {createPoolCallData && confirmVisible && dPoolAddress ? (
        <CreatePoolConfirm
          visible={confirmVisible}
          setVisible={setConfirmVisible}
          callData={createPoolCallData}
          tokenMetaList={tokenMetaList}
          tokenBalanceList={tokenBalanceList}
          isTokenBalanceEnough={isTokenBalanceEnough}
          dPoolAddress={dPoolAddress}
          distributionType={poolConfig.distributionType}
          onDistributeSuccess={onDistributeSuccess}
        />
      ) : null}
    </div>
  )
}
