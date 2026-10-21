import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { consultarEntrega, criarEntrega, hoje, listarEntregas, prepararEntrega, prepararPagamento, registrarPagamento } from './api/entregas'
import type { DetalheEntrega, EntregasPagina } from './api/entregas'
import { listarClientes } from './api/clientes'
import type { ClientesPagina } from './api/clientes'

const reais = (valor: number) => valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const dataTexto = (data: string) => data.split('-').reverse().join('/')
const mensagem = (erro: unknown) => erro instanceof Error ? erro.message : 'Não foi possível concluir.'

export default function Entregas({ empresaId, pendentes = false }: { empresaId: string; pendentes?: boolean }) {
  const [inicio, setInicio] = useState(() => `${hoje().slice(0, 7)}-01`)
  const [fim, setFim] = useState(hoje)
  const [pagina, setPagina] = useState(0)
  const [versao, setVersao] = useState(0)
  const [lista, setLista] = useState<EntregasPagina | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [aviso, setAviso] = useState('')
  const [conferir, setConferir] = useState(false)
  const [cliente, setCliente] = useState('')
  const [clientes, setClientes] = useState<ClientesPagina | null>(null)
  const [paginaClientes, setPaginaClientes] = useState(0)
  const [erroClientes, setErroClientes] = useState('')
  const [gratis, setGratis] = useState(false)
  const [id, setId] = useState<string | null>(null)
  const [detalhe, setDetalhe] = useState<DetalheEntrega | null>(null)
  const [erroDetalhe, setErroDetalhe] = useState('')
  const trava = useRef(false)
  const montado = useRef(true)
  useEffect(() => { montado.current = true; return () => { montado.current = false } }, [])
  useEffect(() => {
    const controle = new AbortController()
    setCarregando(true); setLista(null); setErro('')
    listarEntregas(empresaId, inicio, fim, pendentes, pagina, controle.signal).then(dados => {
      if (!controle.signal.aborted) { setLista(dados); setConferir(false) }
    }).catch(e => { if (!controle.signal.aborted) setErro(mensagem(e)) })
      .finally(() => { if (!controle.signal.aborted) setCarregando(false) })
    return () => controle.abort()
  }, [empresaId, inicio, fim, pendentes, pagina, versao])
  useEffect(() => {
    if (pendentes) return
    const controle = new AbortController()
    setClientes(null); setErroClientes('')
    listarClientes(empresaId, paginaClientes, controle.signal).then(dados => { if (!controle.signal.aborted) setClientes(dados) })
      .catch(e => { if (!controle.signal.aborted) setErroClientes(mensagem(e)) })
    return () => controle.abort()
  }, [empresaId, paginaClientes, pendentes, versao])
  useEffect(() => {
    setDetalhe(null); setErroDetalhe('')
    if (!id) return
    const controle = new AbortController()
    consultarEntrega(empresaId, id, controle.signal).then(dados => { if (!controle.signal.aborted) setDetalhe(dados) })
      .catch(e => { if (!controle.signal.aborted) setErroDetalhe(mensagem(e)) })
    return () => controle.abort()
  }, [empresaId, id, versao])

  async function cadastrar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (trava.current || conferir || carregando || !lista) return
    const form = evento.currentTarget, campos = new FormData(form)
    const entrada = { data: String(campos.get('data')), clienteId: cliente || null, identificacaoAvulso: cliente ? '' : String(campos.get('identificacao') ?? ''), litros: String(campos.get('litros')), valorTotal: String(campos.get('valor')), semCobranca: gratis, motivo: String(campos.get('motivo') ?? '') }
    try { prepararEntrega(entrada) } catch (e) { setErro(mensagem(e)); return }
    trava.current = true; setSalvando(true); setErro(''); setAviso('')
    try {
      const entrega = await criarEntrega(empresaId, entrada)
      if (!montado.current) return
      form.reset(); setCliente(''); setGratis(false); setId(entrega.id)
      setAviso('Entrega registrada. Para registrar um recebimento, use o detalhe abaixo.'); setVersao(n => n + 1)
    } catch (e) { if (montado.current) { setErro(mensagem(e)); setConferir(true) } }
    finally { trava.current = false; if (montado.current) setSalvando(false) }
  }
  async function receber(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (trava.current || conferir || !detalhe || !lista || carregando) return
    const form = evento.currentTarget, campos = new FormData(form)
    const data = String(campos.get('data')), valor = String(campos.get('valor')), saldo = detalhe.entrega.saldoPendente.toFixed(2)
    try { prepararPagamento(data, valor, saldo) } catch (e) { setErro(mensagem(e)); return }
    trava.current = true; setSalvando(true); setErro(''); setAviso('')
    try {
      await registrarPagamento(empresaId, detalhe.entrega.id, data, valor, saldo)
      if (!montado.current) return
      form.reset(); setAviso('Recebimento registrado.'); setPagina(0); setVersao(n => n + 1)
    } catch (e) { if (montado.current) { setErro(mensagem(e)); setConferir(true) } }
    finally { trava.current = false; if (montado.current) setSalvando(false) }
  }
  return <>
    <div className="barra-pagina"><label>De<input type="date" value={inicio} required disabled={salvando} onChange={e => { if (e.target.value) { setInicio(e.target.value); setPagina(0); setId(null) } }} /></label>
      <label>Até<input type="date" value={fim} required disabled={salvando} onChange={e => { if (e.target.value) { setFim(e.target.value); setPagina(0); setId(null) } }} /></label>
      <button className="botao-secundario" disabled={carregando || salvando} onClick={() => setVersao(n => n + 1)}>Atualizar registros</button></div>
    <p className="rodape-painel">O período filtra a data da entrega{pendentes ? ', inclusive para as pendências. Amplie o período para consultar entregas antigas' : ''}. Recebimentos usam a data efetiva do pagamento.</p>
    {!pendentes ? <section className="painel formulario-preview"><div className="painel-titulo"><div><h2>Registrar entrega</h2><p>Informe os litros e o valor combinado. Registre os pagamentos separadamente.</p></div></div>
      <form onSubmit={cadastrar}><fieldset className="empresa-grupo" disabled={salvando || carregando || conferir || !lista}>
        <div className="grade-formulario"><div><label htmlFor="entrega-data">Data da entrega</label><input id="entrega-data" name="data" type="date" required defaultValue={hoje()} /></div>
          <div><label htmlFor="entrega-cliente">Cliente</label><select id="entrega-cliente" value={cliente} onChange={e => setCliente(e.target.value)}><option value="">Não identificado</option>{cliente && !clientes?.itens.some(c => c.id === cliente) ? <option value={cliente}>Cliente selecionado em outra página</option> : null}{clientes?.itens.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}</select>
            {erroClientes ? <p role="alert">{erroClientes} Use Atualizar registros para tentar novamente.</p> : !clientes ? <p role="status">Carregando clientes…</p> : <div className="formulario-acoes"><button type="button" className="botao-secundario" disabled={paginaClientes === 0} onClick={() => setPaginaClientes(n => n - 1)}>Clientes anteriores</button><span>Página {paginaClientes + 1}</span><button type="button" className="botao-secundario" disabled={(paginaClientes + 1) * clientes.tamanho >= clientes.total} onClick={() => setPaginaClientes(n => n + 1)}>Mais clientes</button></div>}</div>
          {!cliente ? <div><label htmlFor="entrega-avulso">Identificação (opcional)</label><input id="entrega-avulso" name="identificacao" maxLength={120} /></div> : null}
          <div><label htmlFor="entrega-litros">Litros</label><input id="entrega-litros" name="litros" inputMode="numeric" pattern="[0-9]+" required /></div>
          <div><label htmlFor="entrega-cobranca">Cobrança</label><select id="entrega-cobranca" value={gratis ? 'sem' : 'normal'} onChange={e => setGratis(e.target.value === 'sem')}><option value="normal">Com cobrança</option><option value="sem">Sem cobrança</option></select></div>
          <div><label htmlFor="entrega-valor">Valor total (R$)</label><input id="entrega-valor" name="valor" inputMode="decimal" pattern="[0-9]{1,12}([.,][0-9]{1,2})?" required placeholder={gratis ? 'Pode ser 0,00' : 'Ex.: 120,00'} /></div>
          <div><label htmlFor="entrega-motivo">Motivo (opcional)</label><textarea id="entrega-motivo" name="motivo" maxLength={500} rows={2} /></div></div>
        <div className="formulario-acoes"><p>Sem cobrança não gera dívida.</p><button className="botao-principal">{salvando ? 'Registrando…' : 'Registrar entrega'}</button></div>
      </fieldset></form></section> : null}
    {erro ? <div className="erro" role="alert">{erro} {conferir ? 'Atualize e confira a lista e os pagamentos antes de repetir, para evitar duplicidade.' : ''}</div> : null}
    {aviso ? <div className="aviso" role="status">{aviso}</div> : null}
    {carregando ? <p role="status">Carregando entregas…</p> : lista ? <section className="painel"><div className="painel-titulo"><div><h2>{pendentes ? 'Entregas com saldo pendente' : 'Histórico de entregas'}</h2><p>{lista.total} registros no período</p></div></div>
      <div className="tabela-scroll" tabIndex={0} role="region" aria-label="Entregas registradas"><table><caption className="sr-only">Entregas da empresa no período selecionado</caption><thead><tr>{['Data', 'Cliente', 'Litros', 'Total', 'Recebido', 'Pendente', 'Situação', 'Ações'].map(t => <th key={t} scope="col">{t}</th>)}</tr></thead><tbody>
        {lista.itens.map(e => <tr key={e.id}><td>{dataTexto(e.data)}</td><td className="texto-historico">{e.identificacao || 'não identificado'}</td><td>{e.litros}</td><td>{reais(e.valorTotal)}</td><td>{reais(e.valorPago)}</td><td>{reais(e.saldoPendente)}</td><td><span className={`badge badge-${e.saldoPendente > 0 ? 'alerta' : 'sucesso'}`}>{e.semCobranca ? 'Sem cobrança' : e.saldoPendente === 0 ? 'Pago' : e.valorPago > 0 ? 'Parcial' : 'Pendente'}</span></td><td><button className="botao-secundario" disabled={salvando} onClick={() => { setId(e.id); setErro(''); setAviso('') }}>Ver detalhes</button></td></tr>)}
        {!lista.itens.length ? <tr><td colSpan={8}>Nenhuma entrega {pendentes ? 'pendente ' : ''}neste período.</td></tr> : null}</tbody></table></div>
      <div className="painel-titulo"><button className="botao-secundario" disabled={pagina === 0 || salvando} onClick={() => setPagina(n => n - 1)}>Anterior</button><span>Página {pagina + 1}</span><button className="botao-secundario" disabled={(pagina + 1) * lista.tamanho >= lista.total || salvando} onClick={() => setPagina(n => n + 1)}>Próxima</button></div></section> : null}
    {id ? <section className="painel formulario-preview" aria-label="Detalhes da entrega"><div className="painel-titulo"><div><h2>Detalhes da entrega</h2><p>{detalhe ? `${detalhe.entrega.identificacao || 'não identificado'} · ${dataTexto(detalhe.entrega.data)} · ${detalhe.entrega.litros} litros` : 'Consultando entrega…'}</p></div><button className="botao-secundario" disabled={salvando} onClick={() => setId(null)}>Fechar detalhes</button></div>
      {erroDetalhe ? <p className="erro" role="alert">{erroDetalhe} Use Atualizar registros para tentar novamente.</p> : detalhe ? <>
        <p>Total: {reais(detalhe.entrega.valorTotal)} · Recebido: {reais(detalhe.entrega.valorPago)} · Pendente: {reais(detalhe.entrega.saldoPendente)}</p>
        {detalhe.entrega.semCobranca ? <p>Entrega sem cobrança.</p> : null}{detalhe.entrega.motivo ? <p className="texto-historico">Motivo: {detalhe.entrega.motivo}</p> : null}
        <h3>Recebimentos registrados</h3>{detalhe.pagamentos.length ? <ul>{detalhe.pagamentos.map(p => <li key={p.id}>{dataTexto(p.data)} · {reais(p.valor)}</li>)}</ul> : <p>Nenhum recebimento registrado.</p>}
        {detalhe.entrega.saldoPendente > 0 ? <form key={`${id}-${versao}`} onSubmit={receber}><fieldset className="empresa-grupo" disabled={salvando || conferir || carregando || !lista}><h3>Registrar recebimento</h3><div className="grade-formulario"><div><label htmlFor="pagamento-data">Data efetiva</label><input id="pagamento-data" name="data" type="date" defaultValue={hoje()} max={hoje()} required /></div><div><label htmlFor="pagamento-valor">Valor recebido (R$)</label><input id="pagamento-valor" name="valor" inputMode="decimal" pattern="[0-9]{1,12}([.,][0-9]{1,2})?" required /></div></div><div className="formulario-acoes"><p>Aceita pagamento parcial, até o saldo pendente.</p><button className="botao-principal">{salvando ? 'Registrando…' : 'Registrar recebimento'}</button></div></fieldset></form> : null}
      </> : <p role="status">Carregando detalhes…</p>}</section> : null}
  </>
}
