const numeroInteiroPtBr = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 })

export function reaisExatos(valor: string) {
  const partes = /^(\d+)(?:\.(\d{1,2}))?$/.exec(valor)
  if (!partes) throw new Error('O valor monetário deve ser um decimal positivo com até duas casas.')
  const inteiro = numeroInteiroPtBr.format(BigInt(partes[1]))
  const centavos = (partes[2] ?? '').padEnd(2, '0')
  return `R$ ${inteiro},${centavos}`
}
