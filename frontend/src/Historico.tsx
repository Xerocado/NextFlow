import { useId, useState } from 'react'
import type { FormEvent } from 'react'
import { clientes, vendas, despesas, dinheiro, dataCurta } from './demo/dados'
import { filtrarHistorico, situacaoRegistro, totaisHistorico } from './demo/filtrosHistorico'
import type { FiltrosHistorico, LinhaHistorico, Situacao } from './demo/filtrosHistorico'

const filtrosVazios: FiltrosHistorico = { busca: '', inicio: '', fim: '', dias: [], situacao: '', categoria: '' }

export default function Historico({ tipo, clienteId, limparCliente }: {
  tipo: 'pedidos' | 'despesas'
  clienteId?: string
  limparCliente?: () => void
}) {
  const [filtros, setFiltros] = useState<FiltrosHistorico>(filtrosVazios)
  const [dia, setDia] = useState('')
  const [previa, setPrevia] = useState(false)
  const [semCobranca, setSemCobranca] = useState(false)
  const [conferido, setConferido] = useState(false)
  const id = useId()
  const pedidos = tipo === 'pedidos'
  const registros: LinhaHistorico[] = pedidos
    ? vendas.map(v => ({ ...v, nome: clientes.find(c => c.id === v.clienteId)?.nome ?? 'Cliente não identificado', liquidado: v.recebido }))
    : despesas.map(d => ({ ...d, nome: d.descricao, liquidado: d.pago }))
  const intervaloInvalido = Boolean(filtros.inicio && filtros.fim && filtros.inicio > filtros.fim)
  const linhas = intervaloInvalido ? [] : filtrarHistorico(registros, { ...filtros, clienteId })
  const total = totaisHistorico(linhas)
  const cliente = clientes.find(c => c.id === clienteId)

  function alterar<K extends keyof FiltrosHistorico>(campo: K, valor: FiltrosHistorico[K]) {
    setFiltros(anterior => ({ ...anterior, [campo]: valor }))
  }
  function limpar() { setFiltros(filtrosVazios); setDia(''); limparCliente?.() }
  function adicionarDia() {
    if (dia && !filtros.dias.includes(dia)) alterar('dias', [...filtros.dias, dia].sort())
    setDia('')
  }
  function conferir(evento: FormEvent<HTMLFormElement>) { evento.preventDefault(); setConferido(true) }

  return <>
    <section className="painel filtros-historico" aria-label="Filtros do histórico">
      <div className="painel-titulo"><div><h2>{cliente ? `Histórico de ${cliente.nome}` : pedidos ? 'Histórico de pedidos' : 'Histórico de despesas'}</h2><p>Consulte todos os meses. Os filtros abaixo são combinados.</p></div><button className="botao-secundario" onClick={limpar}>Limpar filtros</button></div>
      {cliente ? <p className="cliente-filtrado">Cliente selecionado: <strong>{cliente.nome}</strong> <button className="link-botao" onClick={limparCliente}>Ver todos os clientes</button></p> : null}
      <div className="grade-filtros">
        <label>Pesquisar<input value={filtros.busca} onChange={e => alterar('busca', e.target.value)} placeholder={pedidos ? 'Nome do cliente ou descrição' : 'Descrição da despesa'} /></label>
        <label>Data inicial<input type="date" value={filtros.inicio} onChange={e => alterar('inicio', e.target.value)} /></label>
        <label>Data final<input type="date" value={filtros.fim} onChange={e => alterar('fim', e.target.value)} /></label>
        <label>Situação<select value={filtros.situacao} onChange={e => alterar('situacao', e.target.value as Situacao | '')}><option value="">Todas</option><option>Pago</option><option>Parcialmente pago</option><option>Pendente</option><option>Sem cobrança</option></select></label>
        {!pedidos ? <label>Categoria<select value={filtros.categoria} onChange={e => alterar('categoria', e.target.value)}><option value="">Todas</option><option>Estrutura</option><option>Materiais</option><option>Operação</option></select></label> : null}
      </div>
      <div className="dias-especificos"><label htmlFor={`${id}-dia`}>Dias específicos (opcional)</label><div className="adicionar-dia"><input id={`${id}-dia`} type="date" value={dia} onChange={e => setDia(e.target.value)} /><button className="botao-secundario" disabled={!dia} onClick={adicionarDia}>Adicionar dia</button></div><p className="ajuda-campo">Adicione mais de um dia para consultar datas separadas. Se houver período, apenas dias dentro dele serão exibidos.</p>
        <div className="dias-selecionados">{filtros.dias.map(d => <button key={d} className="badge badge-azul" onClick={() => alterar('dias', filtros.dias.filter(x => x !== d))} aria-label={`Remover dia ${dataCurta(d)}`}>{dataCurta(d)} <span aria-hidden="true">×</span></button>)}</div>
      </div>
      {intervaloInvalido ? <div className="erro" role="alert">A data final deve ser igual ou posterior à data inicial.</div> : null}
    </section>

    <div className="resumo-historico" role="status"><strong>{total.quantidade} {pedidos ? 'pedidos' : 'despesas'}</strong><span>{total.pagos} pagos</span><span>{total.parciais} parcialmente pagos</span><span>{total.pendentes} pendentes</span><span>{total.semCobranca} sem cobrança</span></div>
    <section className="painel"><div className="painel-titulo"><div><h2>{pedidos ? 'Pedidos encontrados' : 'Despesas encontradas'}</h2><p>Uma linha por registro, do mais recente para o mais antigo.</p></div><button className="botao-secundario" onClick={() => { setPrevia(!previa); setConferido(false); setSemCobranca(false) }} aria-expanded={previa}>Prévia de {pedidos ? 'novo pedido' : 'nova despesa'}</button></div>
      <div className="tabela-scroll" role="region" aria-label={`Tabela do histórico de ${tipo}`} tabIndex={0}><table><caption className="sr-only">Histórico fictício de {tipo}</caption><thead><tr>{[pedidos ? 'Cliente' : 'Despesa', 'Data', pedidos ? 'Descrição' : 'Categoria', 'Valor', pedidos ? 'Recebido' : 'Pago', pedidos ? 'A receber' : 'A pagar', 'Situação', 'Motivo'].map(c => <th key={c} scope="col">{c}</th>)}</tr></thead><tbody>
        {linhas.map(linha => {
          const situacao = situacaoRegistro(linha)
          return <tr key={linha.id}><td><strong>{linha.nome}</strong></td><td>{dataCurta(linha.data)}</td><td className="texto-historico">{pedidos ? linha.descricao : linha.categoria}</td><td>{dinheiro(linha.valor)}{linha.semCobranca ? <small>Valor de referência</small> : null}</td><td>{dinheiro(linha.semCobranca ? 0 : linha.liquidado)}</td><td>{dinheiro(linha.semCobranca ? 0 : Math.max(0, linha.valor - linha.liquidado))}</td><td><span className={`badge ${situacao === 'Pago' ? 'badge-sucesso' : situacao === 'Parcialmente pago' ? 'badge-alerta' : situacao === 'Sem cobrança' ? 'badge-azul' : ''}`}>{situacao}</span></td><td className="texto-historico">{linha.semCobranca ? linha.motivo || 'Não informado' : '—'}</td></tr>
        })}
        {!linhas.length ? <tr><td colSpan={8} className="vazio">Nenhum registro encontrado. Ajuste ou limpe os filtros.</td></tr> : null}
      </tbody></table></div><p className="rodape-painel">{pedidos ? 'Total recebido' : 'Total pago'} no resultado: <strong>{dinheiro(total.recebido)}</strong> · Saldo {pedidos ? 'a receber' : 'a pagar'}: <strong>{dinheiro(total.saldo)}</strong>. Registros sem cobrança não geram saldo.</p>
    </section>

    {previa ? <section className="painel formulario-preview"><div className="painel-titulo"><div><h2>Prévia de {pedidos ? 'pedido' : 'despesa'}</h2><p>Experimente os campos. Nenhum registro será salvo.</p></div><button className="botao-secundario" onClick={() => setPrevia(false)}>Fechar</button></div><form onSubmit={conferir} onChange={() => setConferido(false)}><div className="grade-formulario">
      {pedidos ? <div><label htmlFor={`${id}-cliente`}>Cliente</label><select id={`${id}-cliente`} defaultValue={clienteId}>{clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}</select></div> : null}
      <div><label htmlFor={`${id}-descricao`}>Descrição</label><input id={`${id}-descricao`} required maxLength={120} /></div>
      {!pedidos ? <div><label htmlFor={`${id}-categoria`}>Categoria</label><select id={`${id}-categoria`}><option>Estrutura</option><option>Materiais</option><option>Operação</option><option>Outras</option></select></div> : null}
      <div><label htmlFor={`${id}-data`}>Data</label><input id={`${id}-data`} type="date" required /></div>
      <div><label htmlFor={`${id}-valor`}>{semCobranca ? 'Valor de referência (R$)' : 'Valor (R$)'}</label><input id={`${id}-valor`} type="number" min="0.01" step="0.01" required /></div>
      <div><label htmlFor={`${id}-situacao`}>Situação</label><select id={`${id}-situacao`} onChange={e => setSemCobranca(e.target.value === 'Sem cobrança')}><option>Pendente</option><option>Pago</option><option>Parcialmente pago</option><option>Sem cobrança</option></select></div>
      {!pedidos ? <div><label htmlFor={`${id}-vencimento`}>Vencimento</label><input id={`${id}-vencimento`} type="date" required={!semCobranca} /></div> : null}
      {semCobranca ? <div className="campo-largo"><label htmlFor={`${id}-motivo`}>Motivo (opcional)</label><textarea id={`${id}-motivo`} rows={2} maxLength={500} placeholder="Ex.: Troca de favores ou cortesia" /><p className="ajuda-campo">Pode deixar em branco. Não gera dívida nem lembrete de cobrança.</p></div> : null}
      <div className="campo-largo"><label htmlFor={`${id}-observacoes`}>Observações (opcional)</label><textarea id={`${id}-observacoes`} rows={2} maxLength={500} /></div>
    </div><div className="formulario-acoes"><p>Use somente informações fictícias.</p><button className="botao-principal">Conferir preenchimento</button></div>{conferido ? <div className="aviso" role="status">Campos conferidos. Esta é uma prévia: nenhum registro foi salvo.</div> : null}</form></section> : null}
  </>
}
