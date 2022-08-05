import { useWeb3React } from '@web3-react/core'
import { BigNumber, constants, Contract } from 'ethers'
import {
  defaultAbiCoder,
  hexlify,
  hexZeroPad,
  keccak256,
  splitSignature,
  toUtf8Bytes,
} from 'ethers/lib/utils'
import { useCallback, useEffect, useMemo, useState } from 'react'
import EIP2612 from '../abis/eip2612.json'
import USDC_ABI from '../abis/usdc.json'

export enum PermitType {
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

// UNI token
export interface DomainNoVersion {
  name: string
  verifyingContract: string
  chainId: number
}
// eip2612 token
export type DomainWithVersion = DomainNoVersion & { version: string }
// polygon usdc
export type FreakDomainWithVersion = Omit<DomainWithVersion, 'chainId'> & {
  salt: string
}

export const EIP712_DOMAIN_TYPE = [
  { name: 'name', type: 'string' },
  { name: 'version', type: 'string' },
  { name: 'chainId', type: 'uint256' },
  { name: 'verifyingContract', type: 'address' },
]

export const FREAK_EIP712_DOMAIN_TYPE = [
  { name: 'name', type: 'string' },
  { name: 'version', type: 'string' },
  { name: 'verifyingContract', type: 'address' },
  { name: 'salt', type: 'bytes32' },
]

export const EIP712_DOMAIN_TYPE_NO_VERSION = [
  { name: 'name', type: 'string' },
  { name: 'chainId', type: 'uint256' },
  { name: 'verifyingContract', type: 'address' },
]

export const EIP2612_TYPE = [
  {
    name: 'owner',
    type: 'address',
  },
  {
    name: 'spender',
    type: 'address',
  },
  {
    name: 'value',
    type: 'uint256',
  },
  {
    name: 'nonce',
    type: 'uint256',
  },
  {
    name: 'deadline',
    type: 'uint256',
  },
]

const mainDomainTypeHash = keccak256(
  toUtf8Bytes(
    'EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)'
  )
)
const freakDomainTypeHash = keccak256(
  toUtf8Bytes(
    'EIP712Domain(string name,string version,address verifyingContract,bytes32 salt)'
  )
)

const testVersions = [
  '0',
  '1',
  '2',
  '3',
  '4',
  '5',
  'v0',
  'v1',
  'v2',
  'v3',
  'v4',
  'v5',
]
const testPermitData = [
  constants.AddressZero,
  constants.AddressZero,
  '100000000000000',
  Math.floor(Date.now() / 1000) + 60 * 30,
  28,
  '0xddc9bbf0565ea9496ec6b0f33164bcb0ccc2dfb17f9e4bd657ada532503d4211',
  '0x1d264db6322961eb06d6aea33013999b5a80a7c23d8accc57a03cbba4d71498e',
]

export function useERC20Permit(tokenAddress: string) {
  const { account, chainId, provider } = useWeb3React()
  const [nonce, setNonce] = useState<number>()
  const [isSupportPermit, setIsSupportPermit] = useState<boolean>(true)
  const [permitInfo, setPermitInfo] = useState<PermitInfo>()
  const [domain, setDomain] = useState<
    DomainNoVersion | DomainWithVersion | FreakDomainWithVersion
  >()
  const [domainType, setDomainType] = useState(EIP712_DOMAIN_TYPE)

  const eip2612TokenContract = useMemo(() => {
    if (!provider) return
    return new Contract(tokenAddress, EIP2612, provider)
  }, [provider, tokenAddress])

  // TODO:is permit method exist.
  useEffect(() => {
    if (!eip2612TokenContract) return
    eip2612TokenContract.callStatic
      .permit(...testPermitData)
      .catch((err: Error) => {
        console.error('callStatic.permit', err)
        if (
          err.message.includes('Transaction reverted without a reason string')
        ) {
          setIsSupportPermit(false)
        }
      })
  }, [])

  const getName = useCallback(async (): Promise<string | undefined> => {
    if (!eip2612TokenContract) return
    return await eip2612TokenContract.name()
  }, [eip2612TokenContract])

  const getNonce = useCallback(async (): Promise<number | undefined> => {
    if (!account || !eip2612TokenContract || BigNumber.from(tokenAddress).eq(0))
      return
    try {
      const accountNonce = await eip2612TokenContract.nonces(account)
      return accountNonce.toNumber()
    } catch {
      try {
        const accountNonce = await eip2612TokenContract.getNonce(account)
        return accountNonce.toNumber()
      } catch {
        return
      }
    }
  }, [account, eip2612TokenContract])

  const getDomainSeparator = useCallback(async (): Promise<
    string | undefined
  > => {
    if (!eip2612TokenContract) return
    try {
      return await eip2612TokenContract['DOMAIN_SEPARATOR']()
    } catch {
      try {
        return await eip2612TokenContract['getDomainSeparator']()
      } catch {
        try {
          // eg. sushi 1inch
          console.log('getDomainSeperator')
          return await eip2612TokenContract['getDomainSeperator']()
        } catch {
          return
        }
      }
    }
  }, [eip2612TokenContract])

  const matchDomainSeparator = useCallback(
    (contractDomainSeparator: string, tokenName: string) => {
      if (!chainId || !eip2612TokenContract) return
      const name = keccak256(toUtf8Bytes(tokenName))
      for (let i = 0; i < testVersions.length; i++) {
        // eip712 domain separator
        const domainSeparator = keccak256(
          defaultAbiCoder.encode(
            ['bytes32', 'bytes32', 'bytes32', 'uint256', 'address'],
            [
              mainDomainTypeHash,
              name,
              keccak256(toUtf8Bytes(testVersions[i])),
              chainId,
              tokenAddress,
            ]
          )
        )
        // polygon USDC weird domain separator
        const freakDomainSeparator = keccak256(
          defaultAbiCoder.encode(
            ['bytes32', 'bytes32', 'bytes32', 'address', 'uint256'],
            [
              freakDomainTypeHash,
              name,
              keccak256(toUtf8Bytes(testVersions[i])),
              tokenAddress,
              chainId,
            ]
          )
        )
        // eip2612
        if (contractDomainSeparator === domainSeparator) {
          setDomainType(EIP712_DOMAIN_TYPE)
          setDomain({
            name: tokenName,
            version: testVersions[i],
            chainId,
            verifyingContract: tokenAddress,
          })
          return testVersions[i]
        }

        // polygon USDC
        if (contractDomainSeparator === freakDomainSeparator) {
          setDomainType(FREAK_EIP712_DOMAIN_TYPE)
          setDomain({
            name: tokenName,
            version: testVersions[i],
            verifyingContract: tokenAddress,
            salt: hexZeroPad(hexlify(chainId), 32),
            // eg: chainId 137. salt = '0x0000000000000000000000000000000000000000000000000000000000000089',
          })
          return testVersions[i]
        }
      }
      return
    },
    [chainId, eip2612TokenContract, tokenAddress]
  )

  const flow = useCallback(async () => {
    if (!chainId || BigNumber.from(tokenAddress).eq(0)) return
    const name = await getName()
    if (!name) return
    try {
      // eip2612
      const contractDomainSeparator = await getDomainSeparator()
      console.log('contractDomainSeparator', contractDomainSeparator)
      if (contractDomainSeparator) {
        console.time('matchedVersionTime')
        const matchedVersion = await matchDomainSeparator(
          contractDomainSeparator,
          name
        )
        console.timeEnd('matchedVersionTime')
        console.log('matchedVersion', matchedVersion)
        if (matchedVersion !== undefined) {
          setPermitInfo({
            type: PermitType.AMOUNT,
            version: matchedVersion,
            name,
          })
        }
      } else {
        throw new Error('domainSeparator not found')
      }
    } catch (err) {
      // no version field.  eg:UNI token
      setDomainType(EIP712_DOMAIN_TYPE_NO_VERSION)
      setPermitInfo({
        type: PermitType.AMOUNT,
        name,
      })
      setDomain({
        name,
        verifyingContract: tokenAddress,
        chainId: chainId,
      })
    }
  }, [getDomainSeparator, matchDomainSeparator, getName, chainId])

  useEffect(() => {
    if (!isSupportPermit) return
    flow()
  }, [flow, isSupportPermit])

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
        !permitInfo ||
        nonce === undefined ||
        !eip2612TokenContract
      )
        return null
      const signatureDeadline = Math.floor(Date.now() / 1000) + 20 * 60
      const value = amount.toString()
      const message = {
        owner: account,
        spender,
        value,
        nonce,
        deadline: signatureDeadline,
      }
      const types = {
        types: {
          EIP712Domain: domainType,
          Permit: EIP2612_TYPE,
        },
        primaryType: 'Permit',
        domain,
        message,
      }
      const signData = JSON.stringify(types)
      const signerResponse = await provider.send('eth_signTypedData_v4', [
        account,
        signData,
      ])
      if (!signerResponse) return null
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
    [
      provider,
      account,
      chainId,
      nonce,
      isSupportPermit,
      permitInfo,
      domain,
      domainType,
    ]
  )
  return { getSignatureData, isSupportPermit } as const
}
