import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { consultarSessao, entrar } from './api/auth'
import type { Perfil } from './api/auth'
import ThemeSwitch from './ThemeSwitch'
import RecuperarSenha from './RecuperarSenha'
import CadastroConta from './CadastroConta'
import Marca from './components/Marca'
import PularConteudo from './components/PularConteudo'
import { SESSAO_EXPIRADA } from './api/sessao'
import Workspace from './Workspace'

function Cadeado() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
    <rect x="5" y="10" width="14" height="11" rx="3" /><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" />
  </svg>
}

function Apresentacao() {
  return <aside className="apresentacao">
    <Marca />
    <div className="apresentacao-corpo">
      <div className="selo"><span /> Gestão para o seu negócio</div>
      <h1>Mais clareza.<br />Mais espaço<br />para crescer.</h1>
      <p>Seu negócio tem muitas partes.<br />Suas finanças podem ter um só lugar.</p>
      <div className="organizacao" aria-label="Clientes, vendas e recebimentos: o que estamos construindo">
        <div className="organizacao-cabecalho"><span className="mini-simbolo" aria-hidden="true">↗</span><span>Uma rotina mais organizada</span></div>
        <div className="organizacao-linha"><span>Clientes</span><span className="organizacao-traco" /></div>
        <div className="organizacao-linha"><span>Vendas e serviços</span><span className="organizacao-traco medio" /></div>
        <div className="organizacao-linha"><span>Recebimentos</span><span className="organizacao-traco curto" /></div>
        <div className="organizacao-rodape">Em construção, junto com você.</div>
      </div>
    </div>
    <p className="apresentacao-rodape">Para quem faz o próprio negócio acontecer.</p>
  </aside>
}

function Login({ aoEntrar, aviso }: { aoEntrar: (perfil: Perfil) => void; aviso: string }) {
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const trava = useRef(false)
  const [tela, setTela] = useState<'login' | 'recuperacao' | 'cadastro'>('login')
  const [mensagem, setMensagem] = useState('')

  useEffect(() => {
    document.title = `${tela === 'cadastro' ? 'Criar conta' : tela === 'recuperacao' ? 'Recuperar senha' : 'Entrar'} | NextFlow`
  }, [tela])

  function voltarLogin(texto?: string) {
    setTela('login')
    setMensagem(texto ?? '')
    setErro('')
    setMostrarSenha(false)
  }

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (trava.current) return
    const formulario = evento.currentTarget
    const dados = new FormData(formulario)
    trava.current = true
    setEnviando(true)
    setErro('')
    try {
      const perfil = await entrar(String(dados.get('email')).trim(), String(dados.get('senha')))
      formulario.reset()
      aoEntrar(perfil)
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'Não foi possível entrar. Tente novamente.')
      const campoSenha = formulario.elements.namedItem('senha') as HTMLInputElement
      campoSenha.value = ''
      campoSenha.focus()
    } finally {
      dados.delete('senha')
      trava.current = false
      setEnviando(false)
    }
  }

  return <div className="login-layout">
    <Apresentacao />
    <main className="acesso" id="conteudo" tabIndex={-1}>
      <div className="acesso-topo"><span>Seu espaço de gestão</span><ThemeSwitch /></div>
      <div className="formulario-container">
        <div className="icone-acesso"><Cadeado /></div>
        {tela === 'recuperacao' ? <RecuperarSenha voltar={voltarLogin} /> : tela === 'cadastro' ? <CadastroConta voltar={voltarLogin} /> : <>
        <h2>Bom ter você por aqui.</h2>
        <p className="subtitulo">Entre na sua conta para continuar.</p>
        {mensagem || aviso ? <div className="aviso" role="status">{mensagem || aviso}</div> : null}
        <form onSubmit={enviar} aria-busy={enviando}>
          <label htmlFor="email">E-mail</label>
          <input id="email" name="email" type="email" autoComplete="username" placeholder="exemplo@email.com.br" required maxLength={254} disabled={enviando} />
          <label htmlFor="senha">Senha</label>
          <div className="campo-senha">
            <input id="senha" name="senha" type={mostrarSenha ? 'text' : 'password'} autoComplete="current-password" placeholder="Digite sua senha" required disabled={enviando} aria-describedby={erro ? 'erro-login' : undefined} />
            <button className="mostrar-senha" type="button" onClick={() => setMostrarSenha(!mostrarSenha)} aria-pressed={mostrarSenha} disabled={enviando}>{mostrarSenha ? 'Ocultar' : 'Mostrar'}</button>
          </div>
          <div className="opcoes-login"><button type="button" className="link-botao" disabled={enviando} onClick={() => setTela('recuperacao')}>Esqueci minha senha</button></div>
          {erro ? <div id="erro-login" className="erro" role="alert">{erro}</div> : null}
          <button className="botao-principal" type="submit" disabled={enviando}>{enviando ? 'Entrando…' : 'Entrar na minha conta'}</button>
        </form>
        <div className="nota-seguranca"><Cadeado /><span>Seu acesso é pessoal. Não compartilhe sua senha.</span></div>
        <div className="nota-versao"><span>Ainda não tem uma conta?</span> <button type="button" className="link-botao" onClick={() => setTela('cadastro')} disabled={enviando}>Criar minha conta</button></div>
        </>}
      </div>
      <footer className="acesso-rodape"><span>NextFlow © {new Date().getFullYear()}</span><span>Feito para simplificar.</span></footer>
    </main>
  </div>
}

export default function App() {
  const [perfil, setPerfil] = useState<Perfil | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [aviso, setAviso] = useState('')

  async function carregar() {
    setCarregando(true)
    setErro('')
    try { setPerfil(await consultarSessao()) }
    catch (falha) { setErro(falha instanceof Error ? falha.message : 'Não foi possível verificar sua sessão.') }
    finally { setCarregando(false) }
  }
  useEffect(() => { void carregar() }, [])
  useEffect(() => {
    const expirar = () => {
      setPerfil(null)
      setAviso('Sua sessão expirou. Entre novamente para continuar. Confira os registros antes de repetir uma operação.')
    }
    window.addEventListener(SESSAO_EXPIRADA, expirar)
    return () => window.removeEventListener(SESSAO_EXPIRADA, expirar)
  }, [])
  useEffect(() => { if (!perfil) document.title = 'Entrar | NextFlow' }, [perfil])

  if (carregando || erro) return <main className="estado-inicial"><Marca /><div role="status"><h1>{carregando ? 'Preparando seu espaço…' : 'Não foi possível conectar'}</h1><p>{carregando ? 'Verificando sua sessão com segurança.' : erro}</p>{erro ? <button className="botao-principal" onClick={carregar}>Tentar novamente</button> : null}</div></main>
  return <><PularConteudo />{perfil
    ? <Workspace perfil={perfil} aoSair={() => { setPerfil(null); setAviso('Você saiu da sua conta com segurança.') }} />
    : <Login aoEntrar={setPerfil} aviso={aviso} />}</>
}
