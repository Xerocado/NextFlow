import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { consultarEmpresa, salvarDadosEmpresa } from './api/estabelecimentos'
import type { EmpresaSalva, DadosEmpresa } from './api/estabelecimentos'
import { buscarEnderecoCep } from './api/cep'

export interface IdentidadeEmpresa { nome: string; icone?: string }

export default function MinhaEmpresa({ identidade, empresaSalva, aoSalvar, aoConferir }: { identidade: IdentidadeEmpresa; empresaSalva: EmpresaSalva | null; aoSalvar: (empresa: EmpresaSalva) => void; aoConferir: (empresa: IdentidadeEmpresa) => void }) {
  const [dados, setDados] = useState<DadosEmpresa | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [falhaCarga, setFalhaCarga] = useState(false)
  const [tentativa, setTentativa] = useState(0)
  const [salvando, setSalvando] = useState(false)
  const [erroSalvar, setErroSalvar] = useState('')
  const trava = useRef(false)
  const montado = useRef(true)
  useEffect(() => { montado.current = true; return () => { montado.current = false } }, [])
  useEffect(() => {
    let ativo = true
    const controle = new AbortController()
    setCarregando(true); setFalhaCarga(false); setErroSalvar(''); setConferido(false)
    if (!empresaSalva) { setCarregando(false); return }
    consultarEmpresa(empresaSalva.id, controle.signal).then(empresa => {
      if (!ativo) return
      const d = empresa.dados ?? null
      setDados(d); setCep(d?.cep ?? ''); setSemNumero(d?.semNumero ?? false)
      setEndereco({ logradouro: d?.logradouro ?? '', bairro: d?.bairro ?? '', cidade: d?.cidade ?? '', uf: d?.uf ?? '' })
    }).catch(erro => { if (ativo) { setErroSalvar(erro.message); setFalhaCarga(true) } })
      .finally(() => { if (ativo) setCarregando(false) })
    return () => { ativo = false; controle.abort() }
  }, [empresaSalva?.id, tentativa])
  const [conferido, setConferido] = useState(false)
  const [semNumero, setSemNumero] = useState(false)
  const [cep, setCep] = useState('')
  const [endereco, setEndereco] = useState({ logradouro: '', bairro: '', cidade: '', uf: '' })
  const [buscando, setBuscando] = useState(false)
  const [erroCep, setErroCep] = useState('')
  const [avisoCep, setAvisoCep] = useState('')
  const [icone, setIcone] = useState(identidade.icone)
  const [erroIcone, setErroIcone] = useState('')
  const [lendoIcone, setLendoIcone] = useState(false)
  const leitor = useRef<FileReader | null>(null)
  useEffect(() => () => leitor.current?.abort(), [])

  function escolherIcone(evento: ChangeEvent<HTMLInputElement>) {
    leitor.current?.abort(); leitor.current = null
    setLendoIcone(false); setErroIcone(''); setConferido(false)
    const arquivo = evento.target.files?.[0]
    if (!arquivo) return
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(arquivo.type) || arquivo.size > 2 * 1024 * 1024) {
      setErroIcone('Escolha uma imagem PNG, JPG ou WebP de até 2 MB.')
      evento.target.value = ''
      return
    }
    const leitura = new FileReader()
    leitor.current = leitura; setLendoIcone(true)
    leitura.onload = () => {
      if (leitor.current !== leitura) return
      if (typeof leitura.result === 'string') setIcone(leitura.result)
      leitor.current = null; setLendoIcone(false)
    }
    leitura.onerror = () => {
      if (leitor.current !== leitura) return
      setErroIcone('Não foi possível ler a imagem. Escolha outro arquivo.')
      leitor.current = null; setLendoIcone(false)
    }
    leitura.readAsDataURL(arquivo)
  }
  const consulta = useRef<AbortController | null>(null)
  useEffect(() => () => consulta.current?.abort(), [])

  async function consultarCep() {
    if (consulta.current) return
    const controle = new AbortController()
    consulta.current = controle
    setBuscando(true); setErroCep(''); setAvisoCep(''); setConferido(false)
    try {
      const encontrado = await buscarEnderecoCep(cep, controle.signal)
      if (controle.signal.aborted) return
      setEndereco(encontrado)
      setAvisoCep('Endereço consultado. Confira os campos e informe número e complemento, se houver. Campos não encontrados podem ser preenchidos manualmente.')
    } catch (erro) {
      if (!controle.signal.aborted) setErroCep(erro instanceof Error ? erro.message : 'Não foi possível consultar o CEP. Preencha manualmente.')
    } finally {
      if (consulta.current === controle) { consulta.current = null; setBuscando(false) }
    }
  }

  function mudarCep(valor: string) {
    consulta.current?.abort(); consulta.current = null
    setCep(valor); setBuscando(false); setErroCep(''); setConferido(false)
    setAvisoCep('Confira o endereço após alterar o CEP ou faça uma nova busca.')
  }

  async function conferir(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (!empresaSalva || trava.current || lendoIcone || buscando) return
    const formulario = new FormData(evento.currentTarget)
    const texto = (campo: string) => String(formulario.get(campo) ?? '').trim()
    trava.current = true; setSalvando(true); setErroSalvar(''); setConferido(false)
    try {
      const salva = await salvarDadosEmpresa(empresaSalva.id, {
        atividade: texto('atividade'), telefone: texto('telefone'), cep: cep.trim(),
        ...endereco, uf: endereco.uf.toUpperCase().trim(), numero: semNumero ? null : texto('numero'),
        complemento: texto('complemento'), semNumero,
      })
      if (!montado.current) return
      aoSalvar(salva); aoConferir({ nome: salva.nome, icone }); setConferido(true)
    } catch (erro) {
      if (montado.current) setErroSalvar(erro instanceof Error ? erro.message : 'Não foi possível salvar.')
    } finally { trava.current = false; if (montado.current) setSalvando(false) }
  }

  if (!empresaSalva) return <section className="painel"><p>Cadastre ou selecione uma empresa acima para editar seus dados.</p></section>
  if (carregando) return <p role="status">Carregando dados da empresa…</p>
  if (falhaCarga) return <section className="painel"><div className="erro" role="alert">{erroSalvar}</div><button type="button" className="botao-secundario" onClick={() => setTentativa(valor => valor + 1)}>Tentar carregar dados novamente</button></section>

  return <section className="painel formulario-preview empresa-preview" aria-labelledby="empresa-titulo">
    <div className="painel-titulo"><div><h2 id="empresa-titulo">Dados da empresa</h2><p>Salve atividade, telefone e endereço da empresa selecionada. O ícone fica somente nesta sessão.</p></div><span className="badge badge-neutro">Cadastro</span></div>
    <form onSubmit={conferir} onChange={() => setConferido(false)}>
      <fieldset className="empresa-grupo" disabled={salvando}>
        <legend>Sobre o negócio</legend>
        <div className="grade-formulario">
          <div><label htmlFor="empresa-nome">Nome da empresa</label><input id="empresa-nome" name="nome" autoComplete="organization" required pattern=".*\S.*" maxLength={120} value={empresaSalva.nome} readOnly placeholder="Ex.: Negócio de exemplo" /></div>
          <div><label htmlFor="empresa-atividade">Tipo de atividade</label><select id="empresa-atividade" name="atividade" required defaultValue={dados?.atividade ?? ''}><option value="" disabled>Selecione uma atividade</option><option value="servicos">Prestação de serviços</option><option value="produtos">Venda de produtos</option><option value="ambos">Serviços e produtos</option></select></div>

          <div><label htmlFor="empresa-telefone">Telefone <span className="empresa-opcional">(opcional)</span></label><input id="empresa-telefone" name="telefone" defaultValue={dados?.telefone ?? ''} type="tel" autoComplete="tel" maxLength={30} placeholder="(00) 00000-0000" /></div>
        </div>
        <div className="empresa-imagem"><label htmlFor="empresa-icone">Ícone da empresa <span className="empresa-opcional">(opcional)</span></label><input id="empresa-icone" type="file" accept="image/png,image/jpeg,image/webp" onChange={escolherIcone} aria-describedby="empresa-icone-ajuda" /><p className="empresa-ajuda" id="empresa-icone-ajuda">PNG, JPG ou WebP de até 2 MB. A imagem fica apenas nesta página e não é enviada a um servidor.</p>
          {icone ? <div className="empresa-imagem-previa"><img src={icone} alt="Prévia do ícone da empresa" /><button className="botao-secundario" type="button" onClick={() => { leitor.current?.abort(); leitor.current = null; setLendoIcone(false); setIcone(undefined); setErroIcone(''); setConferido(false) }}>Remover ícone</button></div> : null}
          {lendoIcone ? <p role="status">Preparando imagem…</p> : null}
          {erroIcone ? <div className="erro" role="alert">{erroIcone}</div> : null}
        </div>
      </fieldset>
      <fieldset className="empresa-grupo" disabled={salvando}>
        <legend>Endereço</legend>
        <p className="empresa-ajuda" id="empresa-cep-ajuda">Busque pelo CEP ou preencha manualmente. Ao buscar, somente o CEP é enviado ao ViaCEP; rua, bairro, cidade e estado serão substituídos pelo resultado.</p>
        <div className="grade-formulario">
          <div><label htmlFor="empresa-cep">CEP</label><div className="empresa-busca-cep"><input id="empresa-cep" name="cep" autoComplete="postal-code" inputMode="numeric" maxLength={9} placeholder="00000-000" value={cep} onChange={e => mudarCep(e.target.value)} aria-describedby="empresa-cep-ajuda" aria-invalid={erroCep ? true : undefined} /><button className="botao-secundario" type="button" onClick={consultarCep} disabled={buscando || salvando}>{buscando ? 'Buscando…' : 'Buscar endereço'}</button></div></div>
          <div><label htmlFor="empresa-rua">Rua ou avenida</label><input id="empresa-rua" name="logradouro" autoComplete="address-line1" maxLength={150} value={endereco.logradouro} disabled={buscando || salvando} onChange={e => setEndereco({ ...endereco, logradouro: e.target.value })} /></div>
          <div><label htmlFor="empresa-numero">Número{semNumero ? '' : ' (obrigatório)'}</label><input id="empresa-numero" name="numero" defaultValue={dados?.numero ?? ''} maxLength={20} placeholder={semNumero ? 'Sem número' : 'Ex.: 123'} required={!semNumero} disabled={semNumero || salvando} pattern=".*\S.*" /><label className="empresa-sem-numero"><input name="semNumero" type="checkbox" checked={semNumero} onChange={e => setSemNumero(e.target.checked)} />Endereço sem número</label></div>
          <div><label htmlFor="empresa-complemento">Complemento</label><input id="empresa-complemento" name="complemento" defaultValue={dados?.complemento ?? ''} autoComplete="address-line2" maxLength={100} placeholder="Ex.: Sala, loja ou referência" /></div>
          <div><label htmlFor="empresa-bairro">Bairro</label><input id="empresa-bairro" name="bairro" maxLength={100} value={endereco.bairro} disabled={buscando || salvando} onChange={e => setEndereco({ ...endereco, bairro: e.target.value })} /></div>
          <div><label htmlFor="empresa-cidade">Cidade</label><input id="empresa-cidade" name="cidade" autoComplete="address-level2" maxLength={100} value={endereco.cidade} disabled={buscando || salvando} onChange={e => setEndereco({ ...endereco, cidade: e.target.value })} /></div>
          <div><label htmlFor="empresa-uf">Estado (UF)</label><input id="empresa-uf" name="uf" autoComplete="address-level1" maxLength={2} placeholder="Ex.: SP" value={endereco.uf} disabled={buscando || salvando} onChange={e => setEndereco({ ...endereco, uf: e.target.value })} /></div>
        </div>
        {erroCep ? <div className="erro" role="alert">{erroCep}</div> : null}
        {avisoCep ? <div className="aviso" role="status">{avisoCep}</div> : null}
      </fieldset>
      <div className="formulario-acoes"><p>Os dados serão salvos na empresa selecionada. O ícone permanece apenas nesta sessão.</p><button className="botao-principal" type="submit" disabled={lendoIcone || salvando || buscando}>{salvando ? 'Salvando…' : 'Salvar dados da empresa'}</button></div>
      {erroSalvar ? <div className="erro" role="alert">{erroSalvar}</div> : null}
      {conferido ? <div className="aviso" role="status">Dados da empresa salvos no banco. O ícone permanece apenas nesta sessão.</div> : null}
    </form>
  </section>
}
