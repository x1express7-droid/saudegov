/** Máscara de moeda BRL para campos de formulário (centavos digitados → exibição pt-BR). */

export function formatMoedaBrInput(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (!digits) {
    return ''
  }

  const cents = Number.parseInt(digits, 10)
  return (cents / 100).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function parseMoedaBrInput(value: string): number | undefined {
  const digits = value.replace(/\D/g, '')
  if (!digits) {
    return undefined
  }

  return Number.parseInt(digits, 10) / 100
}

export function formatMoedaBrFromNumber(value: number): string {
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}
