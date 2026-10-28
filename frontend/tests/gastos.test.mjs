import { test, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { criarGasto, listarGastos, prepararGasto } from '../src/api/gastos.ts'
const original = globalThis.fetch
afterEach(() => { globalThis.fetch = original })
const entrada = () => ({ descricao: ' Transporte ', valor: '25,50', data: '2026-10-17', categoria: '', observacao: '' })
const json = (dados, status = 200) => new Response(JSON.stringify(dados), { status })

test('gasto preserva valor decimal e limita campos editaveis', () => {
  assert.deepEqual(prepararGasto({ ...entrada(), usuarioId: 'forjado' }), { ...entrada(), descricao: 'Transporte', valor: '25.50' })
  for (const valor of ['0', '-1', '1.001', '1e3', '1000000000000', '']) assert.throws(() => prepararGasto({ ...entrada(), valor }))
  for (const data of ['', '2026-02-30', '2026-13-01']) assert.throws(() => prepararGasto({ ...entrada(), data }))
})
test('gasto invalido nao consulta CSRF nem grava', async () => {
  let chamadas = 0
  globalThis.fetch = async () => { chamadas++; return json({}) }
  await assert.rejects(criarGasto('empresa', { ...entrada(), valor: '0' }))
  assert.equal(chamadas, 0)
})
test('gasto envia sessao CSRF e valor decimal textual sem repetir escrita', async () => {
  const chamadas = []
  globalThis.fetch = async (url, init) => { chamadas.push({ url, init }); return url.endsWith('/csrf') ? json({ headerName: 'X-CSRF-TOKEN', token: 'ficticio' }) : json({ id: 'exemplo' }, 201) }
  await criarGasto('empresa', entrada(), 'f80b0c87-7dd4-40b3-b0ed-088f8d08abbb')
  assert.equal(chamadas.length, 2)
  assert.equal(chamadas[1].init.credentials, 'same-origin')
  assert.equal(chamadas[1].init.headers['X-CSRF-TOKEN'], 'ficticio')
  assert.equal(chamadas[1].init.headers['Idempotency-Key'], 'f80b0c87-7dd4-40b3-b0ed-088f8d08abbb')
  assert.equal(JSON.parse(chamadas[1].init.body).valor, '25.50')
})
test('consulta separa empresa data e pagina e trata erro sem expor resposta', async () => {
  globalThis.fetch = async (url, init) => {
    assert.equal(url, '/api/estabelecimentos/a%2Fb/gastos?data=2026-10-17&pagina=1&tamanho=20')
    assert.equal(init.credentials, 'same-origin')
    return json({ itens: [], total: 0, totalGasto: 0 })
  }
  assert.equal((await listarGastos('a/b', '2026-10-17', 1)).totalGasto, 0)
  let chamadas = 0
  globalThis.fetch = async url => { chamadas++; return url.endsWith('/csrf') ? json({ headerName: 'X-CSRF-TOKEN', token: 'ficticio' }) : json({ detail: 'interno' }, 500) }
  await assert.rejects(criarGasto('empresa', entrada()), erro => !erro.message.includes('interno'))
  assert.equal(chamadas, 2)
})
