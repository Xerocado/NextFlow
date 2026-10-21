import { test, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { consultarSessao, entrar, sair, solicitarRecuperacao, redefinirSenha, cadastrarConta, ApiError } from '../src/api/auth.ts'

const original = globalThis.fetch
afterEach(() => { globalThis.fetch = original })
const json = (value, status = 200) => new Response(JSON.stringify(value), { status })
const token = () => json({ headerName: 'X-CSRF-TOKEN', token: 'codigo-ficticio' })

test('redefinicao rejeita senha atual com mensagem especifica sem expor detalhe interno', async () => {
  globalThis.fetch = async url => url.endsWith('/csrf') ? token() : json({ detail: 'interno' }, 422)
  await assert.rejects(redefinirSenha('012345', 'senha ficticia longa', 'teste@example.test'), /A nova senha deve ser diferente da senha atual/)
})

test('cadastro envia dados e CSRF sem iniciar login automaticamente', async () => {
  const chamadas = []
  globalThis.fetch = async (url, init) => {
    chamadas.push({ url, init })
    return url.endsWith('/csrf') ? token() : new Response(null, { status: 201 })
  }
  await cadastrarConta('Pessoa exemplo', 'cadastro@example.test', 'senha ficticia longa')
  assert.deepEqual(chamadas.map(c => c.url), ['/api/auth/csrf', '/api/auth/cadastro'])
  assert.equal(chamadas[1].init.method, 'POST')
  assert.equal(chamadas[1].init.credentials, 'same-origin')
  assert.equal(chamadas[1].init.headers['X-CSRF-TOKEN'], 'codigo-ficticio')
  assert.deepEqual(JSON.parse(chamadas[1].init.body), {
    nome: 'Pessoa exemplo', email: 'cadastro@example.test', senha: 'senha ficticia longa',
  })
})

test('cadastro trata conflito e validacao sem expor resposta interna', async () => {
  for (const [status, mensagem] of [[409, /Se já possui uma conta/], [400, /Confira o nome/]]) {
    globalThis.fetch = async url => url.endsWith('/csrf') ? token() : json({ detail: 'detalhe interno' }, status)
    await assert.rejects(cadastrarConta('Teste', 'cadastro@example.test', 'senha ficticia longa'), mensagem)
  }
})

test('cadastro nao envia credenciais se a obtencao de CSRF falhar', async () => {
  const urls = []
  globalThis.fetch = async url => { urls.push(url); return new Response(null, { status: 503 }) }
  await assert.rejects(cadastrarConta('Teste', 'cadastro@example.test', 'senha ficticia longa'))
  assert.deepEqual(urls, ['/api/auth/csrf'])
})

test('401 significa deslogado, falha de rede permanece um erro', async () => {
  globalThis.fetch = async () => new Response(null, { status: 401 })
  assert.equal(await consultarSessao(), null)
  globalThis.fetch = async () => { throw new TypeError('offline') }
  await assert.rejects(consultarSessao(), /Não foi possível conectar/)
})

test('login envia CSRF e formulario, consulta perfil com cookie da mesma origem', async () => {
  const chamadas = []
  globalThis.fetch = async (url, init) => {
    chamadas.push({ url, init })
    if (url.endsWith('/csrf')) return token()
    if (url.endsWith('/login')) return new Response(null, { status: 204 })
    return json({ id: 'id-ficticio', email: 'teste@example.test' })
  }
  assert.equal((await entrar('teste@example.test', 'senha ficticia longa')).id, 'id-ficticio')
  assert.deepEqual(chamadas.map(c => c.url), ['/api/auth/csrf', '/api/auth/login', '/api/auth/me'])
  assert.equal(chamadas[1].init.headers['X-CSRF-TOKEN'], 'codigo-ficticio')
  assert.equal(chamadas[1].init.body.get('password'), 'senha ficticia longa')
  assert.ok(chamadas.every(c => c.init.credentials === 'same-origin' && c.init.cache === 'no-store'))
})

test('credencial invalida tem mensagem propria', async () => {
  globalThis.fetch = async url => url.endsWith('/csrf') ? token() : new Response(null, { status: 401 })
  await assert.rejects(entrar('teste@example.test', 'senha invalida'), /E-mail ou senha incorretos/)
})

test('403 e 429 nao sao apresentados como senha incorreta', async () => {
  for (const status of [403, 429]) {
    globalThis.fetch = async url => url.endsWith('/csrf') ? token() : new Response(null, { status })
    await assert.rejects(entrar('teste@example.test', 'senha ficticia longa'), erro => {
      assert.ok(erro instanceof ApiError)
      assert.equal(erro.status, status)
      assert.doesNotMatch(erro.message, /senha incorret/)
      return true
    })
  }
})

test('falha ao obter CSRF impede POST', async () => {
  let chamadas = 0
  globalThis.fetch = async () => { chamadas++; return new Response(null, { status: 503 }) }
  await assert.rejects(entrar('teste@example.test', 'senha ficticia longa'), /indisponível/)
  assert.equal(chamadas, 1)
})

test('logout solicita token novo e envia POST', async () => {
  const chamadas = []
  globalThis.fetch = async (url, init) => {
    chamadas.push({ url, init })
    return url.endsWith('/csrf') ? token() : new Response(null, { status: 204 })
  }
  await sair()
  assert.equal(chamadas[1].url, '/api/auth/logout')
  assert.equal(chamadas[1].init.method, 'POST')
  assert.equal(chamadas[1].init.headers['X-CSRF-TOKEN'], 'codigo-ficticio')
})

test('falha no logout nao informa sucesso', async () => {
  globalThis.fetch = async url => url.endsWith('/csrf') ? token() : new Response(null, { status: 503 })
  await assert.rejects(sair(), /indisponível/)
})

test('recuperacao envia apenas email e CSRF, sem depender de conta existente', async () => {
  const chamadas = []
  globalThis.fetch = async (url, init) => {
    chamadas.push({ url, init })
    return url.endsWith('/csrf') ? token() : json({ mensagem: 'Resposta generica' }, 202)
  }
  assert.equal(await solicitarRecuperacao('teste@example.test'), undefined)
  assert.equal(chamadas[1].url, '/api/auth/recuperar-senha')
  assert.equal(chamadas[1].init.headers['X-CSRF-TOKEN'], 'codigo-ficticio')
  assert.deepEqual(JSON.parse(chamadas[1].init.body), { email: 'teste@example.test' })
})

test('redefinicao envia codigo no corpo JSON e trata expiracao', async () => {
  const chamadas = []
  globalThis.fetch = async (url, init) => {
    chamadas.push({ url, init })
    return url.endsWith('/csrf') ? token() : new Response(null, { status: 204 })
  }
  await redefinirSenha('012345', 'senha ficticia longa', 'teste@example.test')
  assert.equal(chamadas[1].url, '/api/auth/redefinir-senha')
  assert.equal(chamadas[1].init.headers['X-CSRF-TOKEN'], 'codigo-ficticio')
  assert.deepEqual(JSON.parse(chamadas[1].init.body), { email: 'teste@example.test', token: '012345', novaSenha: 'senha ficticia longa' })
  globalThis.fetch = async url => url.endsWith('/csrf') ? token() : new Response(null, { status: 400 })
  await assert.rejects(redefinirSenha('012345', 'senha ficticia longa', 'teste@example.test'), /Confira o e-mail, o código/)
})
