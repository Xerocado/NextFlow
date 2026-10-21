import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { listarEmpresas, salvarNomeEmpresa } from './api/estabelecimentos'
import type { EmpresaSalva } from './api/estabelecimentos'

export default function Empresas({ aoSelecionar }: { aoSelecionar: (empresa: EmpresaSalva | null) => void }) {
  const [empresas, setEmpresas] = useState<EmpresaSalva[]>([])
  const [id, setId] = useState('')
  const [nome, setNome] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [listaDisponivel, setListaDisponivel] = useState(false)
  const [erro, setErro] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [tentativa, setTentativa] = useState(0)
  const [salvando, setSalvando] = useState(false)
  const trava = useRef(false)

  useEffect(() => {
    let ativo = true
    setCarregando(true); setListaDisponivel(false); setErro('')
    listarEmpresas().then(lista => {
      if (!ativo) return
      const unica = lista.length === 1 ? lista[0] : null
      setEmpresas(lista); setId(unica?.id ?? ''); setNome(unica?.nome ?? ''); aoSelecionar(unica)
      setListaDisponivel(true)
    }).catch(falha => { if (ativo) setErro(falha instanceof Error ? falha.message : 'Não foi possível carregar as empresas.') })
      .finally(() => { if (ativo) setCarregando(false) })
    return () => { ativo = false }
  }, [tentativa, aoSelecionar])

  function selecionar(valor: string) {
    const empresa = empresas.find(item => item.id === valor)
    setId(valor); setNome(empresa?.nome ?? ''); setMensagem(''); setErro(''); aoSelecionar(empresa ?? null)
  }

  async function salvar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (trava.current || !listaDisponivel || !nome.trim()) return
    trava.current = true; setSalvando(true); setErro(''); setMensagem('')
    try {
      const empresa = await salvarNomeEmpresa(nome.trim(), id || undefined)
      setEmpresas(anteriores => [...anteriores.filter(item => item.id !== empresa.id), empresa].sort((a, b) => a.nome.localeCompare(b.nome)))
      setId(empresa.id); setNome(empresa.nome); aoSelecionar(empresa)
      setMensagem('Nome da empresa salvo no banco. Edite os demais dados no formulário abaixo.')
    } catch (falha) {
      setErro((falha instanceof Error ? falha.message : 'Não foi possível salvar.') + (!id ? ' Antes de repetir um cadastro, atualize a lista para verificar se ele foi criado.' : ''))
    } finally { trava.current = false; setSalvando(false) }
  }

  return <section className="painel formulario-preview" aria-labelledby="empresas-salvas-titulo">
    <div className="painel-titulo"><div><h2 id="empresas-salvas-titulo">Empresa no banco de dados</h2><p>Escolha ou cadastre uma empresa. Edite o nome aqui e os demais dados no formulário abaixo.</p></div></div>
    {carregando ? <p className="rodape-painel" role="status">Carregando empresas…</p> : <form onSubmit={salvar}>
      <fieldset disabled={salvando || !listaDisponivel} className="empresa-grupo"><div className="grade-formulario">
        <div><label htmlFor="empresa-salva">Empresa</label><select id="empresa-salva" value={id} onChange={e => selecionar(e.target.value)}><option value="">Cadastrar nova empresa</option>{empresas.map(empresa => <option key={empresa.id} value={empresa.id}>{empresa.nome}</option>)}</select></div>
        <div><label htmlFor="empresa-nome-salvo">Nome da empresa</label><input id="empresa-nome-salvo" value={nome} onChange={e => { setNome(e.target.value); setMensagem('') }} required pattern=".*\S.*" maxLength={120} /></div>
      </div><div className="formulario-acoes"><button type="button" className="botao-secundario" onClick={() => setTentativa(valor => valor + 1)}>Atualizar lista</button><button className="botao-principal" type="submit">{salvando ? 'Salvando…' : id ? 'Salvar nome' : 'Cadastrar empresa'}</button></div></fieldset>
    </form>}
    {erro ? <div className="erro" role="alert">{erro}<button className="link-botao" onClick={() => setTentativa(valor => valor + 1)} disabled={salvando || carregando}>Tentar carregar a lista</button></div> : null}
    {mensagem ? <div className="aviso" role="status">{mensagem}</div> : null}
  </section>
}
