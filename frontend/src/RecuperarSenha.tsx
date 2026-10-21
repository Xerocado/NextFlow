import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { solicitarRecuperacao, redefinirSenha } from './api/auth'

export default function RecuperarSenha({ voltar }: { voltar: (mensagem?: string) => void }) {
  const [etapa, setEtapa] = useState<'email' | 'codigo'>('email')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const [aviso, setAviso] = useState('')
  const [email, setEmail] = useState('')
  const trava = useRef(false)
  const titulo = useRef<HTMLHeadingElement>(null)

  function mudarEtapa(proxima: 'email' | 'codigo') {
    setEtapa(proxima)
    setErro('')
    requestAnimationFrame(() => titulo.current?.focus())
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
      if (etapa === 'email') {
        const endereco = String(dados.get('email')).trim()
        await solicitarRecuperacao(endereco)
        setEmail(endereco)
        setAviso('Se houver uma conta para esse e-mail, enviaremos um código de recuperação. Confira também a pasta de spam.')
        formulario.reset()
        mudarEtapa('codigo')
      } else {
        const senha = String(dados.get('novaSenha'))
        if (senha !== dados.get('confirmacao')) throw new Error('As senhas não coincidem. Digite a mesma senha nos dois campos.')
        if (senha.trim().length === 0 || [...senha].length < 12 || new TextEncoder().encode(senha).length > 72) {
          throw new Error('Use pelo menos 12 caracteres. Acentos e símbolos podem ocupar mais de um byte.')
        }
        await redefinirSenha(String(dados.get('token')).trim(), senha, String(dados.get('email')).trim())
        formulario.reset()
        voltar('Senha redefinida. Entre com sua nova senha.')
      }
    } catch (falha) {
      const mensagem = falha instanceof Error ? falha.message : 'Não foi possível concluir. Tente novamente.'
      setErro(etapa === 'codigo' && mensagem.startsWith('Não foi possível conectar')
        ? `${mensagem} Se você já enviou a nova senha, tente entrar com ela antes de solicitar outro código.`
        : mensagem)
    } finally {
      dados.delete('token')
      dados.delete('novaSenha')
      dados.delete('confirmacao')
      trava.current = false
      setEnviando(false)
    }
  }

  return <>
    <button type="button" className="link-botao voltar-login" onClick={() => voltar()} disabled={enviando}>← Voltar para entrar</button>
    <h2 ref={titulo} tabIndex={-1}>{etapa === 'email' ? 'Vamos recuperar seu acesso.' : 'Crie uma nova senha.'}</h2>
    <p className="subtitulo">{etapa === 'email' ? 'Informe o e-mail usado no cadastro para receber as instruções.' : 'Cole o código do e-mail e escolha uma senha que só você conhece.'}</p>
    {aviso && etapa === 'codigo' ? <div className="aviso" role="status">{aviso}</div> : null}
    <form key={etapa} onSubmit={enviar} aria-busy={enviando}>
      {etapa === 'email' ? <>
        <label htmlFor="email-recuperacao">E-mail de cadastro</label>
        <input id="email-recuperacao" name="email" type="email" autoComplete="email" required maxLength={254} placeholder="exemplo@email.com.br" disabled={enviando} />
      </> : <>
        <label htmlFor="email-codigo">E-mail de cadastro</label>
        <input id="email-codigo" name="email" type="email" autoComplete="email" required maxLength={254} defaultValue={email} disabled={enviando} />
        <label htmlFor="codigo">Código de recuperação</label>
        <input id="codigo" name="token" type="text" inputMode="numeric" autoComplete="one-time-code" spellCheck={false} required pattern="[0-9]{6}" minLength={6} maxLength={6} title="Informe os 6 números recebidos no e-mail." placeholder="000000" disabled={enviando} />
        <p className="ajuda-campo">Válido por 10 minutos e para um único uso. Após 5 erros, solicite outro código.</p>
        <label htmlFor="nova-senha">Nova senha</label>
        <input id="nova-senha" name="novaSenha" type="password" autoComplete="new-password" required minLength={12} maxLength={72} aria-describedby="ajuda-senha" disabled={enviando} />
        <p className="ajuda-campo" id="ajuda-senha">Pelo menos 12 caracteres. Escolha uma senha diferente da atual.</p>
        <label htmlFor="confirmar-senha">Confirme a nova senha</label>
        <input id="confirmar-senha" name="confirmacao" type="password" autoComplete="new-password" required minLength={12} maxLength={72} disabled={enviando} />
      </>}
      {erro ? <div className="erro" role="alert">{erro}</div> : null}
      <button className="botao-principal" type="submit" disabled={enviando}>{enviando ? 'Aguarde…' : etapa === 'email' ? 'Enviar código de recuperação' : 'Salvar nova senha'}</button>
    </form>
    {etapa === 'email'
      ? <button type="button" className="link-botao alternativa-recuperacao" onClick={() => mudarEtapa('codigo')} disabled={enviando}>Já tenho um código</button>
      : <button type="button" className="link-botao alternativa-recuperacao" onClick={() => { setAviso(''); mudarEtapa('email') }} disabled={enviando}>Não recebi o código. Solicitar novamente</button>}
  </>
}
