// BLOCO-6-SOLICITACOES
export const TFD_COMPLEMENTO_AREA_VALUES = [
  'DADOS_SOLICITACAO',
  'DESPESAS',
  'SOAP',
  'DOCUMENTACAO',
  'OUTROS',
] as const

export type TfdComplementoArea = (typeof TFD_COMPLEMENTO_AREA_VALUES)[number]

export const TFD_COMPLEMENTO_AREA_CONFIG: Record<
  TfdComplementoArea,
  { label: string; descricao: string }
> = {
  DADOS_SOLICITACAO: {
    label: 'Dados da solicitação',
    descricao: 'Informações gerais do pedido (especialidade, prestador, procedimentos, etc.).',
  },
  DESPESAS: {
    label: 'Despesas lançadas',
    descricao: 'Composição de custos e valores estimados da viagem.',
  },
  SOAP: {
    label: 'Dados clínicos (SOAP)',
    descricao: 'Registro clínico, diagnóstico e observações de saúde.',
  },
  DOCUMENTACAO: {
    label: 'Documentação',
    descricao: 'Anexos, laudos e documentos comprobatórios.',
  },
  OUTROS: {
    label: 'Outros',
    descricao: 'Outro ponto não listado acima — detalhe na mensagem.',
  },
}

export function labelComplementoArea(area: TfdComplementoArea): string {
  return TFD_COMPLEMENTO_AREA_CONFIG[area].label
}

export function formatDescricaoComplementoSolicitado(
  area: TfdComplementoArea,
  mensagem: string
): string {
  return `Área: ${labelComplementoArea(area)}\n\n${mensagem}`
}

export function parseAreaComplementoSolicitado(observacao: string): string | null {
  const match = observacao.match(/^Área:\s*(.+?)(?:\n\n|\n$|$)/)
  return match?.[1]?.trim() ?? null
}
