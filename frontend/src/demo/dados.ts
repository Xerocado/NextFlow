// Apenas exemplos visuais. Valores em centavos; nenhuma persistencia ou API.
export const clientes = [
  { id: 'c1', nome: 'Cliente exemplo A', telefone: '(11) 90000-0001', endereco: 'Rua Exemplo, 10', observacoes: 'Atendimento mensal' },
  { id: 'c2', nome: 'Cliente exemplo B', telefone: '(11) 90000-0002', endereco: 'Rua Exemplo, 20', observacoes: 'Prefere contato à tarde' },
  { id: 'c3', nome: 'Cliente exemplo C', telefone: '(11) 90000-0003', endereco: 'Rua Exemplo, 30', observacoes: '' },
  { id: 'c4', nome: 'Cliente exemplo D', telefone: '(11) 90000-0004', endereco: 'Rua Exemplo, 40', observacoes: '' },
]
export interface VendaDemo {
  id: string; clienteId: string; descricao: string; data: string; vencimento: string
  valor: number; recebido: number; semCobranca?: boolean; motivo?: string
}
export const vendas: VendaDemo[] = [
  { id: 'v1', clienteId: 'c1', descricao: 'Prestação de serviço', data: '2026-10-02', vencimento: '2026-10-10', valor: 25000, recebido: 10000 },
  { id: 'v2', clienteId: 'c2', descricao: 'Venda de produtos', data: '2026-10-05', vencimento: '2026-10-15', valor: 48000, recebido: 48000 },
  { id: 'v3', clienteId: 'c3', descricao: 'Serviço agendado', data: '2026-10-08', vencimento: '2026-10-20', valor: 32000, recebido: 0 },
  { id: 'v4', clienteId: 'c4', descricao: 'Atendimento avulso', data: '2026-10-12', vencimento: '2026-10-25', valor: 18000, recebido: 18000 },
  { id: 'v5', clienteId: 'c1', descricao: 'Serviço periódico', data: '2026-09-15', vencimento: '2026-09-25', valor: 20000, recebido: 20000 },
  { id: 'v6', clienteId: 'c1', descricao: 'Serviço em parceria', data: '2026-09-29', vencimento: '2026-09-29', valor: 18000, recebido: 0, semCobranca: true, motivo: 'Troca de favores' },
  { id: 'v7', clienteId: 'c1', descricao: 'Atendimento de cortesia', data: '2026-09-30', vencimento: '2026-09-30', valor: 12000, recebido: 0, semCobranca: true },
]
export interface DespesaDemo {
  id: string; descricao: string; categoria: string; data: string; valor: number
  pago: number; semCobranca?: boolean; motivo?: string
}
export const despesas: DespesaDemo[] = [
  { id: 'd1', descricao: 'Aluguel do espaço', categoria: 'Estrutura', data: '2026-10-01', valor: 22000, pago: 22000 },
  { id: 'd2', descricao: 'Materiais de trabalho', categoria: 'Materiais', data: '2026-10-06', valor: 8500, pago: 8500 },
  { id: 'd3', descricao: 'Internet', categoria: 'Estrutura', data: '2026-10-18', valor: 12000, pago: 0 },
  { id: 'd4', descricao: 'Transporte', categoria: 'Operação', data: '2026-10-09', valor: 4500, pago: 4500 },
  { id: 'd5', descricao: 'Aluguel do espaço', categoria: 'Estrutura', data: '2026-09-01', valor: 22000, pago: 22000 },
  { id: 'd6', descricao: 'Manutenção em parceria', categoria: 'Operação', data: '2026-09-30', valor: 15000, pago: 0, semCobranca: true, motivo: 'Permuta de serviços' },
]
export const dataReferencia = '2026-10-15'
export const dinheiro = (centavos: number) => (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
export const dataCurta = (data: string) => data.split('-').reverse().join('/')
export function resumo(mes: string) {
  const movimentos = vendas.filter(v => v.data.startsWith(mes) && !v.semCobranca)
  const saidas = despesas.filter(d => d.data.startsWith(mes) && !d.semCobranca)
  const faturamento = movimentos.reduce((s, v) => s + v.valor, 0)
  const recebido = movimentos.reduce((s, v) => s + v.recebido, 0)
  const pago = saidas.reduce((s, d) => s + d.pago, 0)
  return { faturamento, recebido, pago, saldo: recebido - pago,
    pendente: movimentos.reduce((s, v) => s + v.valor - v.recebido, 0),
    vencido: movimentos.filter(v => v.vencimento < dataReferencia).reduce((s, v) => s + v.valor - v.recebido, 0) }
}
