import { test, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { listarEmpresas, salvarNomeEmpresa, consultarEmpresa, salvarDadosEmpresa } from '../src/api/estabelecimentos.ts'
const original = globalThis.fetch
afterEach(() => { globalThis.fetch = original })
const json = (dados, status = 200) => new Response(JSON.stringify(dados), { status })
const empresa = { id: 'id-exemplo', nome: 'Empresa exemplo', ativo: true, moeda: 'BRL', fuso: 'America/Sao_Paulo' }

test('lista todas as paginas com sessao e sem cache', async () => {
  const urls = []
  globalThis.fetch = async (url, init) => {
    urls.push(url)
    assert.equal(init.credentials, 'same-origin')
    assert.equal(init.cache, 'no-store')
    return json({ itens: [empresa], total: 2 })
  }
  assert.equal((await listarEmpresas()).length, 2)
  assert.deepEqual(urls, ['/api/estabelecimentos?pagina=0&tamanho=100', '/api/estabelecimentos?pagina=1&tamanho=100'])
})

test('cria e renomeia enviando somente nome com CSRF novo', async () => {
  const chamadas = []
  globalThis.fetch = async (url, init) => {
    chamadas.push({url, init})
    return url === '/api/auth/csrf' ? json({headerName:'X-CSRF-TOKEN',token:'teste'}) : json(empresa)
  }
  await salvarNomeEmpresa(empresa.nome)
  await salvarNomeEmpresa(empresa.nome, empresa.id)
  assert.equal(chamadas[1].url, '/api/estabelecimentos')
  assert.equal(chamadas[1].init.method, 'POST')
  assert.equal(chamadas[3].url, '/api/estabelecimentos/id-exemplo/nome')
  assert.equal(chamadas[3].init.method, 'PUT')
  for (const indice of [1,3]) {
    assert.equal(chamadas[indice].init.headers['X-CSRF-TOKEN'], 'teste')
    assert.deepEqual(JSON.parse(chamadas[indice].init.body), {nome:empresa.nome})
  }
})

test('falha no CSRF impede gravacao e erros nao expõem detalhes internos', async () => {
  let chamadas = 0
  globalThis.fetch = async () => { chamadas++; return json({detail:'interno'},403) }
  await assert.rejects(salvarNomeEmpresa('Teste'), /segurança expirou/)
  assert.equal(chamadas, 1)
  for (const [status, mensagem] of [[401,/sessão expirou/],[404,/sem permissão/],[500,/Não foi possível/]]) {
    globalThis.fetch = async () => json({detail:'interno'},status)
    await assert.rejects(listarEmpresas(), mensagem)
  }
})

test('consulta e salva dados com CSRF e contexto da sessao', async () => {
  const chamadas = []
  const dados = { atividade: 'servicos', telefone: '', cep: '', logradouro: '', numero: null, complemento: '', bairro: '', cidade: '', uf: '', semNumero: true }
  globalThis.fetch = async (url, init) => {
    chamadas.push({ url, init })
    return url === '/api/auth/csrf' ? json({ headerName: 'X-CSRF-TOKEN', token: 'teste' }) : json({ ...empresa, dados })
  }
  assert.deepEqual((await consultarEmpresa(empresa.id)).dados, dados)
  await salvarDadosEmpresa(empresa.id, dados)
  assert.equal(chamadas[2].url, '/api/estabelecimentos/id-exemplo/dados')
  assert.equal(chamadas[2].init.method, 'PUT')
  assert.equal(chamadas[2].init.credentials, 'same-origin')
  assert.equal(chamadas[2].init.headers['X-CSRF-TOKEN'], 'teste')
  assert.deepEqual(JSON.parse(chamadas[2].init.body), dados)
})

const dadosValidos = () => ({ atividade: 'servicos', telefone: '', cep: '', logradouro: '', numero: null,
  complemento: '', bairro: '', cidade: '', uf: '', semNumero: true })

test('dados invalidos nao fazem nem a busca de CSRF', async () => {
  let chamadas = 0
  globalThis.fetch = async () => { chamadas++; return json(empresa) }
  await assert.rejects(salvarDadosEmpresa(empresa.id, { ...dadosValidos(), atividade: 'invalida' }), /atividade/)
  assert.equal(chamadas, 0)
})

test('falha de CSRF impede a gravacao de dados complementares', async () => {
  const chamadas = []
  globalThis.fetch = async url => { chamadas.push(url); return json({ token: 'interno' }, 403) }
  await assert.rejects(salvarDadosEmpresa(empresa.id, dadosValidos()), /segurança expirou/)
  assert.deepEqual(chamadas, ['/api/auth/csrf'])
})

test('gravacao falha sem sucesso aparente nem repeticao automatica', async () => {
  for (const [status, mensagem] of [[400, /campos/], [401, /sessão expirou/], [403, /segurança expirou/],
    [404, /sem permissão/], [429, /Muitas tentativas/], [500, /Não foi possível/]]) {
    const chamadas = []
    globalThis.fetch = async url => {
      chamadas.push(url)
      return url === '/api/auth/csrf' ? json({ headerName: 'X-CSRF-TOKEN', token: 'teste' }) : json({ detail: 'segredo-interno' }, status)
    }
    await assert.rejects(salvarDadosEmpresa(empresa.id, dadosValidos()), erro => mensagem.test(erro.message) && !erro.message.includes('segredo-interno'))
    assert.equal(chamadas.length, 2)
  }
})

test('falha de rede em escrita nao repete e nao aparece como sucesso', async () => {
  let gravacoes = 0
  globalThis.fetch = async url => {
    if (url === '/api/auth/csrf') return json({ headerName: 'X-CSRF-TOKEN', token: 'teste' })
    gravacoes++; throw new TypeError('detalhe da rede')
  }
  await assert.rejects(salvarDadosEmpresa(empresa.id, dadosValidos()), /Não foi possível conectar/)
  assert.equal(gravacoes, 1)
})

test('consulta cancelada rejeita e permite uma nova tentativa independente', async () => {
  const controle = new AbortController()
  let signal
  globalThis.fetch = async (_url, init) => {
    signal = init.signal
    return new Promise((_resolve, reject) => init.signal.addEventListener('abort', () => reject(new Error('cancelado')), { once: true }))
  }
  const consulta = consultarEmpresa(empresa.id, controle.signal)
  controle.abort()
  await assert.rejects(consulta, /Não foi possível conectar/)
  assert.equal(signal.aborted, true)
  globalThis.fetch = async () => json({ ...empresa, dados: null })
  assert.equal((await consultarEmpresa(empresa.id)).dados, null)
})

test('erro na segunda pagina nao entrega uma lista parcial como completa', async () => {
  let chamadas = 0
  globalThis.fetch = async () => {
    chamadas++
    return chamadas === 1 ? json({ itens: [empresa], total: 2 }) : json({}, 500)
  }
  await assert.rejects(listarEmpresas(), /Não foi possível/)
  assert.equal(chamadas, 2)
})

test('escrita remove propriedades forjadas e consulta codifica o identificador', async () => {
  const chamadas = []
  globalThis.fetch = async (url, init) => {
    chamadas.push({ url, init })
    return url === '/api/auth/csrf' ? json({ headerName: 'X-CSRF-TOKEN', token: 'teste' }) : json(empresa)
  }
  await salvarDadosEmpresa(empresa.id, { ...dadosValidos(), usuarioId: 'forjado', nome: 'Intruso', moeda: 'USD' })
  assert.deepEqual(JSON.parse(chamadas[1].init.body), dadosValidos())
  await consultarEmpresa('id/com?caracteres')
  assert.equal(chamadas[2].url, '/api/estabelecimentos/id%2Fcom%3Fcaracteres')
})
