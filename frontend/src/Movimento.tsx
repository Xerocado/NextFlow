import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { hoje, listarEntregas } from './api/entregas'
import type { EntregasPagina } from './api/entregas'
import { listarGastos } from './api/gastos'
import type { GastosDia } from './api/gastos'
import { consultarMovimento } from './api/movimento'
import type { MovimentoDia } from './api/movimento'

const reais = (valor: number) => valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

function ListaDia({ titulo, colunas, children, total, pagina, tamanho, carregando, erro, aoMudar }: {
  titulo: string; colunas: string[]; children: ReactNode; total: number; pagina: number; tamanho: number
  carregando: boolean; erro: string; aoMudar: (pagina: number) => void
}) {
  return <section className="painel"><div className="painel-titulo"><div><h2>{titulo}</h2><p>{total} registros no dia</p></div></div>
    <div className="tabela-scroll" tabIndex={0} role="region" aria-label={titulo}><table><caption className="sr-only">{titulo}</caption><thead><tr>{colunas.map(c => <th key={c} scope="col">{c}</th>)}</tr></thead><tbody>
      {erro ? <tr><td colSpan={colunas.length}>{erro}</td></tr> : carregando ? <tr><td colSpan={colunas.length}>Carregando lista…</td></tr> : total ? children : <tr><td colSpan={colunas.length}>Nenhum registro neste dia.</td></tr>}
    </tbody></table></div>
    <div className="painel-titulo"><button className="botao-secundario" disabled={pagina === 0 || carregando} onClick={() => aoMudar(pagina - 1)}>Anterior</button><span>Página {pagina + 1}</span><button className="botao-secundario" disabled={carregando || (pagina + 1) * tamanho >= total} onClick={() => aoMudar(pagina + 1)}>Próxima</button></div>
  </section>
}

type Resultado<T> = { chave: string; valor: T }
type Requisicao = 'movimento' | 'entregas' | 'gastos'

