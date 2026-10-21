import { test } from 'node:test'
import assert from 'node:assert/strict'
import { filtrarHistorico, situacaoRegistro, totaisHistorico } from '../src/demo/filtrosHistorico.ts'
import { vendas, despesas, resumo } from '../src/demo/dados.ts'

const filtros = { busca: '', inicio: '', fim: '', dias: [], situacao: '', categoria: '' }
const linhas = [
  { id: '1', nome: 'João (exemplo)', descricao: 'Serviço A', data: '2026-09-15', valor: 25000, liquidado: 25000, clienteId: 'a' },
  { id: '2', nome: 'João (exemplo)', descricao: 'Serviço B', data: '2026-09-29', valor: 25000, liquidado: 10000, clienteId: 'a' },
  { id: '3', nome: 'João (exemplo)', descricao: 'Serviço C', data: '2026-09-30', valor: 20000, liquidado: 0, semCobranca: true, clienteId: 'a' },
  { id: '4', nome: 'Cliente B', descricao: 'Serviço D', data: '2026-09-29', valor: 10000, liquidado: 0, clienteId: 'b' },
]

test('busca por nome ignora acentos e conta todos os pedidos do cliente', () => {
  const resultado = filtrarHistorico(linhas, { ...filtros, busca: 'joao' })
  assert.deepEqual(resultado.map(l => l.id), ['3', '2', '1'])
  assert.deepEqual(totaisHistorico(resultado), {
    quantidade: 3, pagos: 1, parciais: 1, pendentes: 0, semCobranca: 1, recebido: 35000, saldo: 15000,
  })
})

test('dias separados e intervalo inclusivo sao combinados com cliente e situacao', () => {
  const resultado = filtrarHistorico(linhas, { ...filtros, inicio: '2026-09-15', fim: '2026-09-29', dias: ['2026-09-15', '2026-09-29', '2026-09-30'], clienteId: 'a' })
  assert.deepEqual(resultado.map(l => l.id), ['2', '1'])
  assert.deepEqual(filtrarHistorico(linhas, { ...filtros, situacao: 'Sem cobrança' }).map(l => l.id), ['3'])
  assert.equal(filtrarHistorico(linhas, { ...filtros, inicio: '2026-10-01', fim: '2026-09-01' }).length, 0)
})

test('situacao calculada distingue parcial e dispensa sem exigir motivo', () => {
  assert.equal(situacaoRegistro(linhas[0]), 'Pago')
  assert.equal(situacaoRegistro(linhas[1]), 'Parcialmente pago')
  assert.equal(situacaoRegistro(linhas[2]), 'Sem cobrança')
  assert.equal(situacaoRegistro(linhas[3]), 'Pendente')
  assert.equal(totaisHistorico([linhas[2]]).saldo, 0)
  assert.equal(totaisHistorico([]).quantidade, 0)
})

test('despesas podem ser pesquisadas por descricao, categoria, data e situacao', () => {
  const registros = despesas.map(d => ({ ...d, nome: d.descricao, liquidado: d.pago }))
  const resultado = filtrarHistorico(registros, { ...filtros, busca: 'manutencao', categoria: 'Operação', dias: ['2026-09-30'], situacao: 'Sem cobrança' })
  assert.equal(resultado.length, 1)
  assert.equal(totaisHistorico(resultado).saldo, 0)
  assert.equal(totaisHistorico(resultado).recebido, 0)
})

test('exemplos sem cobranca preservam valor de referencia sem virar faturamento ou divida', () => {
  assert.ok(vendas.some(v => v.semCobranca && !v.motivo))
  assert.ok(vendas.some(v => v.semCobranca && v.motivo))
  assert.equal(resumo('2026-09').faturamento, 20000)
  assert.equal(resumo('2026-09').pendente, 0)
  assert.equal(resumo('2026-09').recebido, 20000)
})
