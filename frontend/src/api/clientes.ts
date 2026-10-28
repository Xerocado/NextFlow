import { fetchAutenticado } from './sessao.ts'

export interface ClienteEntrada { nome: string; telefone: string; observacao: string }
export interface Cliente { id: string; nome: string; telefone: string | null; observacao: string | null }
export interface ClientesPagina { itens: Cliente[]; pagina: number; tamanho: number; total: number }

export function prepararCliente(entrada: ClienteEntrada): ClienteEntrada {
  const nome = entrada.nome.trim()
  const telefone = entrada.telefone.trim()
  const observacao = entrada.observacao.trim()
  if (!nome || nome.length > 120 || telefone.length > 30 || !/^[0-9+() .-]*$/.test(telefone) || observacao.length > 500) {
    throw new Error('Confira o nome (até 120), telefone (até 30, com números e formatação) e observação (até 500 caracteres).')
  }
  return { nome, telefone, observacao }
}

async function requisitar(url: string, init: RequestInit = {}) {
  let resposta: Response
  try {
    resposta = await fetchAutenticado(url, { ...init, credentials: 'same-origin', cache: 'no-store',
      signal: init.signal ? AbortSignal.any([init.signal, AbortSignal.timeout(10000)]) : AbortSignal.timeout(10000) })
  } catch { throw new Error('Não foi possível conectar. Atualize e confira a lista antes de salvar novamente.') }
  if (!resposta.ok) throw new Error(resposta.status === 401 ? 'Sua sessão expirou. Entre novamente.' :
    resposta.status === 403 ? 'A sessão de segurança expirou. Tente novamente.' :
    resposta.status === 404 ? 'Empresa ou cliente não encontrado, ou sem permissão.' :
    resposta.status === 400 ? 'Confira os campos e os limites informados.' :
    'Não foi possível concluir. Atualize e confira a lista antes de salvar novamente.')
  return resposta
}

const caminho = (empresa: string) => `/api/estabelecimentos/${encodeURIComponent(empresa)}/clientes`
export async function listarClientes(empresa: string, pagina = 0, signal?: AbortSignal): Promise<ClientesPagina> {
  return (await requisitar(`${caminho(empresa)}?pagina=${pagina}&tamanho=20`, { signal })).json()
}

export async function salvarCliente(empresa: string, entrada: ClienteEntrada, id?: string): Promise<Cliente> {
  const dados = prepararCliente(entrada)
  const csrf: { headerName: string; token: string } = await (await requisitar('/api/auth/csrf')).json()
  return (await requisitar(id ? `${caminho(empresa)}/${encodeURIComponent(id)}` : caminho(empresa), {
    method: id ? 'PUT' : 'POST', headers: { [csrf.headerName]: csrf.token, 'Content-Type': 'application/json' },
    body: JSON.stringify(dados) })).json()
}
