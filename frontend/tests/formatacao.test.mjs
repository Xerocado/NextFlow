import { test } from 'node:test'
import assert from 'node:assert/strict'
import { reaisExatos } from '../src/formatacao.ts'

test('formata saldo agregado sem perder centavos nem precisão acima de Number', () => {
  assert.equal(reaisExatos('0.00'), 'R$ 0,00')
  assert.equal(reaisExatos('1234567.8'), 'R$ 1.234.567,80')
  assert.equal(reaisExatos('99999999999999.99'), 'R$ 99.999.999.999.999,99')
  assert.throws(() => reaisExatos('12.345'))
})
