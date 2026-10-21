import type { DadosEmpresa } from './api/estabelecimentos'

const atividades = new Set(['servicos', 'produtos', 'ambos'])
const estados = new Set('AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO'.split(' '))

export function prepararDadosEmpresa(entrada: DadosEmpresa): DadosEmpresa {
  // Lista explícita: somente os campos editáveis seguem para a API.
  const dados: DadosEmpresa = {
    atividade: entrada.atividade.trim(), telefone: entrada.telefone.trim(), cep: entrada.cep.trim(),
    logradouro: entrada.logradouro.trim(), numero: entrada.semNumero ? null : (entrada.numero ?? '').trim(),
    complemento: entrada.complemento.trim(), bairro: entrada.bairro.trim(), cidade: entrada.cidade.trim(),
    uf: entrada.uf.trim().toUpperCase(), semNumero: entrada.semNumero,
  }
  if (!atividades.has(dados.atividade)) throw new Error('Selecione o tipo de atividade da empresa.')
  if (dados.telefone.length > 30 || !/^[0-9+() .-]*$/.test(dados.telefone)) {
    throw new Error('Informe um telefone com até 30 caracteres, usando números e formatação de telefone.')
  }
  if (dados.cep && !/^\d{5}-?\d{3}$/.test(dados.cep)) throw new Error('Informe um CEP com 8 dígitos ou deixe o campo vazio.')
  if (dados.uf && !estados.has(dados.uf)) throw new Error('Informe uma UF brasileira válida ou deixe o campo vazio.')
  if (!dados.semNumero && !dados.numero) throw new Error('Informe o número ou marque Endereço sem número.')
  for (const [valor, limite, nome] of [
    [dados.logradouro, 150, 'Rua ou avenida'], [dados.numero ?? '', 20, 'Número'],
    [dados.complemento, 100, 'Complemento'], [dados.bairro, 100, 'Bairro'], [dados.cidade, 100, 'Cidade'],
  ] as const) {
    if (valor.length > limite) throw new Error(`${nome}: use no máximo ${limite} caracteres.`)
  }
  return dados
}
