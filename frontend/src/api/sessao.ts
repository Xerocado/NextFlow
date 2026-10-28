export const SESSAO_EXPIRADA = 'nextflow:sessao-expirada'

let geracao = 0

export function confirmarSessao() {
  geracao++
}

// Preserva as opções de cada cliente HTTP e nunca repete a requisição.
export async function fetchAutenticado(url: string, init: RequestInit = {}): Promise<Response> {
  const geracaoDoPedido = geracao
  const resposta = await fetch(url, init)
  if (resposta.status === 401 && !init.signal?.aborted && geracaoDoPedido === geracao) {
    // Só o primeiro 401 desta sessão notifica. Respostas antigas não encerram um novo login.
    geracao++
    if (typeof window !== 'undefined') window.dispatchEvent(new Event(SESSAO_EXPIRADA))
  }
  return resposta
}
