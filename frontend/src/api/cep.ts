export interface EnderecoCep {
  logradouro: string
  bairro: string
  cidade: string
  uf: string
}

export async function buscarEnderecoCep(entrada: string, signal?: AbortSignal): Promise<EnderecoCep> {
  const cep = entrada.trim().replace(/^(\d{5})-(\d{3})$/, '$1$2')
  if (!/^\d{8}$/.test(cep)) throw new Error('Informe um CEP com 8 dígitos.')

  let dados: unknown
  try {
    const resposta = await fetch(`https://viacep.com.br/ws/${cep}/json/`, {
      credentials: 'omit', referrerPolicy: 'no-referrer', cache: 'no-store',
      signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(8000)]) : AbortSignal.timeout(8000),
    })
    if (!resposta.ok) throw new Error('Falha na consulta')
    dados = await resposta.json()
  } catch {
    throw new Error('Não foi possível consultar o CEP. Tente novamente ou preencha o endereço manualmente.')
  }
  if (!dados || typeof dados !== 'object') throw new Error('A consulta retornou um endereço inválido. Preencha manualmente.')
  const endereco = dados as Record<string, unknown>
  if (endereco.erro === true || endereco.erro === 'true') throw new Error('CEP não encontrado. Confira o número ou preencha o endereço manualmente.')
  if (typeof endereco.localidade !== 'string' || !endereco.localidade.trim() || endereco.localidade.length > 100 ||
    typeof endereco.uf !== 'string' || !/^[A-Z]{2}$/.test(endereco.uf) ||
    typeof endereco.logradouro !== 'string' || endereco.logradouro.length > 150 ||
    typeof endereco.bairro !== 'string' || endereco.bairro.length > 100) {
    throw new Error('A consulta retornou um endereço inválido. Preencha manualmente.')
  }
  return { logradouro: endereco.logradouro, bairro: endereco.bairro, cidade: endereco.localidade, uf: endereco.uf }
}
