import { BigNumber, ContractReceipt, ethers } from 'ethers'
import { useCallback, useMemo } from 'react'
import { hooks as metaMaskHooks } from '../../../connectors/metaMask'
import useDPoolFactory from '../../../hooks/useDPoolFactory'
import { chains, dPoolFactoryABI } from '../../../constants'
import { isAddress } from 'ethers/lib/utils'
import Action, { ActionState } from '../../../components/action'
import { useState } from 'react'
import { DPoolFactoryEvent } from '../../../type'
import useDPoolAddress from '../../../hooks/useDPoolAddress'
import { AddressLink } from '../../../components/hash'
import { toast, useToast } from 'react-toastify'
import { useNavigate } from 'react-router-dom'

const { useChainId, useAccount } = metaMaskHooks

export default function dPoolFactory() {
  const account = useAccount()
  const chainId = useChainId()
  const dPoolFactory = useDPoolFactory()
  const navigate = useNavigate()
  const { dPoolAddress, setDPoolAddress, getDPoolAddressByAccount } =
    useDPoolAddress()
  const [retrievePoolMsg, setRetrivePoolMsg] =
    useState<string>('Retrieve dPool')
  const [createDPoolState, setCreateDPoolState] = useState<ActionState>(
    ActionState.WAIT
  )
  const [tempDPoolAddress, setTempDPoolAddress] = useState<string>()
  const contractIface = new ethers.utils.Interface(dPoolFactoryABI)
  const createPool = useCallback(async () => {
    if (!dPoolFactory) {
      toast.error(`Unsupported chain: ${chainId}`)
      return
    }
    if (!account || !chainId) {
      toast.error(`Please connect your wallet first`)
      return
    }
    try {
      setCreateDPoolState(ActionState.ING)
      const contractReq = await dPoolFactory.create()
      const contractRes: ContractReceipt = await contractReq.wait()
      const { logs: _logs } = contractRes
      const logs = _logs.filter((log) =>
        BigNumber.from(log.address).eq(chains[chainId].dPoolFactoryAddress)
      )
      logs.forEach((log) => {
        const parseLog = contractIface.parseLog(log)
        if (parseLog.name === DPoolFactoryEvent.DistributionPoolCreated) {
          const dPoolAddress = parseLog.args.contractAddress.toLowerCase()
          setTempDPoolAddress(dPoolAddress)
          setCreateDPoolState(ActionState.SUCCESS)
        }
      })
    } catch {
      setCreateDPoolState(ActionState.FAILED)
    }
  }, [dPoolFactory, account, chainId])

  const findMyPool = useCallback(async () => {
    if (!account || !isAddress(account) || !chainId) {
      toast.error(`Please connect your wallet first`)
      return
    }
    if (!dPoolFactory) {
      toast.error(`Unsupported chain: ${chainId}`)
      return
    }
    const address = await getDPoolAddressByAccount(account)
    if (!address || !isAddress(address) || BigNumber.from(address).eq(0)) {
      setRetrivePoolMsg('Pool Not Found')
      return
    } else {
      setTempDPoolAddress(address)
    }
  }, [dPoolFactory, chainId, account, dPoolAddress])

  if (tempDPoolAddress && isAddress(tempDPoolAddress)) {
    return (
      <div className="flex flex-col items-center">
        <p>
          Congrats! Your dedicated dPool contract is deployed:{' '}
          <AddressLink address={tempDPoolAddress} />
        </p>
        <div
          onClick={() => {
            setDPoolAddress(tempDPoolAddress)
          }}
          className="text-green-500 cursor-pointer border-b border-green-500 my-4"
        >
          Get started -&gt;
        </div>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-center font-medium text-lg">
        Get your dedicated dPool contract
      </h1>
      <div className="my-8 flex gap-8">
        <div className="flex flex-col py-8 px-4 border border-gray-500 rounded-md">
          <div className="text-sm text-gray-500 mb-4">First time user?</div>
          <Action
            state={createDPoolState}
            stateMsgMap={{
              [ActionState.WAIT]: 'Create dPool',
              [ActionState.ING]: 'Creating',
              [ActionState.FAILED]: 'Failed.Retry',
              [ActionState.SUCCESS]: 'Created',
            }}
            onClick={createPool}
          />
        </div>
        <div className="flex flex-col py-8 px-4 border border-gray-500 rounded-md">
          <div className="text-sm text-gray-500 mb-4">
            Already have a dPool contract?{' '}
          </div>
          <button
            onClick={findMyPool}
            className="border border-gray-900 px-2 rounded-md"
          >
            {retrievePoolMsg}
          </button>
        </div>
      </div>
    </div>
  )
}
