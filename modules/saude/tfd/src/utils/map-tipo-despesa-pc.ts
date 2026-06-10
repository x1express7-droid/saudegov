const TIPOS_DESPESA_ATIVOS = [
  'TRANSPORTE_TERRESTRE',
  'TRANSPORTE_AEREO',
  'TRANSPORTE_FLUVIAL',
  'DIARIA_PACIENTE',
  'DIARIA_ACOMPANHANTE',
  'DIARIA_LIVRE',
  'OBITO',
  'DEVOLUCAO',
] as const

export type TipoDespesaPcAtivo = (typeof TIPOS_DESPESA_ATIVOS)[number]

const TIPOS_ATIVOS_SET = new Set<string>(TIPOS_DESPESA_ATIVOS)

const LEGADO_PARA_ATIVO: Record<string, TipoDespesaPcAtivo> = {
  TRANSPORTE: 'TRANSPORTE_TERRESTRE',
  ALIMENTACAO: 'DIARIA_LIVRE',
  HOSPEDAGEM: 'DIARIA_PACIENTE',
  OUTRO: 'DIARIA_LIVRE',
}

export function resolverTipoDespesaParaPc(tipo: string | null): TipoDespesaPcAtivo | null {
  if (!tipo) {
    return null
  }

  if (TIPOS_ATIVOS_SET.has(tipo)) {
    return tipo as TipoDespesaPcAtivo
  }

  return LEGADO_PARA_ATIVO[tipo] ?? null
}

export const CUSTO_PLANEJADO_REF_PREFIX = '[custo_planejado:'

export function buildDescricaoComRefCustoPlanejado(
  custoPlanejadoId: string,
  descricao: string | null
): string | null {
  const ref = `${CUSTO_PLANEJADO_REF_PREFIX}${custoPlanejadoId}]`
  if (!descricao?.trim()) {
    return ref
  }
  return `${ref} ${descricao.trim()}`
}

export function extrairCustoPlanejadoIdDaDescricao(descricao: string | null): string | null {
  if (!descricao?.startsWith(CUSTO_PLANEJADO_REF_PREFIX)) {
    return null
  }
  const fim = descricao.indexOf(']')
  if (fim < 0) {
    return null
  }
  return descricao.slice(CUSTO_PLANEJADO_REF_PREFIX.length, fim)
}

export function limparDescricaoItemPc(descricao: string | null): string | null {
  if (!descricao?.startsWith(CUSTO_PLANEJADO_REF_PREFIX)) {
    return descricao
  }
  const fim = descricao.indexOf(']')
  if (fim < 0) {
    return descricao
  }
  const restante = descricao.slice(fim + 1).trim()
  return restante.length > 0 ? restante : null
}
