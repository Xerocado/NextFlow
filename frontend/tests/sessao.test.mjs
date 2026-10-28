import { test } from 'node:test'
import assert from 'node:assert/strict'
import { fetchAutenticado, confirmarSessao, SESSAO_EXPIRADA } from '../src/api/sessao.ts'
import { entrar } from '../src/api/auth.ts'

async function comAmbiente(executar) {
  const fetchAnterior = globalThis.fetch, janelaAnterior = globalThis.window
  const janela = new EventTarget()
  let eventos = 0
  janela.addEventListener(SESSAO_EXPIRADA, () => eventos++)
  globalThis.window = janela
  confirmarSessao()
  try { await executar(() => eventos) }
  finally {
    globalThis.fetch = fetchAnterior
    if (janelaAnterior === undefined) delete globalThis.window
    else globalThis.window = janelaAnterior
  }
}

test('401 concorrentes notificam uma vez e não repetem requisições', () => comAmbiente(async eventos => {
  const concluir = []
  let envios = 0
  const init = { method: 'POST', body: '{}', credentials: 'same-origin', cache: 'no-store' }
  globalThis.fetch = (url, opcoes) => {
    assert.equal(url, '/api/exemplo')
    assert.equal(opcoes, init)
    envios++
    return new Promise(ok => concluir.push(ok))
  }
  const a = fetchAutenticado('/api/exemplo', init), b = fetchAutenticado('/api/exemplo', init)
  concluir[0](new Response(null, { status: 401 }))
  assert.equal((await a).status, 401)
  concluir[1](new Response(null, { status: 401 }))
  assert.equal((await b).status, 401)
  assert.equal(eventos(), 1)
  assert.equal(envios, 2)
}))

test('401 atrasado de uma sessão anterior não encerra um novo login', () => comAmbiente(async eventos => {
  let concluir
  globalThis.fetch = () => new Promise(ok => { concluir = ok })
  const antigo = fetchAutenticado('/api/exemplo')
  confirmarSessao()
  concluir(new Response(null, { status: 401 }))
  await antigo
  assert.equal(eventos(), 0)
  globalThis.fetch = async () => new Response(null, { status: 401 })
  await fetchAutenticado('/api/exemplo')
  assert.equal(eventos(), 1)
}))

test('resposta de consulta cancelada não dispara expiração', () => comAmbiente(async eventos => {
  const controle = new AbortController()
  let concluir
  globalThis.fetch = () => new Promise(ok => { concluir = ok })
  const consulta = fetchAutenticado('/api/exemplo', { signal: controle.signal })
  controle.abort()
  concluir(new Response(null, { status: 401 }))
  await consulta
  assert.equal(eventos(), 0)
}))

test('403 e falha de rede preservam o resultado sem encerrar sessão', () => comAmbiente(async eventos => {
  const negada = new Response(null, { status: 403 })
  globalThis.fetch = async () => negada
  assert.equal(await fetchAutenticado('/api/exemplo'), negada)
  const erro = new Error('Rede indisponível')
  globalThis.fetch = async () => { throw erro }
  await assert.rejects(fetchAutenticado('/api/exemplo'), e => e === erro)
  assert.equal(eventos(), 0)
}))

test('senha incorreta no login não é tratada como expiração da sessão', () => comAmbiente(async eventos => {
  globalThis.fetch = async url => url.endsWith('/csrf')
    ? Response.json({ headerName: 'X-CSRF-TOKEN', token: 'ficticio' })
    : new Response(null, { status: 401 })
  await assert.rejects(entrar('ficticio@example.test', 'senha ficticia'), /E-mail ou senha incorretos/)
  assert.equal(eventos(), 0)
}))
