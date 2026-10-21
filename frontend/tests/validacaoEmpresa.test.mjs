import { test } from 'node:test'
import assert from 'node:assert/strict'
import { prepararDadosEmpresa } from '../src/validacaoEmpresa.ts'

const exemplo = () => ({
  atividade: 'servicos', telefone: '(00) 00000-0000', cep: '12345-678', logradouro: 'Rua exemplo',
  numero: '10', complemento: '', bairro: 'Centro', cidade: 'Cidade teste', uf: 'SP', semNumero: false,
})

test('normaliza campos sem alterar entrada e envia somente dados editaveis', () => {
  const entrada = { ...exemplo(), telefone: '  +00 (00) 0000-0000  ', numero: ' 10 ', uf: ' sp ',
    usuarioId: 'forjado', nome: 'Nome fora deste formulario', ativo: false }
  const dados = prepararDadosEmpresa(entrada)
  assert.equal(dados.telefone, '+00 (00) 0000-0000')
  assert.equal(dados.uf, 'SP')
  assert.equal(dados.numero, '10')
  assert.equal(entrada.uf, ' sp ')
  assert.equal('usuarioId' in dados, false)
  assert.equal('nome' in dados, false)
  assert.equal('ativo' in dados, false)
})

test('sem numero descarta numero anterior e campos opcionais podem ficar vazios', () => {
  const dados = prepararDadosEmpresa({ atividade: 'ambos', telefone: '', cep: '', logradouro: '', numero: 'antigo',
    complemento: '', bairro: '', cidade: '', uf: '', semNumero: true })
  assert.equal(dados.numero, null)
  for (const numero of ['', '   ', null]) {
    assert.throws(() => prepararDadosEmpresa({ ...exemplo(), numero }), /número/)
  }
})

test('aceita atividades existentes e CEP com e sem hifen', () => {
  for (const atividade of ['servicos', 'produtos', 'ambos']) {
    for (const cep of ['12345-678', '12345678', '']) {
      assert.equal(prepararDadosEmpresa({ ...exemplo(), atividade, cep }).atividade, atividade)
    }
  }
})

test('rejeita atividade CEP UF e telefone invalidos antes de enviar', () => {
  for (const [campo, valor, mensagem] of [
    ['atividade', '', /atividade/], ['atividade', 'outra', /atividade/],
    ['cep', '123', /CEP/], ['cep', '12345x678', /CEP/], ['cep', '１２３４５６７８', /CEP/],
    ['uf', 'XX', /UF/], ['uf', 'S', /UF/], ['telefone', 'telefone', /telefone/],
    ['telefone', '<script>', /telefone/], ['telefone', '1'.repeat(31), /telefone/],
  ]) assert.throws(() => prepararDadosEmpresa({ ...exemplo(), [campo]: valor }), mensagem)
})

test('valida limites de todos os campos de endereco', () => {
  for (const [campo, limite] of [['logradouro', 150], ['numero', 20], ['complemento', 100], ['bairro', 100], ['cidade', 100]]) {
    assert.equal(prepararDadosEmpresa({ ...exemplo(), [campo]: 'a'.repeat(limite) })[campo].length, limite)
    assert.throws(() => prepararDadosEmpresa({ ...exemplo(), [campo]: 'a'.repeat(limite + 1) }), /no máximo/)
  }
})

test('aceita todas as UFs brasileiras e telefone formatado', () => {
  for (const uf of 'AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO'.split(' ')) {
    assert.equal(prepararDadosEmpresa({ ...exemplo(), uf }).uf, uf)
  }
  assert.equal(prepararDadosEmpresa({ ...exemplo(), telefone: '+00 (00) 00000-0000' }).telefone, '+00 (00) 00000-0000')
})
