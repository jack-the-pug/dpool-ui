import { expect, test } from 'vitest'
import { addKilobits } from '../utils/number'

const testNum = [
  9999999,
  9,
  0,
  null,
  undefined,
  999999.0,
  99999.99999,
  '9999',
  'test',
  'test.tt',
]

test('number format', () => {
  expect(testNum.map((n: any) => addKilobits(n))).toMatchInlineSnapshot(`
    [
      "9,999,999",
      "9",
      "0",
      "0",
      "0",
      "999,999",
      "99,999.99999",
      "0",
      "0",
      "0",
    ]
  `)
})

test('format number and fixed', () => {
  expect(testNum.map((n: any) => addKilobits(n, 2))).toMatchInlineSnapshot(`
    [
      "9,999,999.00",
      "9.00",
      "0.00",
      "0.00",
      "0.00",
      "999,999.00",
      "100,000.00",
      "0.00",
      "0.00",
      "0.00",
    ]
  `)
})
