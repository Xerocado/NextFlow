import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { criarGasto, listarGastos } from './api/gastos'
import type { GastosDia } from './api/gastos'

const reais = (valor: number) => valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
function hoje() {
  const partes = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date())
  const parte = (tipo: string) => partes.find(p => p.type === tipo)!.value
  return `${parte('year')}-${parte('month')}-${parte('day')}`
}

export default function Gastos({ empresaId }: { empresaId: string }) {
  const [data, setData] = useState(hoje)
  const [pagina, setPagina] = useState(0)
  const [atualizacao, setAtualizacao] = useState(0)
  const [resultado, setResultado] = useState<GastosDia | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [aviso, setAviso] = useState('')
  const [conferirLista, setConferirLista] = useState(false)
  const trava = useRef(false)
  const montado = useRef(true)
  useEffect(() => { montado.current = true; return () => { montado.current = false } }, [])
  useEffect(() => {
    const controle = new AbortController()
    setCarregando(true); setResultado(null); setErro('')
    listarGastos(empresaId, data, pagina, controle.signal).then(dados => {
      if (!controle.signal.aborted) { setResultado(dados); setConferirLista(false) }
    }).catch(falha => { if (!controle.signal.aborted) setErro(falha.message) })
      .finally(() => { if (!controle.signal.aborted) setCarregando(false) })
    return () => controle.abort()
  }, [empresaId, data, pagina, atualizacao])

  async function salvar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (trava.current || conferirLista || carregando || !resultado) return
    const formulario = evento.currentTarget
    const campos = new FormData(formulario)
    trava.current = true; setSalvando(true); setErro(''); setAviso('')
    try {
      await criarGasto(empresaId, { descricao: String(campos.get('descricao') ?? ''), valor: String(campos.get('valor') ?? ''),
        data, categoria: String(campos.get('categoria') ?? ''), observacao: String(campos.get('observacao') ?? '') })
      if (!montado.current) return
      formulario.reset(); setAviso('Gasto registrado.'); setPagina(0); setAtualizacao(n => n + 1)
    } catch (falha) {
      if (montado.current) { setErro(falha instanceof Error ? falha.message : 'Não foi possível registrar.'); setConferirLista(true) }
    } finally { trava.current = false; if (montado.current) setSalvando(false) }
  }

  return <>
    <div className="barra-pagina"><label>Dia dos gastos<input type="date" required value={data} disabled={salvando} onChange={e => {
      if (e.target.value) { setData(e.target.value); setPagina(0); setAviso('') }
    }} /></label><button type="button" className="botao-secundario" disabled={carregando || salvando} onClick={() => setAtualizacao(n => n + 1)}>Atualizar lista</button></div>
    <section className="painel formulario-preview"><div className="painel-titulo"><div><h2>Registrar gasto do dia</h2><p>Dinheiro que já saiu do caixa. Cada gasto é lançado uma vez, sem repetição automática.</p></div></div>
      <form onSubmit={salvar} aria-busy={salvando}><fieldset className="empresa-grupo" disabled={salvando || carregando || conferirLista || !resultado}>
        <div className="grade-formulario"><div><label htmlFor="gasto-descricao">Descrição</label><input id="gasto-descricao" name="descricao" required maxLength={120} pattern=".*\S.*" /></div>
          <div><label htmlFor="gasto-valor">Valor (R$)</label><input id="gasto-valor" name="valor" inputMode="decimal" required pattern="[0-9]{1,12}([.,][0-9]{1,2})?" placeholder="Ex.: 25,50" /></div>
          <div><label htmlFor="gasto-categoria">Categoria (opcional)</label><input id="gasto-categoria" name="categoria" maxLength={60} placeholder="Ex.: Transporte" /></div>
          <div><label htmlFor="gasto-observacao">Observação (opcional)</label><textarea id="gasto-observacao" name="observacao" maxLength={500} rows={2} /></div></div>
        <div className="formulario-acoes"><p>Data do gasto: {data.split('-').reverse().join('/')}</p><button className="botao-principal" type="submit">{salvando ? 'Registrando…' : 'Registrar gasto'}</button></div>
      </fieldset></form></section>
    {erro ? <div className="erro" role="alert">{erro} {conferirLista ? 'Atualize e confira a lista antes de repetir, para evitar duplicidade.' : ''}</div> : null}
    {aviso ? <div className="aviso" role="status">{aviso}</div> : null}
    {carregando ? <p role="status">Carregando gastos…</p> : resultado ? <section className="painel"><div className="painel-titulo"><div><h2>Gastos do dia</h2><p>{resultado.total} registros · Total: {reais(resultado.totalGasto)}</p></div></div>
      <div className="tabela-scroll" tabIndex={0} role="region" aria-label="Gastos registrados"><table><caption className="sr-only">Gastos reais do dia selecionado</caption><thead><tr><th scope="col">Descrição</th><th scope="col">Valor</th><th scope="col">Categoria</th><th scope="col">Observação</th></tr></thead><tbody>
        {resultado.itens.map(gasto => <tr key={gasto.id}><td className="texto-historico">{gasto.descricao}</td><td>{reais(gasto.valor)}</td><td>{gasto.categoria || '—'}</td><td className="texto-historico">{gasto.observacao || '—'}</td></tr>)}
        {!resultado.itens.length ? <tr><td colSpan={4}>Nenhum gasto registrado neste dia.</td></tr> : null}
      </tbody></table></div><div className="painel-titulo"><button className="botao-secundario" disabled={pagina === 0 || salvando} onClick={() => setPagina(n => n - 1)}>Anterior</button><span>Página {pagina + 1}</span><button className="botao-secundario" disabled={(pagina + 1) * resultado.tamanho >= resultado.total || salvando} onClick={() => setPagina(n => n + 1)}>Próxima</button></div>
      <p className="rodape-painel">Este total considera apenas os gastos do dia selecionado. Consulte entregas e recebimentos em Movimento do dia.</p></section> : null}
  </>
}

