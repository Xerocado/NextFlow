export function validarSenhaCadastro(senha: string, confirmacao: string): void {
  if (senha.trim().length === 0 || [...senha].length < 12 || new TextEncoder().encode(senha).length > 72) {
    throw new Error('Use pelo menos 12 caracteres e no máximo 72 bytes. Acentos e símbolos podem ocupar mais de um byte.')
  }
  if (senha !== confirmacao) {
    throw new Error('As senhas não coincidem. Digite a mesma senha nos dois campos.')
  }
}