export default function Movimento({ empresaId }: { empresaId: string }) {
  const [data, setData] = useState(hoje)
  const [paginas, setPaginas] = useState({ entregas: 0, recebimentos: 0, gastos: 0 })
  const [versao, setVersao] = useState(0)
  const [movimento, setMovimento] = useState<Resultado<MovimentoDia> | null>(null)
  const [entregas, setEntregas] = useState<Resultado<EntregasPagina> | null>(null)
  const [gastos, setGastos] = useState<Resultado<GastosDia> | null>(null)
  const [carregando, setCarregando] = useState<Record<Requisicao, boolean>>({ movimento: true, entregas: true, gastos: true })
  const [erros, setErros] = useState<Record<Requisicao, { chave: string; mensagem: string } | null>>({ movimento: null, entregas: null, gastos: null })

  const chaves = {
    movimento: `${empresaId}|${data}|${paginas.recebimentos}|${versao}`,
    entregas: `${empresaId}|${data}|${paginas.entregas}|${versao}`,
    gastos: `${empresaId}|${data}|${paginas.gastos}|${versao}`,
  }
  const movimentoAtual = movimento?.chave === chaves.movimento ? movimento.valor : null
  const entregasAtuais = entregas?.chave === chaves.entregas ? entregas.valor : null
  const gastosAtuais = gastos?.chave === chaves.gastos ? gastos.valor : null
  const erroAtual = (tipo: Requisicao) => erros[tipo]?.chave === chaves[tipo] ? erros[tipo]?.mensagem ?? '' : ''

  useEffect(() => {
    const controle = new AbortController(), chave = chaves.movimento
    setCarregando(estado => ({ ...estado, movimento: true }))
    setErros(estado => ({ ...estado, movimento: null }))
    consultarMovimento(empresaId, data, paginas.recebimentos, controle.signal).then(valor => {
      if (!controle.signal.aborted) setMovimento({ chave, valor })
    }).catch(e => {
      if (!controle.signal.aborted) setErros(estado => ({ ...estado, movimento: { chave, mensagem: e instanceof Error ? e.message : 'Não foi possível consultar o movimento.' } }))
    }).finally(() => { if (!controle.signal.aborted) setCarregando(estado => ({ ...estado, movimento: false })) })
    return () => controle.abort()
  }, [empresaId, data, paginas.recebimentos, versao])

  useEffect(() => {
    const controle = new AbortController(), chave = chaves.entregas
    setCarregando(estado => ({ ...estado, entregas: true }))
    setErros(estado => ({ ...estado, entregas: null }))
    listarEntregas(empresaId, data, data, false, paginas.entregas, controle.signal).then(valor => {
      if (!controle.signal.aborted) setEntregas({ chave, valor })
    }).catch(e => {
      if (!controle.signal.aborted) setErros(estado => ({ ...estado, entregas: { chave, mensagem: e instanceof Error ? e.message : 'Não foi possível consultar as entregas.' } }))
    }).finally(() => { if (!controle.signal.aborted) setCarregando(estado => ({ ...estado, entregas: false })) })
    return () => controle.abort()
  }, [empresaId, data, paginas.entregas, versao])

  useEffect(() => {
    const controle = new AbortController(), chave = chaves.gastos
    setCarregando(estado => ({ ...estado, gastos: true }))
    setErros(estado => ({ ...estado, gastos: null }))
    listarGastos(empresaId, data, paginas.gastos, controle.signal).then(valor => {
      if (!controle.signal.aborted) setGastos({ chave, valor })
    }).catch(e => {
      if (!controle.signal.aborted) setErros(estado => ({ ...estado, gastos: { chave, mensagem: e instanceof Error ? e.message : 'Não foi possível consultar os gastos.' } }))
    }).finally(() => { if (!controle.signal.aborted) setCarregando(estado => ({ ...estado, gastos: false })) })
    return () => controle.abort()
  }, [empresaId, data, paginas.gastos, versao])

  function mudarPagina(lista: keyof typeof paginas, pagina: number) { setPaginas(anteriores => ({ ...anteriores, [lista]: pagina })) }
  const atualizando = Object.values(carregando).some(Boolean)
  return <>
    <div className="barra-pagina"><label>Dia do movimento<input type="date" required value={data} onChange={e => {
      if (e.target.value) { setData(e.target.value); setPaginas({ entregas: 0, recebimentos: 0, gastos: 0 }) }
    }} /></label><button className="botao-secundario" disabled={atualizando} onClick={() => setVersao(n => n + 1)}>Atualizar movimento</button></div>
    <div className="formulario-acoes"><a className="botao-secundario" href="#/historico">Registrar entrega ou recebimento</a><a className="botao-secundario" href="#/despesas">Registrar gasto</a></div>
    <p className="rodape-painel">Recebimentos entram na data efetiva do pagamento, inclusive os de entregas anteriores. O saldo do dia considera recebimentos menos gastos; não é o saldo total da empresa.</p>
    {erroAtual('movimento') ? <p className="erro" role="alert">{erroAtual('movimento')}</p> : !movimentoAtual ? <p role="status">Carregando resumo do movimento…</p> : <div className="metricas">{[
      ['Entregas com cobrança', movimentoAtual.totalEntregas, `${movimentoAtual.quantidadeEntregas} entregas · ${movimentoAtual.totalLitros} litros, incluindo sem cobrança`],
      ['Recebido no dia', movimentoAtual.totalRecebido, 'Pela data efetiva do pagamento'],
      ['Gastos do dia', movimentoAtual.totalGasto, 'Saídas registradas separadamente'],
      ['Saldo do dia', movimentoAtual.saldoDoDia, 'Recebimentos menos gastos'],
    ].map(([titulo, valor, texto]) => <section className="metrica" key={titulo}><h2>{titulo}</h2><strong>{reais(Number(valor))}</strong><p>{texto}</p></section>)}</div>}
    <ListaDia titulo="Entregas do dia" colunas={['Cliente', 'Litros', 'Valor total', 'Cobrança']} total={entregasAtuais?.total ?? 0} pagina={paginas.entregas} tamanho={entregasAtuais?.tamanho ?? 20} carregando={carregando.entregas} erro={erroAtual('entregas')} aoMudar={p => mudarPagina('entregas', p)}>
      {entregasAtuais?.itens.map(e => <tr key={e.id}><td className="texto-historico">{e.identificacao || 'Não identificado'}</td><td>{e.litros}</td><td>{reais(e.valorTotal)}</td><td>{e.semCobranca ? 'Sem cobrança' : 'Com cobrança'}</td></tr>)}
    </ListaDia>
    <ListaDia titulo="Recebimentos do dia" colunas={['Cliente', 'Data da entrega', 'Valor recebido']} total={movimentoAtual?.recebimentos.total ?? 0} pagina={paginas.recebimentos} tamanho={movimentoAtual?.recebimentos.tamanho ?? 20} carregando={carregando.movimento} erro={erroAtual('movimento')} aoMudar={p => mudarPagina('recebimentos', p)}>
      {movimentoAtual?.recebimentos.itens.map(p => <tr key={p.id}><td className="texto-historico">{p.identificacao || 'Avulso sem identificação'}</td><td>{p.dataEntrega.split('-').reverse().join('/')}</td><td>{reais(p.valor)}</td></tr>)}
    </ListaDia>
    <ListaDia titulo="Gastos do dia" colunas={['Descrição', 'Categoria', 'Valor']} total={gastosAtuais?.total ?? 0} pagina={paginas.gastos} tamanho={gastosAtuais?.tamanho ?? 20} carregando={carregando.gastos} erro={erroAtual('gastos')} aoMudar={p => mudarPagina('gastos', p)}>
      {gastosAtuais?.itens.map(g => <tr key={g.id}><td className="texto-historico">{g.descricao}</td><td>{g.categoria || '—'}</td><td>{reais(g.valor)}</td></tr>)}
    </ListaDia>
  </>
}
