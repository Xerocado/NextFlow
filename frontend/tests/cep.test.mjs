import { test, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { buscarEnderecoCep } from '../src/api/cep.ts'

const original = globalThis.fetch
afterEach(() => { globalThis.fetch = original })
const exemplo = { logradouro: 'Rua de exemplo', bairro: 'Bairro exemplo', localidade: 'Cidade exemplo', uf: 'SP' }
const json = dados => new Response(JSON.stringify(dados))

test('consulta CEP com ou sem hifen sem enviar cookies, corpo ou referencia da pagina', async () => {
  const chamadas = []
  globalThis.fetch = async (url, init) => { chamadas.push({ url, init }); return json(exemplo) }
  for (const cep of ['01001-000', '01001000']) {
    assert.deepEqual(await buscarEnderecoCep(cep), { logradouro: exemplo.logradouro, bairro: exemplo.bairro, cidade: exemplo.localidade, uf: 'SP' })
  }
  for (const {url, init} of chamadas) {
    assert.equal(url, 'https://viacep.com.br/ws/01001000/json/')
    assert.equal(init.credentials, 'omit')
    assert.equal(init.referrerPolicy, 'no-referrer')
    assert.equal(init.body, undefined)
    assert.ok(init.signal instanceof AbortSignal)
  }
})

test('CEP invalido e rejeitado antes de chamar servico externo', async () => {
  globalThis.fetch = () => { throw Error('Nao deveria consultar') }
  for (const cep of ['', '123', '01001A00', '../teste', '010010000', '0100-1000']) {
    await assert.rejects(buscarEnderecoCep(cep), /8 dígitos/)
  }
})

test('CEP inexistente tem mensagem propria', async () => {
  for (const erro of [true, 'true']) {
    globalThis.fetch = async () => json({ erro })
    await assert.rejects(buscarEnderecoCep('99999999'), /CEP não encontrado/)
  }
})

test('falha HTTP, rede, JSON e cancelamento permitem preenchimento manual', async () => {
  for (const resposta of [async () => new Response(null, { status: 503 }), async () => { throw Error('interno') }, async () => new Response('invalido')]) {
    globalThis.fetch = resposta
    await assert.rejects(buscarEnderecoCep('01001000'), /preencha o endereço manualmente/)
  }
  const controle = new AbortController()
  controle.abort()
  globalThis.fetch = async (_url, init) => { init.signal.throwIfAborted() }
  await assert.rejects(buscarEnderecoCep('01001000', controle.signal), /preencha o endereço manualmente/)
})

test('resposta incompleta ou fora dos limites e rejeitada; CEP geral aceita rua e bairro vazios', async () => {
  for (const dados of [null, {}, { ...exemplo, uf: 'estado' }, { ...exemplo, bairro: 10 }, { ...exemplo, logradouro: 'a'.repeat(151) }]) {
    globalThis.fetch = async () => json(dados)
    await assert.rejects(buscarEnderecoCep('01001000'), /endereço inválido/)
  }
  globalThis.fetch = async () => json({ ...exemplo, logradouro: '', bairro: '' })
  assert.equal((await buscarEnderecoCep('01001000')).logradouro, '')
})
