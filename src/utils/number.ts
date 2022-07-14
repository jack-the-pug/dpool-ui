/**
 *  eg: input:     10000000.99
 *      output:  10,000,000.99
 */

export const addKilobits = (
  n: number | string,
  fixedDigit?: number
): string => {
  if (!n || typeof n !== 'number') n = 0
  let strN: string = n.toString()
  if (fixedDigit) {
    strN = n.toFixed(fixedDigit)
  }
  const [intPart, deciPart] = strN.toString().split('.')
  const localN = parseInt(intPart).toLocaleString()
  return deciPart ? `${localN}.${deciPart}` : localN
}
