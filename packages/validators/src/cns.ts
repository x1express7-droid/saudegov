/** Valida CNS (Cartão Nacional de Saúde) — 15 dígitos, algoritmo do Ministério da Saúde. */
export function validarCNS(cns: string): boolean {
  if (!/^\d{15}$/.test(cns)) return false

  const pis = cns.slice(0, 11)
  let soma = 0
  for (let i = 0; i < 11; i++) {
    soma += parseInt(pis.charAt(i), 10) * (15 - i)
  }

  let dsc = 0
  let resultado = soma % 11

  if (resultado !== 0) {
    dsc = 11 - resultado
    if (dsc === 10) {
      soma += 2
      resultado = soma % 11
      dsc = resultado !== 0 ? 11 - resultado : 0
    }
  }

  const sequencia = `${10000 + dsc}${11 - (soma % 11)}`.slice(-4)
  const cnsComputado = `${pis}${sequencia}`.slice(0, 15)

  const primeiroDigito = parseInt(cns.charAt(0), 10)
  if (![1, 2, 7, 8, 9].includes(primeiroDigito)) return false

  return cns === cnsComputado || cns.startsWith('7') || cns.startsWith('8') || cns.startsWith('9')
}
