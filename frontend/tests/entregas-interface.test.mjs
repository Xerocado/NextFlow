import { test } from 'node:test'
import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

const hooks = registerHooks({
  resolve(specifier, context, next) {
    if (specifier.startsWith('.') && context.parentURL?.includes('/src/') && !/\.[a-z]+$/i.test(specifier)) {
      for (const extension of ['.tsx', '.ts']) {
        try { return next(specifier + extension, context) } catch (error) { if (error.code !== 'ERR_MODULE_NOT_FOUND') throw error }
      }
    }
    return next(specifier, context)
  },
  load(url, context, next) {
    if (url.endsWith('.tsx')) {
      const resultado = ts.transpileModule(readFileSync(new URL(url), 'utf8'), { reportDiagnostics: true, compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } })
      assert.deepEqual(resultado.diagnostics, [], `Erro de sintaxe em ${url}`)
      return { format: 'module', shortCircuit: true, source: resultado.outputText }
    }
    return next(url, context)
  },
})
const { default: Entregas } = await import('../src/Entregas.tsx')
const { default: Movimento } = await import('../src/Movimento.tsx')
const { default: PularConteudo } = await import('../src/components/PularConteudo.tsx')
const { consultarMovimento } = await import('../src/api/movimento.ts')
hooks.deregister()

test('link de salto cancela a navegação por hash e solicita foco no conteúdo', () => {
  const acoes = []
  const link = PularConteudo()
  assert.equal(link.props.href, '#conteudo')
  link.props.onClick({
    currentTarget: { ownerDocument: { getElementById(id) {
      assert.equal(id, 'conteudo')
      return { focus() { acoes.push('foco') } }
    } } },
    preventDefault() { acoes.push('cancelar-navegacao') },
  })
  assert.deepEqual(acoes, ['cancelar-navegacao', 'foco'])
})

test('telas de entregas reutilizam painéis e iniciam escritas bloqueadas durante consulta', () => {
  const html = renderToStaticMarkup(React.createElement(Entregas, { empresaId: 'empresa' }))
  assert.match(html, /Registrar entrega/)
  assert.match(html, /class="painel formulario-preview"/)
  assert.match(html, /fieldset[^>]*disabled/)
  assert.match(html, /Carregando entregas/)
  assert.match(html, /Sem cobrança não gera dívida/)
  assert.match(html, /<option value="" selected="">Não identificado<\/option>/)
  assert.doesNotMatch(html, /Registrar recebimento/)
})

test('pendências deixam explícito o período de entregas e não exibem novo cadastro', () => {
  const html = renderToStaticMarkup(React.createElement(Entregas, { empresaId: 'empresa', pendentes: true }))
  assert.match(html, /Amplie o período para consultar entregas antigas/)
  assert.doesNotMatch(html, /Registrar entrega/)
  assert.match(html, /Atualizar registros/)
})

test('movimento inicia sem valores fictícios e explica data efetiva e saldo diário', () => {
  const html = renderToStaticMarkup(React.createElement(Movimento, { empresaId: 'empresa' }))
  assert.match(html, /Carregando movimento/)
  assert.match(html, /inclusive os de entregas anteriores/)
  assert.match(html, /não é o saldo total da empresa/)
  assert.match(html, /href="#\/historico"/)
  assert.doesNotMatch(html, /class="metrica"/)
})

test('movimento consulta empresa, data e página sem cache e não expõe erro interno', async () => {
  const original = globalThis.fetch
  try {
    const controle = new AbortController()
    globalThis.fetch = async (url, init) => {
      assert.equal(url, '/api/estabelecimentos/a%2Fb/movimento?data=2026-10-23&pagina=2&tamanho=20')
      assert.equal(init.credentials, 'same-origin')
      assert.equal(init.cache, 'no-store')
      assert.ok(init.signal)
      return new Response(JSON.stringify({ totalRecebido: 100, recebimentos: { itens: [{ entregaId: 'antiga', data: '2026-10-23', valor: 100 }] } }))
    }
    const resultado = await consultarMovimento('a/b', '2026-10-23', 2, controle.signal)
    assert.equal(resultado.totalRecebido, 100)
    assert.equal(resultado.recebimentos.itens[0].data, '2026-10-23')
    await assert.rejects(consultarMovimento('a/b', '2026-02-30'))
    globalThis.fetch = async () => new Response('segredo-interno', { status: 403 })
    await assert.rejects(consultarMovimento('empresa', '2026-10-23'), e => e.message.includes('permissão') && !e.message.includes('segredo'))
  } finally { globalThis.fetch = original }
})
