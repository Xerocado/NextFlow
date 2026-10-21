import { validarData } from './entregas'
import type { Pagamento } from './entregas'

export interface MovimentoDia {
  data: string
  quantidadeEntregas: number
  totalLitros: number
  totalEntregas: number
  totalRecebido: number
  totalGasto: number
  saldoDoDia: number
  recebimentos: { itens: (Pagamento & { identificacao: string | null; dataEntrega: string })[]; pagina: number; tamanho: number; total: number }
}

export async function consultarMovimento(empresa: string, data: string, pagina = 0, signal?: AbortSignal): Promise<MovimentoDia> {
  validarData(data)
  const parametros = new URLSearchParams({ data, pagina: String(pagina), tamanho: '20' })
  let resposta: Response
  try {
    resposta = await fetch(`/api/estabelecimentos/${encodeURIComponent(empresa)}/movimento?${parametros}`, {
      credentials: 'same-origin', cache: 'no-store',
      signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(10000)]) : AbortSignal.timeout(10000),
    })
  } catch { throw new Error('Não foi possível conectar. Atualize o movimento para tentar novamente.') }
  if (!resposta.ok) throw new Error(resposta.status === 401 ? 'Sua sessão expirou. Entre novamente.' :
    resposta.status === 403 || resposta.status === 404 ? 'Empresa não encontrada ou sem permissão.' :
    resposta.status === 400 ? 'Confira a data informada.' : 'Não foi possível consultar o movimento. Tente atualizar.')
  return resposta.json()
}
