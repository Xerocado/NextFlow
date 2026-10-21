import { test } from 'node:test'
import assert from 'node:assert/strict'
import { resumo, vendas, despesas } from '../src/demo/dados.ts'

test('exemplo de outubro separa faturamento, recebido, pendente e despesas pagas', () => {
  assert.deepEqual(resumo('2026-10'), {
    faturamento: 123000, recebido: 76000, pago: 35000,
    saldo: 41000, pendente: 47000, vencido: 15000,
  })
  const parcial = vendas.find(v => v.id === 'v1')
  assert.equal(parcial.valor - parcial.recebido, 15000)
})

test('filtro de periodo nao mistura meses nem contabiliza despesa futura como paga', () => {
  assert.deepEqual(resumo('2026-09'), {
    faturamento: 20000, recebido: 20000, pago: 22000,
    saldo: -2000, pendente: 0, vencido: 0,
  })
  assert.equal(despesas.find(d => d.id === 'd3').pago, 0)
  assert.deepEqual(resumo('2026-08'), {
    faturamento: 0, recebido: 0, pago: 0, saldo: 0, pendente: 0, vencido: 0,
  })
})
