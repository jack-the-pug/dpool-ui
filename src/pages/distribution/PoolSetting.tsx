import { isAddress } from 'ethers/lib/utils'
import { useEffect, useMemo } from 'react'
import { useState } from 'react'
import { DistributionType, PoolConfig } from './CreatePool'
import DateRangePicker from './DateRangePicker'

function PoolSetting(props: {
  poolConfig: PoolConfig
  setPoolConfig: (config: PoolConfig) => void
}) {
  const { poolConfig, setPoolConfig } = props
  const [isFundNow, setIsFundNow] = useState(poolConfig.isFundNow)
  const [distributionType, setDistributionType] = useState(
    DistributionType.Push
  )
  const [distributorAddress, setDistributorAddress] = useState<string>(
    poolConfig.distributor
  )
  const [date, setDate] = useState<[number, number]>([
    poolConfig.date[0],
    poolConfig.date[1],
  ])
  useEffect(() => {
    const config = {
      isFundNow,
      distributionType,
      distributor: distributorAddress,
      date,
    }
    if (
      !isAddress(distributorAddress) ||
      distributionType === DistributionType.Pull
    ) {
      config.distributor = ''
    }
    setPoolConfig(config)
  }, [isFundNow, distributionType, distributorAddress, date])

  const renderDatePicker = useMemo(() => {
    if (distributionType === DistributionType.Push) return null
    return (
      <section className="flex flex-col justify-between  mt-2   p-2">
        <label className="mb-2">Claimable Time Range</label>
        <DateRangePicker setDate={setDate} />
      </section>
    )
  }, [isFundNow, distributionType])

  const renderDistributor = useMemo(() => {
    if (isFundNow) return null
    if (distributionType === DistributionType.Pull) return null
    return (
      <section className="flex w-full flex-col justify-between  mt-2 px-2">
        <div className="flex flex-1 items-center">
          <label className="mr-2">Distributor:</label>
          <input
            className="outline-none  flex-1 focus:outline-none border-b border-gray-300 dark:border-gray-600  border-dashed dark:bg-slate-800"
            placeholder="address"
            value={distributorAddress}
            onChange={(e) => {
              setDistributorAddress(e.target.value)
            }}
          ></input>
        </div>
        <p className="text-sm text-gray-500 mt-2">
          If set, only the distributor can push the funds to the recipients
        </p>
      </section>
    )
  }, [isFundNow, distributorAddress, distributionType])
  return (
    <div className='w-full mt-10'>
      <div className='text-xl'>Configuration</div>
      <div className="flex flex-1 py-2 w-full flex-col max-w-full border border-gray-400 dark:border-gray-600">
        <section className="flex justify-between items-center mt-2 px-2">
          <div className="flex flex-col">
            <h3>Mode</h3>
            <p className="text-sm text-gray-500">
              {distributionType === DistributionType.Push
                ? 'Transfer funds to the recipients'
                : 'The recipients will claim by themselves'}
            </p>
          </div>

          <div className="flex">
            <div className="flex items-center">
              <input
                className="cursor-pointer"
                value="true"
                type="radio"
                name="distributionType"
                onChange={() => setDistributionType(DistributionType.Pull)}
                id="distribution-pull"
              />
              <label className="p-2" htmlFor="distribution-pull">
                Pull
              </label>
            </div>
            <div className="flex items-center ml-5">
              <input
                className="cursor-pointer"
                value="false"
                type="radio"
                name="distributionType"
                id="distribution-push"
                onChange={() => setDistributionType(DistributionType.Push)}
                defaultChecked
              />
              <label className="p-2" htmlFor="distribution-push">
                Push
              </label>
            </div>
          </div>
        </section>
        <section className="flex text-left flex-col  justify-between items-center mt-2   p-2">
          <div className="flex w-full items-center justify-between">
            <label>Pay</label>
            <div className="flex">
              <div className="flex items-center">
                <input
                  className="cursor-pointer"
                  value="true"
                  onChange={() => setIsFundNow(true)}
                  type="radio"
                  name="isFundNow"
                  id="escrow-now"
                  defaultChecked
                />
                <label className="p-2" htmlFor="escrow-now">
                  Now
                </label>
              </div>
              <div className="flex items-center ml-5">
                <input
                  className="cursor-pointer"
                  value="false"
                  onChange={() => setIsFundNow(false)}
                  type="radio"
                  name="isFundNow"
                  id="escrow-later"
                />
                <label className="p-2" htmlFor="escrow-later">
                  Later
                </label>
              </div>
            </div>
          </div>
          <p className="text-sm text-gray-500 w-full">
            {isFundNow
              ? 'Fund the distribution now by you'
              : 'Fund the distribution later by anyone'}
          </p>
        </section>

        {renderDatePicker}
        {renderDistributor}
      </div>
    </div>

  )
}

export default PoolSetting
