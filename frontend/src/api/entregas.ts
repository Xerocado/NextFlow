import { fetchAutenticado } from './sessao.ts'

export interface EntregaEntrada { data: string; clienteId: string | null; identificacaoAvulso: string; litros: string; valorTotal: string; semCobranca: boolean; motivo: string }
export interface Entrega { id: string; clienteId: string | null; identificacao: string | null; data: string; litros: number; valorTotal: number; valorPago: number; saldoPendente: number; semCobranca: boolean; motivo: string | null }
export interface Pagamento { id: string; entregaId: string; data: string; valor: number }
export interface DetalheEntrega { entrega: Entrega; pagamentos: Pagamento[] }
export interface EntregasPagina { itens: Entrega[]; pagina: number; tamanho: number; total: number }

export function hoje() {
  const partes = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date())
  return ['year', 'month', 'day'].map(tipo => partes.find(p => p.type === tipo)!.value).join('-')
}
export function validarData(valor: string) {
  const data = new Date(`${valor}T12:00:00Z`)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor) || valor.startsWith('0000') || Number.isNaN(data.getTime()) || data.toISOString().slice(0, 10) !== valor) throw new Error('Informe uma data válida.')
  return valor
}
export function centavos(entrada: string): bigint {
  const valor = entrada.trim().replace(',', '.')
  if (!/^\d{1,12}(?:\.\d{1,2})?$/.test(valor)) throw new Error('Informe um valor com até 12 dígitos inteiros e duas casas decimais.')
  const [inteiro, decimal = ''] = valor.split('.')
  return BigInt(inteiro) * 100n + BigInt(decimal.padEnd(2, '0'))
}
export function prepararEntrega(e: EntregaEntrada) {
  validarData(e.data)
  if (!/^\d+$/.test(e.litros) || BigInt(e.litros) < 1n || BigInt(e.litros) > 2147483647n) throw new Error('Informe litros inteiros entre 1 e 2147483647.')
  const valor = centavos(e.valorTotal)
  if (!e.semCobranca && valor === 0n) throw new Error('Informe um valor positivo ou selecione sem cobrança.')
  const identificacaoAvulso = e.identificacaoAvulso.trim(), motivo = e.motivo.trim()
  if (identificacaoAvulso.length > 120 || motivo.length > 500 || (e.clienteId && identificacaoAvulso)) throw new Error('Escolha um cliente cadastrado ou use Não identificado com identificação opcional (até 120 caracteres); motivo até 500.')
  return { data: e.data, clienteId: e.clienteId || null, identificacaoAvulso, litros: Number(e.litros), valorTotal: e.valorTotal.trim().replace(',', '.'), semCobranca: e.semCobranca, motivo }
}
export function prepararPagamento(data: string, valor: string, saldo?: string) {
  validarData(data)
  if (data > hoje()) throw new Error('O recebimento não pode ter data futura.')
  const quantia = centavos(valor)
  if (quantia === 0n || (saldo !== undefined && quantia > centavos(saldo))) throw new Error('Informe um valor positivo que não ultrapasse o saldo pendente.')
  return { data, valor: valor.trim().replace(',', '.') }
}
async function requisitar(url: string, init: RequestInit = {}) {
  let resposta: Response
  try { resposta = await fetchAutenticado(url, { ...init, credentials: 'same-origin', cache: 'no-store', signal: init.signal ? AbortSignal.any([init.signal, AbortSignal.timeout(10000)]) : AbortSignal.timeout(10000) }) }
  catch { throw new Error('Não foi possível conectar. Atualize e confira os registros antes de repetir uma operação.') }
  if (!resposta.ok) throw new Error(resposta.status === 401 ? 'Sua sessão expirou. Entre novamente.' : resposta.status === 403 ? 'A sessão de segurança expirou ou você não tem permissão.' : resposta.status === 404 ? 'Empresa, cliente ou entrega não encontrado, ou sem permissão.' : resposta.status === 400 ? 'Confira os campos, a data e o saldo atualizado da entrega.' : 'Não foi possível concluir. Atualize e confira os registros antes de repetir uma operação.')
  return resposta.json()
}
const caminho = (empresa: string) => `/api/estabelecimentos/${encodeURIComponent(empresa)}/entregas`
export async function listarEntregas(empresa: string, inicio: string, fim: string, pendentes = false, pagina = 0, signal?: AbortSignal): Promise<EntregasPagina> {
  validarData(inicio); validarData(fim)
  if (inicio > fim) throw new Error('O início do período deve ser anterior ou igual ao fim.')
  return requisitar(`${caminho(empresa)}?${new URLSearchParams({ inicio, fim, pendentes: String(pendentes), pagina: String(pagina), tamanho: '20' })}`, { signal })
}
export function consultarEntrega(empresa: string, id: string, signal?: AbortSignal): Promise<DetalheEntrega> { return requisitar(`${caminho(empresa)}/${encodeURIComponent(id)}`, { signal }) }
async function enviar(url: string, dados: unknown) {
  const csrf = await requisitar('/api/auth/csrf') as { headerName: string; token: string }
  return requisitar(url, { method: 'POST', headers: { [csrf.headerName]: csrf.token, 'Content-Type': 'application/json' }, body: JSON.stringify(dados) })
}
export function criarEntrega(empresa: string, entrada: EntregaEntrada): Promise<Entrega> { return enviar(caminho(empresa), prepararEntrega(entrada)) }
export function registrarPagamento(empresa: string, id: string, data: string, valor: string, saldo: string): Promise<Pagamento> { return enviar(`${caminho(empresa)}/${encodeURIComponent(id)}/pagamentos`, prepararPagamento(data, valor, saldo)) }
