export type Situacao = 'Pago' | 'Parcialmente pago' | 'Pendente' | 'Sem cobrança'

export interface LinhaHistorico {
  id: string
  nome: string
  descricao: string
  data: string
  valor: number
  liquidado: number
  semCobranca?: boolean
  motivo?: string
  categoria?: string
  clienteId?: string
}

export interface FiltrosHistorico {
  busca: string
  inicio: string
  fim: string
  dias: string[]
  situacao: Situacao | ''
  categoria: string
  clienteId?: string
}

export function situacaoRegistro(linha: LinhaHistorico): Situacao {
  if (linha.semCobranca) return 'Sem cobrança'
  if (linha.liquidado >= linha.valor) return 'Pago'
  return linha.liquidado > 0 ? 'Parcialmente pago' : 'Pendente'
}

function normalizar(texto: string) {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
}

export function filtrarHistorico(linhas: LinhaHistorico[], filtros: FiltrosHistorico) {
  return linhas.filter(linha =>
    (!filtros.clienteId || linha.clienteId === filtros.clienteId)
    && normalizar(`${linha.nome} ${linha.descricao}`).includes(normalizar(filtros.busca))
    && (!filtros.inicio || linha.data >= filtros.inicio)
    && (!filtros.fim || linha.data <= filtros.fim)
    && (!filtros.dias.length || filtros.dias.includes(linha.data))
    && (!filtros.situacao || situacaoRegistro(linha) === filtros.situacao)
    && (!filtros.categoria || linha.categoria === filtros.categoria)
  ).sort((a, b) => b.data.localeCompare(a.data) || a.id.localeCompare(b.id))
}

export function totaisHistorico(linhas: LinhaHistorico[]) {
  const totais = { quantidade: linhas.length, pagos: 0, parciais: 0, pendentes: 0, semCobranca: 0, recebido: 0, saldo: 0 }
  for (const linha of linhas) {
    const situacao = situacaoRegistro(linha)
    if (situacao === 'Sem cobrança') { totais.semCobranca++; continue }
    if (situacao === 'Pago') totais.pagos++
    else if (situacao === 'Parcialmente pago') totais.parciais++
    else totais.pendentes++
    totais.recebido += linha.liquidado
    totais.saldo += Math.max(0, linha.valor - linha.liquidado)
  }
  return totais
}
