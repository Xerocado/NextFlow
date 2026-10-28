import { fetchAutenticado } from './sessao.ts'

export interface GastoEntrada { descricao: string; valor: string; data: string; categoria: string; observacao: string }
export interface Gasto { id: string; descricao: string; valor: number; data: string; categoria: string | null; observacao: string | null }
export interface GastosDia { itens: Gasto[]; pagina: number; tamanho: number; total: number; totalGasto: number }

export function prepararGasto(entrada: GastoEntrada): GastoEntrada {
  const valor = entrada.valor.trim().replace(',', '.')
  if (!/^\d{1,12}(?:\.\d{1,2})?$/.test(valor) || !/[1-9]/.test(valor)) {
    throw new Error('Informe um valor positivo, com até 12 dígitos inteiros e duas casas decimais.')
  }
  const data = new Date(`${entrada.data}T12:00:00Z`)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(entrada.data) || entrada.data.startsWith('0000') ||
    Number.isNaN(data.getTime()) || data.toISOString().slice(0, 10) !== entrada.data) {
    throw new Error('Informe uma data válida.')
  }
  const descricao = entrada.descricao.trim()
  const categoria = entrada.categoria.trim()
  const observacao = entrada.observacao.trim()
  if (!descricao || descricao.length > 120 || categoria.length > 60 || observacao.length > 500) {
    throw new Error('Confira a descrição (até 120), categoria (até 60) e observação (até 500 caracteres).')
  }
  return { descricao, valor, data: entrada.data, categoria, observacao }
}

async function requisitar(url: string, init: RequestInit = {}) {
  let resposta: Response
  try {
    resposta = await fetchAutenticado(url, { ...init, credentials: 'same-origin', cache: 'no-store',
      signal: init.signal ? AbortSignal.any([init.signal, AbortSignal.timeout(10000)]) : AbortSignal.timeout(10000) })
  } catch { throw new Error('Não foi possível conectar. Confira a conexão e atualize a lista antes de repetir um cadastro.') }
  if (!resposta.ok) throw new Error(resposta.status === 401 ? 'Sua sessão expirou. Entre novamente.' :
    resposta.status === 403 ? 'A sessão de segurança expirou. Tente novamente.' :
    resposta.status === 404 ? 'Empresa não encontrada ou sem permissão.' :
    resposta.status === 400 ? 'Confira os campos e os limites informados.' :
    resposta.status === 409 ? 'A chave de repetição já foi usada com outros dados. Confira os registros e revise o formulário antes de tentar novamente.' :
    'Não foi possível concluir. Atualize a lista antes de tentar novamente.')
  return resposta
}

const caminho = (empresa: string) => `/api/estabelecimentos/${encodeURIComponent(empresa)}/gastos`
export async function listarGastos(empresa: string, data: string, pagina = 0, signal?: AbortSignal): Promise<GastosDia> {
  return (await requisitar(`${caminho(empresa)}?data=${encodeURIComponent(data)}&pagina=${pagina}&tamanho=20`, { signal })).json()
}
export async function criarGasto(empresa: string, entrada: GastoEntrada, chave?: string): Promise<Gasto> {
  const dados = prepararGasto(entrada)
  const csrf: { headerName: string; token: string } = await (await requisitar('/api/auth/csrf')).json()
  return (await requisitar(caminho(empresa), { method: 'POST',
    headers: { [csrf.headerName]: csrf.token, 'Content-Type': 'application/json', ...(chave ? { 'Idempotency-Key': chave } : {}) }, body: JSON.stringify(dados) })).json()
}
