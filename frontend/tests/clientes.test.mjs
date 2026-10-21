import { test, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { prepararCliente, listarClientes, salvarCliente } from '../src/api/clientes.ts'

const original = globalThis.fetch
afterEach(() => { globalThis.fetch = original })
const entrada = () => ({ nome: ' Cliente exemplo ', telefone: ' (11) 90000-0000 ', observacao: ' ' })
const json = (dados, status = 200) => new Response(JSON.stringify(dados), { status })

test('cliente normaliza opcionais e descarta identidade forjada', () => {
  assert.deepEqual(prepararCliente({ ...entrada(), usuarioId: 'forjado', estabelecimentoId: 'outra' }),
    { nome: 'Cliente exemplo', telefone: '(11) 90000-0000', observacao: '' })
  for (const campos of [{ nome: ' ' }, { nome: 'x'.repeat(121) }, { telefone: 'abc' }, { telefone: '1'.repeat(31) }, { observacao: 'x'.repeat(501) }]) {
    assert.throws(() => prepararCliente({ ...entrada(), ...campos }))
  }
})

test('cliente invalido nao consulta CSRF nem grava', async () => {
  globalThis.fetch = async () => { assert.fail('Não deve chamar a API') }
  await assert.rejects(salvarCliente('empresa', { ...entrada(), nome: '' }))
})

test('cadastro e edicao enviam somente campos editaveis, sessao e CSRF', async () => {
  const chamadas = []
  globalThis.fetch = async (url, init) => {
    chamadas.push({ url, init })
    return url.endsWith('/csrf') ? json({ headerName: 'X-CSRF-TOKEN', token: 'ficticio' }) : json({ id: 'exemplo' })
  }
  await salvarCliente('a/b', { ...entrada(), usuarioId: 'forjado' })
  await salvarCliente('a/b', entrada(), 'c/d')
  assert.equal(chamadas.length, 4)
  assert.equal(chamadas[1].url, '/api/estabelecimentos/a%2Fb/clientes')
  assert.equal(chamadas[1].init.method, 'POST')
  assert.equal(chamadas[3].url, '/api/estabelecimentos/a%2Fb/clientes/c%2Fd')
  assert.equal(chamadas[3].init.method, 'PUT')
  for (const { init } of [chamadas[1], chamadas[3]]) {
    assert.equal(init.credentials, 'same-origin')
    assert.equal(init.headers['X-CSRF-TOKEN'], 'ficticio')
    assert.deepEqual(JSON.parse(init.body), prepararCliente(entrada()))
  }
})

test('listagem usa empresa pagina e cancelamento', async () => {
  const controle = new AbortController()
  globalThis.fetch = async (url, init) => {
    assert.equal(url, '/api/estabelecimentos/a%2Fb/clientes?pagina=1&tamanho=20')
    assert.equal(init.cache, 'no-store')
    controle.abort()
    assert.equal(init.signal.aborted, true)
    return json({ itens: [], total: 0 })
  }
  assert.equal((await listarClientes('a/b', 1, controle.signal)).total, 0)
})

test('falhas de escrita nao repetem envio nem expoem resposta interna', async () => {
  let chamadas = 0
  globalThis.fetch = async url => {
    chamadas++
    return url.endsWith('/csrf') ? json({ headerName: 'X-CSRF-TOKEN', token: 'ficticio' }) : json({ detail: 'segredo-interno' }, 500)
  }
  await assert.rejects(salvarCliente('empresa', entrada()), erro => !erro.message.includes('segredo-interno'))
  assert.equal(chamadas, 2)
  globalThis.fetch = async () => { throw new Error('segredo-interno') }
  await assert.rejects(listarClientes('empresa'), erro => !erro.message.includes('segredo-interno'))
})
