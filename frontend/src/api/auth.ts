export interface Perfil {
  id: string
  email: string
}

export class ApiError extends Error {
  readonly status: number
  constructor(status: number, mensagem: string) {
    super(mensagem)
    this.status = status
  }
}

async function requisitar(caminho: string, init: RequestInit = {}) {
  let resposta: Response
  try {
    resposta = await fetch(`/api/auth/${caminho}`, {
      ...init,
      credentials: 'same-origin',
      cache: 'no-store',
      signal: AbortSignal.timeout(10000),
    })
  } catch {
    throw new Error('Não foi possível conectar. Verifique sua conexão e tente novamente.')
  }
  if (!resposta.ok) {
    const mensagem = resposta.status === 429
      ? 'Muitas tentativas. Aguarde 15 minutos antes de tentar novamente.'
      : resposta.status === 403
        ? 'A sessão de segurança expirou. Tente novamente.'
        : resposta.status >= 500
          ? 'O serviço está indisponível. Tente novamente em instantes.'
          : 'Não foi possível concluir. Tente novamente.'
    throw new ApiError(resposta.status, mensagem)
  }
  return resposta
}

async function cabecalhoCsrf(): Promise<Record<string, string>> {
  const resposta = await requisitar('csrf')
  const csrf: { headerName: string; token: string } = await resposta.json()
  return { [csrf.headerName]: csrf.token }
}

export async function consultarSessao(): Promise<Perfil | null> {
  try {
    return await (await requisitar('me')).json() as Perfil
  } catch (erro) {
    if (erro instanceof ApiError && erro.status === 401) return null
    throw erro
  }
}

export async function entrar(email: string, senha: string): Promise<Perfil> {
  try {
    await requisitar('login', {
      method: 'POST',
      headers: { ...await cabecalhoCsrf(), 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ email, password: senha }),
    })
  } catch (erro) {
    if (erro instanceof ApiError && erro.status === 401) {
      throw new Error('E-mail ou senha incorretos. Confira os dados e tente novamente.')
    }
    throw erro
  }
  const perfil = await consultarSessao()
  if (!perfil) throw new Error('Não foi possível manter sua sessão. Tente entrar novamente.')
  return perfil
}

export async function sair(): Promise<void> {
  try {
    await requisitar('logout', { method: 'POST', headers: await cabecalhoCsrf() })
  } catch (erro) {
    // Uma sessão já invalidada também equivale a estar desconectado.
    if (erro instanceof ApiError && erro.status === 401) return
    throw erro
  }
}

export async function solicitarRecuperacao(email: string): Promise<void> {
  await requisitar('recuperar-senha', {
    method: 'POST',
    headers: { ...await cabecalhoCsrf(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  })
}

export async function cadastrarConta(nome: string, email: string, senha: string): Promise<void> {
  try {
    await requisitar('cadastro', {
      method: 'POST',
      headers: { ...await cabecalhoCsrf(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome, email, senha }),
    })
  } catch (erro) {
    if (erro instanceof ApiError && erro.status === 409) {
      throw new Error('Não foi possível criar a conta com esses dados. Se já possui uma conta, tente entrar ou recuperar sua senha.')
    }
    if (erro instanceof ApiError && erro.status === 400) {
      throw new Error('Confira o nome, o e-mail e os requisitos da senha antes de tentar novamente.')
    }
    throw erro
  }
}

export async function redefinirSenha(token: string, novaSenha: string, email: string): Promise<void> {
  try {
    await requisitar('redefinir-senha', {
      method: 'POST',
      headers: { ...await cabecalhoCsrf(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, token, novaSenha }),
    })
  } catch (erro) {
    if (erro instanceof ApiError && erro.status === 422) {
      throw new Error('A nova senha deve ser diferente da senha atual.')
    }
    if (erro instanceof ApiError && erro.status === 400) {
      throw new Error('Confira o e-mail, o código e os requisitos da senha. O código pode estar inválido, expirado ou bloqueado após 5 erros. Solicite outro se necessário.')
    }
    throw erro
  }
}
