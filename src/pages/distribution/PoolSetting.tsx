import { utils } from 'ethers'
import { useEffect } from 'react'
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
  const setAddress = (address: string) => {
    if (!address || !utils.isAddress(address)) return
    setDistributorAddress(address)
  }
  useEffect(() => {
    const config = {
      isFundNow,
      distributionType,
      distributor: distributorAddress,
      date,
    }
    setPoolConfig(config)
  }, [isFundNow, distributionType, distributorAddress, date])
  return (
    <div className="flex flex-1 w-full flex-col mt-10 max-w-full">
      <section className="flex justify-between items-center my-2 border border-gray-400 px-2 py-4">
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
      <section className="flex text-left flex-col  justify-between items-center my-2 border border-gray-400 p-2">
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

      {distributionType === DistributionType.Push ? null : (
        <section className="flex flex-col justify-between  my-2 border border-gray-400 p-2">
          <label className="mb-2">Claimable Time Range</label>
          <DateRangePicker setDate={setDate} />
        </section>
      )}

      {distributionType === DistributionType.Push && !isFundNow && (
        <section className="flex w-full flex-col justify-between  my-2 border border-gray-400 px-2 py-4">
          <div className="flex flex-1 items-center">
            <label className="italic mr-2">Distributor:</label>
            <input
              className="outline-none bg-neutral-200  flex-1 focus:outline-none border-b border-gray-300  border-dashed"
              placeholder="address"
              value={distributorAddress}
              onChange={(e) => setAddress(e.target.value)}
            ></input>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            If set, only the distributor can push the funds to the recipients
          </p>
        </section>
      )}
    </div>
  )
}

export default PoolSetting
