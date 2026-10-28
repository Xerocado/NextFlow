import { test, after, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { concluirChaveIdempotencia, obterChaveIdempotencia } from '../src/api/idempotencia.ts'

const anterior = Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage')
const dados = new Map()
Object.defineProperty(globalThis, 'sessionStorage', {
  configurable: true,
  value: {
    getItem: chave => dados.get(chave) ?? null,
    setItem: (chave, valor) => dados.set(chave, String(valor)),
    removeItem: chave => dados.delete(chave),
  },
})
afterEach(() => dados.clear())
after(() => {
  if (anterior) Object.defineProperty(globalThis, 'sessionStorage', anterior)
  else delete globalThis.sessionStorage
})

test('mesma empresa, operação, alvo e corpo reutilizam chave após recarregar a tela', async () => {
  const entrada = { data: '2026-10-28', valor: '25.10' }
  const primeira = await obterChaveIdempotencia('empresa-a', 'PAGAMENTO', entrada, 'entrega-a')
  const recarregada = await obterChaveIdempotencia('empresa-a', 'PAGAMENTO', entrada, 'entrega-a')
  assert.equal(recarregada, primeira)
  assert.match(primeira, /^[0-9a-f-]{36}$/i)
})

test('corpo, operação, entrega e empresa diferentes têm chaves separadas', async () => {
  const entrada = { descricao: 'Diesel fictício', valor: '25.10' }
  const original = await obterChaveIdempotencia('empresa-a', 'GASTO', entrada)
  const alterado = await obterChaveIdempotencia('empresa-a', 'GASTO', { ...entrada, valor: '26.10' })
  const outraOperacao = await obterChaveIdempotencia('empresa-a', 'ENTREGA', entrada)
  const outraEmpresa = await obterChaveIdempotencia('empresa-b', 'GASTO', entrada)
  assert.equal(new Set([original, alterado, outraOperacao, outraEmpresa]).size, 4)
  const [armazenado] = [...dados.entries()]
  assert.doesNotMatch(armazenado[0], /Diesel fictício|25\.10/)
  assert.match(armazenado[1], /^[0-9a-f-]{36}$/i)
})

test('após confirmação limpa somente a chave da operação concluída', async () => {
  const entrada = { data: '2026-10-28', valor: '10.00' }
  const concluida = await obterChaveIdempotencia('empresa-a', 'GASTO', entrada)
  const outra = await obterChaveIdempotencia('empresa-a', 'GASTO', { ...entrada, valor: '11.00' })
  await concluirChaveIdempotencia('empresa-a', 'GASTO', entrada, concluida)
  assert.notEqual(await obterChaveIdempotencia('empresa-a', 'GASTO', entrada), concluida)
  assert.equal(await obterChaveIdempotencia('empresa-a', 'GASTO', { ...entrada, valor: '11.00' }), outra)
})
