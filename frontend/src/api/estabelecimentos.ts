import { prepararDadosEmpresa } from '../validacaoEmpresa.ts'

export interface DadosEmpresa {
  atividade: string; telefone: string; cep: string; logradouro: string; numero: string | null;
  complemento: string; bairro: string; cidade: string; uf: string; semNumero: boolean
}
export interface EmpresaSalva { id: string; nome: string; ativo: boolean; moeda: string; fuso: string; dados?: DadosEmpresa | null }

async function requisitar(caminho: string, init: RequestInit = {}) {
  let resposta: Response
  try {
    resposta = await fetch(caminho, { ...init, credentials: 'same-origin', cache: 'no-store',
      signal: init.signal ? AbortSignal.any([init.signal, AbortSignal.timeout(10000)]) : AbortSignal.timeout(10000) })
  } catch { throw new Error('Não foi possível conectar. Confira sua conexão e tente novamente.') }
  if (!resposta.ok) {
    throw new Error(resposta.status === 401 ? 'Sua sessão expirou. Entre novamente.' :
      resposta.status === 403 ? 'A sessão de segurança expirou. Tente novamente.' :
      resposta.status === 404 ? 'Empresa não encontrada ou sem permissão de acesso. Atualize a lista.' :
      resposta.status === 400 ? 'Confira os campos, seus formatos e limites antes de salvar.' :
      resposta.status === 429 ? 'Muitas tentativas. Aguarde antes de tentar novamente.' :
      'Não foi possível concluir a operação. Tente novamente.')
  }
  return resposta
}

export async function listarEmpresas(): Promise<EmpresaSalva[]> {
  const empresas: EmpresaSalva[] = []
  let pagina = 0
  // A API é paginada: não escondemos empresas além da primeira página.
  while (true) {
    const resposta = await requisitar(`/api/estabelecimentos?pagina=${pagina}&tamanho=100`)
    const dados: { itens: EmpresaSalva[]; total: number } = await resposta.json()
    empresas.push(...dados.itens)
    if (empresas.length >= dados.total || dados.itens.length === 0) return empresas
    pagina++
  }
}

export async function salvarNomeEmpresa(nome: string, id?: string): Promise<EmpresaSalva> {
  const csrf: { headerName: string; token: string } = await (await requisitar('/api/auth/csrf')).json()
  return (await requisitar(id ? `/api/estabelecimentos/${encodeURIComponent(id)}/nome` : '/api/estabelecimentos', {
    method: id ? 'PUT' : 'POST',
    headers: { [csrf.headerName]: csrf.token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ nome }),
  })).json()
}

export async function consultarEmpresa(id: string, signal?: AbortSignal): Promise<EmpresaSalva> {
  return (await requisitar(`/api/estabelecimentos/${encodeURIComponent(id)}`, { signal })).json()
}

export async function salvarDadosEmpresa(id: string, dados: DadosEmpresa): Promise<EmpresaSalva> {
  const validos = prepararDadosEmpresa(dados)
  const csrf: { headerName: string; token: string } = await (await requisitar('/api/auth/csrf')).json()
  return (await requisitar(`/api/estabelecimentos/${encodeURIComponent(id)}/dados`, {
    method: 'PUT',
    headers: { [csrf.headerName]: csrf.token, 'Content-Type': 'application/json' },
    body: JSON.stringify(validos),
  })).json()
}
