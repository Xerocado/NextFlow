import { test, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { centavos, prepararEntrega, prepararPagamento, criarEntrega, registrarPagamento, listarEntregas, consultarEntrega } from '../src/api/entregas.ts'

const original = globalThis.fetch
afterEach(() => { globalThis.fetch = original })
const entrada = () => ({ data: '2026-01-01', clienteId: null, identificacaoAvulso: ' Avulso ', litros: '10', valorTotal: '12,50', semCobranca: false, motivo: ' ' })

test('entrega valida litros, dinheiro exato, datas, cobrança e identificação', () => {
  assert.deepEqual(prepararEntrega({ ...entrada(), usuarioId: 'forjado' }), { data: '2026-01-01', clienteId: null, identificacaoAvulso: 'Avulso', litros: 10, valorTotal: '12.50', semCobranca: false, motivo: '' })
  for (const campos of [{ litros: '1.5' }, { litros: '0' }, { litros: '2147483648' }, { valorTotal: '1.001' }, { valorTotal: '-1' }, { valorTotal: '0' }, { data: '2026-02-30' }, { clienteId: 'cliente' }, { motivo: 'x'.repeat(501) }]) assert.throws(() => prepararEntrega({ ...entrada(), ...campos }))
  assert.equal(prepararEntrega({ ...entrada(), semCobranca: true, valorTotal: '0' }).valorTotal, '0')
  assert.equal(centavos('999999999999,99'), 99999999999999n)
})

test('pagamento rejeita data futura, zero e excesso sem arredondamento', () => {
  assert.deepEqual(prepararPagamento('2026-01-01', '0,10', '0.30'), { data: '2026-01-01', valor: '0.10' })
  for (const [data, valor] of [['9999-01-01', '1'], ['2026-02-30', '1'], ['2026-01-01', '0'], ['2026-01-01', '0.31'], ['2026-01-01', '0.301']]) assert.throws(() => prepararPagamento(data, valor, '0.30'))
})

test('cliente HTTP integra criação, listagem, detalhe e recebimento com CSRF por HTTP local', async () => {
  const chamadas = []
  const server = createServer(async (req, res) => {
    let body = ''
    for await (const parte of req) body += parte
    chamadas.push({ url: req.url, method: req.method, csrf: req.headers['x-csrf-token'], chave: req.headers['idempotency-key'], body: body ? JSON.parse(body) : null })
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify(req.url === '/api/auth/csrf' ? { headerName: 'X-CSRF-TOKEN', token: 'teste' } : req.method === 'POST' ? { id: 'registro' } : req.url.includes('?') ? { itens: [], total: 0, totalSaldoPendente: '0.00' } : { entrega: { id: 'registro' }, pagamentos: [] }))
  })
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve) })
  globalThis.fetch = (url, init) => {
    assert.equal(init.credentials, 'same-origin')
    assert.equal(init.cache, 'no-store')
    return original(`http://127.0.0.1:${server.address().port}${url}`, init)
  }
  try {
    await criarEntrega('a/b', entrada(), 'f80b0c87-7dd4-40b3-b0ed-088f8d08a6bb')
    await listarEntregas('a/b', '2026-01-01', '2026-01-31', true, 2)
    await consultarEntrega('a/b', 'c/d')
    await registrarPagamento('a/b', 'c/d', '2026-01-01', '2,50', '12.50', 'f80b0c87-7dd4-40b3-b0ed-088f8d08a6bc')
    assert.equal(chamadas[1].url, '/api/estabelecimentos/a%2Fb/entregas')
    assert.equal(chamadas[1].csrf, 'teste')
    assert.equal(chamadas[1].chave, 'f80b0c87-7dd4-40b3-b0ed-088f8d08a6bb')
    assert.deepEqual(chamadas[1].body, prepararEntrega(entrada()))
    assert.equal(chamadas[2].url, '/api/estabelecimentos/a%2Fb/entregas?inicio=2026-01-01&fim=2026-01-31&pendentes=true&pagina=2&tamanho=20')
    assert.equal(chamadas[3].url, '/api/estabelecimentos/a%2Fb/entregas/c%2Fd')
    assert.equal(chamadas[5].url, '/api/estabelecimentos/a%2Fb/entregas/c%2Fd/pagamentos')
    assert.equal(chamadas[5].csrf, 'teste')
    assert.equal(chamadas[5].chave, 'f80b0c87-7dd4-40b3-b0ed-088f8d08a6bc')
    assert.deepEqual(chamadas[5].body, { data: '2026-01-01', valor: '2.50' })
    await listarEntregas('a/b', null, null, true, 0)
    assert.equal(chamadas[6].url, '/api/estabelecimentos/a%2Fb/entregas?pendentes=true&pagina=0&tamanho=20')
    await assert.rejects(listarEntregas('a/b', null, null, false), /Informe o início e o fim/)
  } finally { globalThis.fetch = original; await new Promise(resolve => server.close(resolve)) }
})

test('falhas não repetem escritas nem expõem detalhes internos; período inválido não consulta', async () => {
  let chamadas = 0
  globalThis.fetch = async url => {
    chamadas++
    return new Response(JSON.stringify(url.endsWith('/csrf') ? { headerName: 'X-CSRF-TOKEN', token: 'teste' } : { detail: 'segredo-interno' }), { status: url.endsWith('/csrf') ? 200 : 400 })
  }
  await assert.rejects(criarEntrega('empresa', entrada()), e => !e.message.includes('segredo-interno'))
  assert.equal(chamadas, 2)
  await assert.rejects(listarEntregas('empresa', '2026-02-01', '2026-01-01'))
  assert.equal(chamadas, 2)
})
