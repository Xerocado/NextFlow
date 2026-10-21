import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { cadastrarConta } from './api/auth'
import { validarSenhaCadastro } from './validacaoCadastro'

export default function CadastroConta({ voltar }: { voltar: (mensagem?: string) => void }) {
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const trava = useRef(false)
  const titulo = useRef<HTMLHeadingElement>(null)
  useEffect(() => { titulo.current?.focus() }, [])

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (trava.current) return
    const formulario = evento.currentTarget
    const dados = new FormData(formulario)
    trava.current = true
    setEnviando(true)
    setErro('')
    try {
      const nome = String(dados.get('nome')).trim()
      if (!nome) throw new Error('Informe seu nome.')
      const senha = String(dados.get('senha'))
      validarSenhaCadastro(senha, String(dados.get('confirmacao')))
      await cadastrarConta(nome, String(dados.get('email')).trim(), senha)
      formulario.reset()
      voltar('Conta criada. Entre para continuar.')
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'Não foi possível criar a conta. Tente novamente.')
      // Nao manter senhas no formulario apos uma tentativa malsucedida.
      for (const nome of ['senha', 'confirmacao']) {
        const campo = formulario.elements.namedItem(nome) as HTMLInputElement
        campo.value = ''
      }
    } finally {
      dados.delete('senha')
      dados.delete('confirmacao')
      trava.current = false
      setEnviando(false)
    }
  }

  return <>
    <button type="button" className="link-botao voltar-login" onClick={() => voltar()} disabled={enviando}>← Voltar para entrar</button>
    <h2 ref={titulo} tabIndex={-1}>Crie sua conta.</h2>
    <p className="subtitulo">Comece seu espaço no NextFlow com um acesso só seu.</p>
    <form onSubmit={enviar} aria-busy={enviando}>
      <label htmlFor="cadastro-nome">Seu nome</label>
      <input id="cadastro-nome" name="nome" autoComplete="name" required maxLength={120} placeholder="Informe Seu nome" disabled={enviando} />
      <label htmlFor="cadastro-email">E-mail</label>
      <input id="cadastro-email" name="email" type="email" autoComplete="username" required maxLength={254} placeholder="exemplo@email.com.br" disabled={enviando} />
      <label htmlFor="cadastro-senha">Senha</label>
      <div className="campo-senha">
        <input id="cadastro-senha" name="senha" type={mostrarSenha ? 'text' : 'password'} autoComplete="new-password" required minLength={12} maxLength={72} aria-describedby="cadastro-ajuda" disabled={enviando} />
        <button type="button" className="mostrar-senha" onClick={() => setMostrarSenha(!mostrarSenha)} aria-pressed={mostrarSenha} aria-label={mostrarSenha ? 'Ocultar senhas' : 'Mostrar senhas'} disabled={enviando}>{mostrarSenha ? 'Ocultar' : 'Mostrar'}</button>
      </div>
      <p className="ajuda-campo" id="cadastro-ajuda">crie uma senha com pelo menos 12 caractere.</p>
      <label htmlFor="cadastro-confirmacao">Confirme a senha</label>
      <input id="cadastro-confirmacao" name="confirmacao" type={mostrarSenha ? 'text' : 'password'} autoComplete="new-password" required minLength={12} maxLength={72} disabled={enviando} />
      {erro ? <div className="erro" role="alert">{erro}</div> : null}
      <button className="botao-principal" type="submit" disabled={enviando}>{enviando ? 'Criando conta…' : 'Criar minha conta'}</button>
    </form>
    <p className="ajuda-campo cadastro-privacidade">Use um e-mail ao qual você tenha acesso para poder recuperar sua senha.</p>
  </>
}
