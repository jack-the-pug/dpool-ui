import { BigNumber, utils } from 'ethers'
import { TokenMeta } from '../type'

export function parsed2NumberString(
  str: string | number | null | undefined
): string {
  if (!str) return '0'
  const parsedNumber = Number(str)
  return isNaN(parsedNumber) ? '0' : str.toString()
}

const kilobitsReg = /\B(?=(\d{3})+(?!\d))/g

export const formatCurrencyAmount = (
  amount: BigNumber,
  tokenMeta?: TokenMeta,
  formatLen: number = 2
) => {
  const readableAmount = utils.formatUnits(
    amount,
    tokenMeta ? tokenMeta.decimals : 18
  )
  const [integer, _fractional] = readableAmount.split('.')
  let fractional = ''
  if (_fractional) {
    let zeroLen = 0
    for (let i = 0; i < _fractional.length; i++) {
      if (_fractional[i] === '0') {
        zeroLen++
      } else {
        break
      }
    }
    fractional = _fractional.substring(0, zeroLen + formatLen)
  }
  return `${integer.replace(kilobitsReg, ',')}.${fractional}`
}

export function parsedNumberByDecimal(strNumber: string, decimal: number) {
  const [intPart, decimalPart] = strNumber.split('.')
  if (!decimalPart) return strNumber
  if (decimalPart.length > decimal) {
    return `${intPart}.${decimalPart.slice(0, decimal)}`
  }
  return strNumber
}
