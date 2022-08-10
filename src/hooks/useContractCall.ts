import { useWeb3React } from '@web3-react/core'
import { Contract, ContractReceipt, ethers } from 'ethers'
import { useCallback } from 'react'
import { toast } from 'react-toastify'
import { DPoolEvent } from '../type'
import useDPoolContract from './useDPool'
import DPoolABI from '../abis/dPool.json'

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
  return useCallback(
    async (method: string, params: any[]): Promise<CallResult> => {
      console.log('params', params)
      if (!contract)
        return {
          success: false,
          errMsg: 'contract not found',
        }
      try {
        const request = await contract[method](...params)
        const response: ContractReceipt = await request.wait()
        return {
          success: true,
          data: response,
        }
      } catch (err: any) {
        const errMsg = typeof err === 'object' ? err.message : err
        console.log('ERROR:', errMsg)
        toast.error(errMsg)
        return {
          success: false,
          errMsg,
        }
      }
    },
    [contract]
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
          console.log('parsedLog', parsedLog)
          return parsedLog
        })
        .filter((log) => log.name === eventName)
      return { success: true, data: { ...data, logs } }
    },
    [call]
  )
}
