import { useWeb3React } from '@web3-react/core'
import { BigNumber, Contract } from 'ethers'
import { splitSignature } from 'ethers/lib/utils'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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

const permitInfo: PermitInfo = {
  type: PermitType.AMOUNT,
  name: 'Uniswap',
}
const testPermitData = [
  '0x0000000000000000000000000000000000000000',
  '0x0000000000000000000000000000000000000000',
  '100000000000000',
  1659087718,
  28,
  '0xddc9bbf0565ea9496ec6b0f33164bcb0ccc2dfb17f9e4bd657ada532503d4211',
  '0x1d264db6322961eb06d6aea33013999b5a80a7c23d8accc57a03cbba4d71498e',
]

export function useERC20Permit(tokenAddress: string) {
  const { account, chainId, provider } = useWeb3React()
  const [nonce, setNonce] = useState<number>()
  const [isSupportPermit, setIsSupportPermit] = useState<boolean>(true)
  const eip2612TokenContract = useMemo(() => {
    if (!provider) return
    return new Contract(tokenAddress, EIP2612, provider)
  }, [provider, tokenAddress])
  const getNonce = useCallback(async (): Promise<number | undefined> => {
    if (!account || !eip2612TokenContract || !provider) return
    try {
      const accountNonce = await eip2612TokenContract.nonces(account)

      eip2612TokenContract.callStatic
        .permit(...testPermitData)
        .catch((err: Error) => {
          if (
            err.message.includes('Transaction reverted without a reason string')
          ) {
            setIsSupportPermit(false)
          }
        })
      return accountNonce.toNumber()
    } catch {
      return
    }
  }, [account, eip2612TokenContract])

  useEffect(() => {
    getNonce().then((nonce) => {
      if (nonce !== undefined) {
        setNonce(nonce)
      }
    })
  }, [getNonce])

  const getSignatureData = useCallback(
    async (
      amount: BigNumber,
      spender: string
    ): Promise<StandardSignatureData | null> => {
      if (
        !provider ||
        !account ||
        !chainId ||
        nonce === undefined ||
        !eip2612TokenContract
      )
        return null
      const signatureDeadline = Math.floor(Date.now() / 1000) + 10 * 60
      const permitInfoName = await eip2612TokenContract.name()
      console.log('permitInfoName', permitInfoName)
      const value = amount.toString()
      const message = {
        owner: account,
        spender,
        value,
        nonce,
        deadline: signatureDeadline,
      }
      const domain = {
        name: permitInfoName,
        verifyingContract: tokenAddress,
        chainId,
      }
      const signData = JSON.stringify({
        types: {
          EIP712Domain: EIP712_DOMAIN_TYPE_NO_VERSION,
          Permit: EIP2612_TYPE,
        },
        domain,
        primaryType: 'Permit',
        message,
      })
      console.log('signData', signData)
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
        amount: value,
        nonce: nonce,
        chainId,
        owner: account,
        spender,
        tokenAddress,
        permitType: permitInfo.type,
      }
    },
    [provider, account, chainId, nonce, isSupportPermit]
  )
  return { getSignatureData, isSupportPermit } as const
}
