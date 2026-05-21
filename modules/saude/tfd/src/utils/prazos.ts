/** Início do dia em UTC — comparação estável para datas @db.Date de CNH. */
function startOfDayUtc(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}

/** CNH com validade anterior ao dia de hoje. */
export function isCnhVencida(validade: Date): boolean {
  const hoje = startOfDayUtc(new Date())
  const vencimento = startOfDayUtc(validade)
  return vencimento < hoje
}

/**
 * CNH ainda válida hoje, com vencimento em até `diasAlerta` dias (inclusive).
 * Padrão: 30 dias (BUSINESS_RULES.md §1.6).
 */
export function isCnhVencendoEmBreve(validade: Date, diasAlerta = 30): boolean {
  if (isCnhVencida(validade)) {
    return false
  }

  const hoje = startOfDayUtc(new Date())
  const vencimento = startOfDayUtc(validade)
  const limite = new Date(hoje)
  limite.setUTCDate(limite.getUTCDate() + diasAlerta)

  return vencimento <= limite
}
