import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { listarClientes, salvarCliente } from './api/clientes'
import type { Cliente, ClientesPagina } from './api/clientes'

export default function Clientes({ empresaId }: { empresaId: string }) {
  const [pagina, setPagina] = useState(0)
  const [atualizacao, setAtualizacao] = useState(0)
  const [resultado, setResultado] = useState<ClientesPagina | null>(null)
  const [editando, setEditando] = useState<Cliente | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [conferirLista, setConferirLista] = useState(false)
  const [erro, setErro] = useState('')
  const [aviso, setAviso] = useState('')
  const trava = useRef(false)
  const montado = useRef(true)
  const nome = useRef<HTMLInputElement>(null)

  useEffect(() => { montado.current = true; return () => { montado.current = false } }, [])
  useEffect(() => {
    const controle = new AbortController()
    setCarregando(true); setResultado(null); setErro('')
    listarClientes(empresaId, pagina, controle.signal).then(dados => {
      if (!controle.signal.aborted) { setResultado(dados); setConferirLista(false) }
    }).catch(falha => { if (!controle.signal.aborted) setErro(falha.message) })
      .finally(() => { if (!controle.signal.aborted) setCarregando(false) })
    return () => controle.abort()
  }, [empresaId, pagina, atualizacao])

  async function salvar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (trava.current || conferirLista || carregando || !resultado) return
    const formulario = evento.currentTarget
    const campos = new FormData(formulario)
    trava.current = true; setSalvando(true); setErro(''); setAviso('')
    try {
      await salvarCliente(empresaId, { nome: String(campos.get('nome') ?? ''),
        telefone: String(campos.get('telefone') ?? ''), observacao: String(campos.get('observacao') ?? '') }, editando?.id)
      if (!montado.current) return
      formulario.reset(); setEditando(null); setAviso(editando ? 'Cliente atualizado.' : 'Cliente cadastrado.')
      setPagina(0); setAtualizacao(n => n + 1)
    } catch (falha) {
      if (montado.current) { setErro(falha instanceof Error ? falha.message : 'Não foi possível salvar.'); setConferirLista(true) }
    } finally { trava.current = false; if (montado.current) setSalvando(false) }
  }

  function editar(cliente: Cliente) {
    setEditando(cliente); setAviso(''); setErro('')
    requestAnimationFrame(() => nome.current?.focus())
  }

  return <>
    <div className="barra-pagina"><p>Cadastre os contatos desta empresa e selecione-os ao registrar entregas no Histórico de pedidos.</p>
      <button type="button" className="botao-secundario" disabled={carregando || salvando} onClick={() => {
        setEditando(null); setAtualizacao(n => n + 1)
      }}>Atualizar lista</button></div>
    <section className="painel formulario-preview"><div className="painel-titulo"><div>
      <h2>{editando ? 'Editar cliente' : 'Cadastrar cliente'}</h2><p>Somente o nome é obrigatório.</p>
    </div></div>
      <form key={editando?.id ?? 'novo'} onSubmit={salvar} aria-busy={salvando}>
        <fieldset className="empresa-grupo" disabled={salvando || carregando || conferirLista || !resultado}>
          <div className="grade-formulario"><div><label htmlFor="cliente-nome">Nome</label>
            <input ref={nome} id="cliente-nome" name="nome" required maxLength={120} pattern=".*\S.*" defaultValue={editando?.nome ?? ''} /></div>
            <div><label htmlFor="cliente-telefone">Telefone (opcional)</label>
              <input id="cliente-telefone" name="telefone" type="tel" maxLength={30} defaultValue={editando?.telefone ?? ''} /></div>
            <div><label htmlFor="cliente-observacao">Observação (opcional)</label>
              <textarea id="cliente-observacao" name="observacao" maxLength={500} rows={3} defaultValue={editando?.observacao ?? ''} /></div></div>
          <div className="formulario-acoes">{editando ? <button type="button" className="botao-secundario" onClick={() => setEditando(null)}>Cancelar edição</button> : <p>Os contatos ficam separados por empresa.</p>}
            <button className="botao-principal" type="submit">{salvando ? 'Salvando…' : editando ? 'Salvar alterações' : 'Cadastrar cliente'}</button></div>
        </fieldset>
      </form></section>
    {erro ? <div className="erro" role="alert">{erro} {conferirLista ? 'Atualize e confira a lista antes de repetir, para evitar duplicidade.' : ''}</div> : null}
    {aviso ? <div className="aviso" role="status">{aviso}</div> : null}
    {carregando ? <p role="status">Carregando clientes…</p> : resultado ? <section className="painel">
      <div className="painel-titulo"><div><h2>Clientes cadastrados</h2><p>{resultado.total} clientes nesta empresa</p></div></div>
      <div className="tabela-scroll" tabIndex={0} role="region" aria-label="Clientes cadastrados"><table>
        <caption className="sr-only">Clientes da empresa selecionada</caption><thead><tr><th scope="col">Nome</th><th scope="col">Telefone</th><th scope="col">Observação</th><th scope="col">Ações</th></tr></thead>
        <tbody>{resultado.itens.map(cliente => <tr key={cliente.id}><td className="texto-historico">{cliente.nome}</td><td>{cliente.telefone || '—'}</td><td className="texto-historico">{cliente.observacao || '—'}</td>
          <td><button className="botao-secundario" disabled={salvando || conferirLista} aria-label={`Editar ${cliente.nome}`} onClick={() => editar(cliente)}>Editar</button></td></tr>)}
          {!resultado.itens.length ? <tr><td colSpan={4}>Nenhum cliente cadastrado nesta empresa.</td></tr> : null}</tbody>
      </table></div>
      <div className="painel-titulo"><button className="botao-secundario" disabled={pagina === 0 || salvando} onClick={() => { setEditando(null); setPagina(n => n - 1) }}>Anterior</button>
        <span>Página {pagina + 1}</span><button className="botao-secundario" disabled={(pagina + 1) * resultado.tamanho >= resultado.total || salvando} onClick={() => { setEditando(null); setPagina(n => n + 1) }}>Próxima</button></div>
    </section> : null}
  </>
}
