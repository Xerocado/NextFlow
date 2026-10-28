const FORMATO_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

async function endereco(empresa: string, operacao: string, entrada: unknown, alvo?: string) {
  const json = JSON.stringify(entrada)
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(json))
  const assinatura = Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, '0')).join('')
  return `nextflow:idempotencia:v1:${empresa}:${operacao}:${alvo ?? ''}:${assinatura}`
}

export async function obterChaveIdempotencia(empresa: string, operacao: string, entrada: unknown, alvo?: string) {
  const local = await endereco(empresa, operacao, entrada, alvo)
  try {
    const anterior = sessionStorage.getItem(local)
    if (anterior && FORMATO_UUID.test(anterior)) return anterior
  } catch { /* Armazenamento indisponível: a chave permanece válida nesta tentativa. */ }
  const chave = crypto.randomUUID()
  try { sessionStorage.setItem(local, chave) } catch { /* Não impedir o lançamento se o navegador bloquear armazenamento. */ }
  return chave
}

export async function concluirChaveIdempotencia(empresa: string, operacao: string, entrada: unknown, chave: string, alvo?: string) {
  try {
    const local = await endereco(empresa, operacao, entrada, alvo)
    if (sessionStorage.getItem(local) === chave) sessionStorage.removeItem(local)
  } catch { /* A escrita financeira já foi confirmada; limpeza local é best effort. */ }
}
