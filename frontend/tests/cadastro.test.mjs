import { test } from 'node:test'
import assert from 'node:assert/strict'
import { validarSenhaCadastro } from '../src/validacaoCadastro.ts'

test('cadastro aceita minimo e limite UTF-8 sem alterar a senha', () => {
  assert.doesNotThrow(() => validarSenhaCadastro('a'.repeat(12), 'a'.repeat(12)))
  assert.doesNotThrow(() => validarSenhaCadastro('a'.repeat(72), 'a'.repeat(72)))
  assert.doesNotThrow(() => validarSenhaCadastro('😀'.repeat(12), '😀'.repeat(12)))
})

test('cadastro rejeita senha curta, branca ou maior que 72 bytes', () => {
  for (const senha of ['a'.repeat(11), ' '.repeat(12), 'a'.repeat(73), 'é'.repeat(37), '😀'.repeat(6)]) {
    assert.throws(() => validarSenhaCadastro(senha, senha), /12 caracteres/)
  }
})

test('confirmacao exige correspondencia exata, inclusive espacos', () => {
  assert.throws(() => validarSenhaCadastro('senha teste longa', 'senha teste longa '), /não coincidem/)
})
