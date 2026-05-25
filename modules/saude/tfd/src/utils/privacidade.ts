/** Nome parcial para exibição em listagens (privacidade LGPD). */
export function mascararNomePaciente(nomeCompleto: string): string {
  const partes = nomeCompleto.trim().split(/\s+/).filter(Boolean)
  if (partes.length === 0) {
    return '—'
  }
  if (partes.length === 1) {
    return partes[0]!
  }
  const primeiro = partes[0]!
  const iniciais = partes
    .slice(1)
    .map((p) => `${p.charAt(0).toUpperCase()}.`)
    .join(' ')
  return `${primeiro} ${iniciais}`
}
