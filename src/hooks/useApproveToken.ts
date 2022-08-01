import { BigNumber, Contract, ContractReceipt, ethers } from 'ethers'
import { isAddress } from 'ethers/lib/utils'
import { useCallback } from 'react'
import useSignerOrProvider from './useSignOrProvider'
import { hooks as metaMaskHooks } from '../connectors/metaMask'
import ERC20ABI from '../abis/erc20.json'
import { toast } from 'react-toastify'
const { useAccount, useChainId } = metaMaskHooks

type ApproveRes = [false] | [true, string | null]
export const useApproveToken = (dPoolAddress: string | undefined) => {
  const account = useAccount()
  const chainId = useChainId()
  const signerOrProvider = useSignerOrProvider()

  const getERC20TokenContract = useCallback(
    (tokenAddress: string) => {
      if (!signerOrProvider || !tokenAddress || !isAddress(tokenAddress))
        return null

      return new Contract(tokenAddress, ERC20ABI, signerOrProvider)
    },
    [signerOrProvider]
  )

  const getApprovedAmount = useCallback(
    async (tokenAddress: string): Promise<undefined | BigNumber> => {
      if (BigNumber.from(tokenAddress).eq(0)) return
      const tokenContract = getERC20TokenContract(tokenAddress)
      if (!tokenContract) return
      return await tokenContract.allowance(account, dPoolAddress)
    },
    [account, dPoolAddress]
  )

  const approve = useCallback(
    async (
      address: string,
      approveNum: BigNumber = ethers.constants.MaxUint256
    ): Promise<ApproveRes> => {
      if (!address || !isAddress(address) || !account || !dPoolAddress)
        return [false]
      if (BigNumber.from(address).eq(0)) return [true, null]
      const tokenContract = getERC20TokenContract(address)!
      // excludes native token
      if (BigNumber.from(address).eq(0)) return [true, null]
      try {
        const approveReq = await tokenContract.approve(dPoolAddress, approveNum)
        const approveRes: ContractReceipt = await approveReq.wait()
        const { transactionHash } = approveRes
        return [true, transactionHash]
      } catch (err: any) {
        toast.error(
          `${
            typeof err === 'object' ? err.message || JSON.stringify(err) : err
          }`
        )
        return [false]
      }
    },
    [chainId, account, dPoolAddress, getERC20TokenContract]
  )
  return { approveToken: approve, getApprovedAmount } as const
}
