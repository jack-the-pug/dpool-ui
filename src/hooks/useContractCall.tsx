import { useCallback } from 'react'
import { Contract, ContractReceipt, ethers } from 'ethers'
import { toast } from 'react-toastify'
import { DPoolEvent } from '../type'
import DPoolABI from '../abis/dPool.json'
import { useDPoolContract } from './useContract'
import { TranSactionHash } from '../components/hash'
import { useWeb3React } from '@web3-react/core'
import { chains } from '../constants'

interface CallFailed {
  success: false
  errMsg: string
}

interface CallSuccess {
  success: boolean
  data: ContractReceipt
}
type CallResult = CallFailed | CallSuccess

const dPoolInterface = new ethers.utils.Interface(DPoolABI)
export function useCallContract(contract: Contract | undefined) {
  const { chainId } = useWeb3React()
  return useCallback(
    async (method: string, params: any[]): Promise<CallResult> => {
      console.log('call contract ===', method, params)
      if (!contract || !chainId || !chains[chainId])
        return {
          success: false,
          errMsg: 'contract not found',
        }
      try {
        const request = await contract[method](...params)
        // wait block confirm
        const response: ContractReceipt = await request.wait(1)
        const { transactionHash } = response
        toast.success(
          <div>
            <span className='font-bold text-black'>Transaction Confirmed:</span>
            <br></br>
            <TranSactionHash hash={transactionHash}>
              {transactionHash.slice(0, 30)}...
            </TranSactionHash>
          </div>,
          { autoClose: false }
        )
        await request.wait(chains[chainId].isTestNet ? 2 : 6)

        return {
          success: true,
          data: response,
        }
      } catch (err: any) {
        const errMsg = typeof err === 'object' ? err.reason || err.message : err
        toast.error(errMsg)
        return {
          success: false,
          errMsg,
        }
      }
    },
    [contract, chainId]
  )
}

export function useCallDPoolContract(dPoolAddress: string) {
  const dPoolContract = useDPoolContract(dPoolAddress)
  const call = useCallContract(dPoolContract)
  return useCallback(
    async (method: string, params: any[], eventName: DPoolEvent) => {
      const callResult = await call(method, params)
      if (!callResult.success) return callResult
      const { data } = callResult
      const logs = data.logs
        .filter(
          (log) => log.address.toLowerCase() === dPoolAddress.toLowerCase()
        )
        .map((log) => {
          const parsedLog = dPoolInterface.parseLog(log)
          return parsedLog
        })
        .filter((log) => log.name === eventName)
      return { success: true, data: { ...data, logs } }
    },
    [call]
  )
}
