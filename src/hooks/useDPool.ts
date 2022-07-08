import { useWeb3React } from '@web3-react/core'
import { Contract, ContractInterface } from 'ethers'
import { isAddress } from 'ethers/lib/utils'
import { useEffect, useMemo, useState } from 'react'
import useSignerOrProvider from './useSignOrProvider'
import { hooks as metaMaskHooks } from '../connectors/metaMask'
import { dPoolABI } from '../constants'

export default function useDPool(poolAddress: string | undefined) {
  const { provider } = useWeb3React()
  const signerOrProvider = useSignerOrProvider()

  const [isContractExist, setIsContractExist] = useState(false)
  useEffect(() => {
    if (!poolAddress || !provider) return
    provider.getCode(poolAddress).then((code: string) => {
      if (code.length > 2) setIsContractExist(true)
    })
  }, [provider, poolAddress])

  const contract = useMemo(() => {
    if (
      !signerOrProvider ||
      !poolAddress ||
      !isAddress(poolAddress) ||
      !isContractExist
    )
      return null
    return new Contract(poolAddress, dPoolABI, signerOrProvider)
  }, [signerOrProvider, poolAddress, isContractExist])
  return contract
}
