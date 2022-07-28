import { useWeb3React } from '@web3-react/core'
import { BigNumber, Contract } from 'ethers'
import { splitSignature } from 'ethers/lib/utils'
import { useCallback } from 'react'
import EIP2612 from '../abis/eip2612.json'
import useSignerOrProvider from './useSignOrProvider'

enum PermitType {
  AMOUNT = 1,
  ALLOWED = 2,
}

export interface PermitInfo {
  type: PermitType
  name: string
  // version is optional, and if omitted, will not be included in the domain
  version?: string
}

interface BaseSignatureData {
  v: number
  r: string
  s: string
  deadline: number
  nonce: number
  owner: string
  spender: string
  chainId: number
  tokenAddress: string
  permitType: PermitType
}

interface StandardSignatureData extends BaseSignatureData {
  amount: string
}

interface AllowedSignatureData extends BaseSignatureData {
  allowed: true
}

export type SignatureData = StandardSignatureData | AllowedSignatureData

const EIP712_DOMAIN_TYPE = [
  { name: 'name', type: 'string' },
  { name: 'version', type: 'string' },
  { name: 'chainId', type: 'uint256' },
  { name: 'verifyingContract', type: 'address' },
]

const EIP712_DOMAIN_TYPE_NO_VERSION = [
  { name: 'name', type: 'string' },
  { name: 'chainId', type: 'uint256' },
  { name: 'verifyingContract', type: 'address' },
]

const EIP2612_TYPE = [
  { name: 'owner', type: 'address' },
  { name: 'spender', type: 'address' },
  { name: 'value', type: 'uint256' },
  { name: 'nonce', type: 'uint256' },
  { name: 'deadline', type: 'uint256' },
]

const PERMIT_ALLOWED_TYPE = [
  { name: 'holder', type: 'address' },
  { name: 'spender', type: 'address' },
  { name: 'nonce', type: 'uint256' },
  { name: 'expiry', type: 'uint256' },
  { name: 'allowed', type: 'bool' },
]

const permitInfo: PermitInfo = {
  type: PermitType.AMOUNT,
  name: 'dPool',
  version: 'v1',
}

export function useERC20Permit() {
  const { account, chainId, provider } = useWeb3React()
  const allowed = permitInfo.type === PermitType.ALLOWED
  const signatureDeadline = 5 * 60

  const getSignatureData = useCallback(
    async (
      tokenAddress: string,
      amount: BigNumber,
      spender: string
    ): Promise<SignatureData | null> => {
      if (!provider || !account || !chainId) return null
      const eip2612TokenContract = new Contract(tokenAddress, EIP2612, provider)
      let nonce = null
      try {
        nonce = (
          (await eip2612TokenContract.nonces(account)) as BigNumber
        ).toNumber()
      } catch {
        return null
      }
      if (nonce === null) return null
      const value = amount.toString()
      const message = allowed
        ? {
            holder: account,
            spender,
            allowed,
            nonce,
            expiry: signatureDeadline,
          }
        : {
            owner: account,
            spender,
            value,
            nonce,
            deadline: signatureDeadline,
          }
      const domain = permitInfo.version
        ? {
            name: permitInfo.name,
            version: permitInfo.version,
            verifyingContract: tokenAddress,
            chainId,
          }
        : {
            name: permitInfo.name,
            verifyingContract: tokenAddress,
            chainId,
          }
      const signData = JSON.stringify({
        types: {
          EIP712Domain: permitInfo.version
            ? EIP712_DOMAIN_TYPE
            : EIP712_DOMAIN_TYPE_NO_VERSION,
          Permit: allowed ? PERMIT_ALLOWED_TYPE : EIP2612_TYPE,
        },
        domain,
        primaryType: 'Permit',
        message,
      })
      const signerResponse = await provider.send('eth_signTypedData_v4', [
        account,
        signData,
      ])
      const parsedSignature = await splitSignature(signerResponse)
      const { v, r, s } = parsedSignature
      return {
        v,
        r,
        s,
        deadline: signatureDeadline,
        ...(allowed ? { allowed } : { amount: amount.toString() }),
        nonce: nonce,
        chainId,
        owner: account,
        spender,
        tokenAddress,
        permitType: permitInfo.type,
      }
    },
    [provider, account, chainId]
  )
  return getSignatureData
}
