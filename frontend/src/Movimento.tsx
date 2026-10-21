import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { hoje, listarEntregas } from './api/entregas'
import type { EntregasPagina } from './api/entregas'
import { listarGastos } from './api/gastos'
import type { GastosDia } from './api/gastos'
import { consultarMovimento } from './api/movimento'
import type { MovimentoDia } from './api/movimento'

const reais = (valor: number) => valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

function ListaDia({ titulo, colunas, children, total, pagina, tamanho, aoMudar }: {
  titulo: string; colunas: string[]; children: ReactNode; total: number; pagina: number; tamanho: number; aoMudar: (pagina: number) => void
}) {
  return <section className="painel"><div className="painel-titulo"><div><h2>{titulo}</h2><p>{total} registros no dia</p></div></div>
    <div className="tabela-scroll" tabIndex={0} role="region" aria-label={titulo}><table><caption className="sr-only">{titulo}</caption><thead><tr>{colunas.map(c => <th key={c} scope="col">{c}</th>)}</tr></thead><tbody>{total ? children : <tr><td colSpan={colunas.length}>Nenhum registro neste dia.</td></tr>}</tbody></table></div>
    <div className="painel-titulo"><button className="botao-secundario" disabled={pagina === 0} onClick={() => aoMudar(pagina - 1)}>Anterior</button><span>Página {pagina + 1}</span><button className="botao-secundario" disabled={(pagina + 1) * tamanho >= total} onClick={() => aoMudar(pagina + 1)}>Próxima</button></div>
  </section>
}

export default function Movimento({ empresaId }: { empresaId: string }) {
  const [data, setData] = useState(hoje)
  const [paginas, setPaginas] = useState({ entregas: 0, recebimentos: 0, gastos: 0 })
  const [versao, setVersao] = useState(0)
  const [dados, setDados] = useState<{ movimento: MovimentoDia; entregas: EntregasPagina; gastos: GastosDia } | null>(null)
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(true)
  useEffect(() => {
    const controle = new AbortController()
    setCarregando(true); setDados(null); setErro('')
    Promise.all([
      consultarMovimento(empresaId, data, paginas.recebimentos, controle.signal),
      listarEntregas(empresaId, data, data, false, paginas.entregas, controle.signal),
      listarGastos(empresaId, data, paginas.gastos, controle.signal),
    ]).then(([movimento, entregas, gastos]) => { if (!controle.signal.aborted) setDados({ movimento, entregas, gastos }) })
      .catch(e => { if (!controle.signal.aborted) setErro(e instanceof Error ? e.message : 'Não foi possível consultar o movimento.') })
      .finally(() => { if (!controle.signal.aborted) setCarregando(false) })
    return () => controle.abort()
  }, [empresaId, data, paginas.entregas, paginas.recebimentos, paginas.gastos, versao])
  function mudarPagina(lista: keyof typeof paginas, pagina: number) { setPaginas(anteriores => ({ ...anteriores, [lista]: pagina })) }
  return <>
    <div className="barra-pagina"><label>Dia do movimento<input type="date" required value={data} onChange={e => {
      if (e.target.value) { setData(e.target.value); setPaginas({ entregas: 0, recebimentos: 0, gastos: 0 }) }
    }} /></label><button className="botao-secundario" disabled={carregando} onClick={() => setVersao(n => n + 1)}>Atualizar movimento</button></div>
    <div className="formulario-acoes"><a className="botao-secundario" href="#/historico">Registrar entrega ou recebimento</a><a className="botao-secundario" href="#/despesas">Registrar gasto</a></div>
    <p className="rodape-painel">Recebimentos entram na data efetiva do pagamento, inclusive os de entregas anteriores. O saldo do dia considera recebimentos menos gastos; não é o saldo total da empresa.</p>
    {erro ? <p className="erro" role="alert">{erro}</p> : null}
    {carregando ? <p role="status">Carregando movimento…</p> : dados ? <>
      <div className="metricas">{[
        ['Entregas com cobrança', dados.movimento.totalEntregas, `${dados.movimento.quantidadeEntregas} entregas · ${dados.movimento.totalLitros} litros, incluindo sem cobrança`],
        ['Recebido no dia', dados.movimento.totalRecebido, 'Pela data efetiva do pagamento'],
        ['Gastos do dia', dados.movimento.totalGasto, 'Saídas registradas separadamente'],
        ['Saldo do dia', dados.movimento.saldoDoDia, 'Recebimentos menos gastos'],
      ].map(([titulo, valor, texto]) => <section className="metrica" key={titulo}><h2>{titulo}</h2><strong>{reais(Number(valor))}</strong><p>{texto}</p></section>)}</div>
      <ListaDia titulo="Entregas do dia" colunas={['Cliente', 'Litros', 'Valor total', 'Cobrança']} total={dados.entregas.total} pagina={paginas.entregas} tamanho={dados.entregas.tamanho} aoMudar={p => mudarPagina('entregas', p)}>
        {dados.entregas.itens.map(e => <tr key={e.id}><td className="texto-historico">{e.identificacao || 'Não identificado'}</td><td>{e.litros}</td><td>{reais(e.valorTotal)}</td><td>{e.semCobranca ? 'Sem cobrança' : 'Com cobrança'}</td></tr>)}
      </ListaDia>
      <ListaDia titulo="Recebimentos do dia" colunas={['Cliente', 'Data da entrega', 'Valor recebido']} total={dados.movimento.recebimentos.total} pagina={paginas.recebimentos} tamanho={dados.movimento.recebimentos.tamanho} aoMudar={p => mudarPagina('recebimentos', p)}>
        {dados.movimento.recebimentos.itens.map(p => <tr key={p.id}><td className="texto-historico">{p.identificacao || 'Avulso sem identificação'}</td><td>{p.dataEntrega.split('-').reverse().join('/')}</td><td>{reais(p.valor)}</td></tr>)}
      </ListaDia>
      <ListaDia titulo="Gastos do dia" colunas={['Descrição', 'Categoria', 'Valor']} total={dados.gastos.total} pagina={paginas.gastos} tamanho={dados.gastos.tamanho} aoMudar={p => mudarPagina('gastos', p)}>
        {dados.gastos.itens.map(g => <tr key={g.id}><td className="texto-historico">{g.descricao}</td><td>{g.categoria || '—'}</td><td>{reais(g.valor)}</td></tr>)}
      </ListaDia>
    </> : null}
  </>
}
