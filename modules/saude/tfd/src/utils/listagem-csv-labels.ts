const TIPO_ATENDIMENTO_LABEL: Record<string, string> = {
  CONSULTA: 'Consulta',
  RETORNO: 'Retorno',
  EXAME: 'Exame',
  CIRURGIA: 'Cirurgia',
}

const VIAGEM_STATUS_LABEL: Record<string, string> = {
  AGENDADA: 'Agendada',
  REALIZADA: 'Realizada',
  CANCELADA: 'Cancelada',
}

const PRESTACAO_STATUS_LABEL: Record<string, string> = {
  PENDENTE: 'Pendente',
  ENVIADA: 'Enviada',
  APROVADA: 'Aprovada',
  REJEITADA: 'Rejeitada',
}

const URGENCIA_LABEL: Record<string, string> = {
  NAO_AGUDA: 'Não aguda',
  BAIXA: 'Baixa',
  INTERMEDIARIA: 'Intermediária',
  GRAVE: 'Grave',
  MUITO_URGENTE: 'Muito urgente',
}

const FONTE_RECURSO_LABEL: Record<string, string> = {
  FEDERAL_FNS: 'Federal (FNS)',
  ESTADUAL: 'Estadual',
  MUNICIPAL_PROPRIO: 'Municipal próprio',
  EMENDA_PARLAMENTAR: 'Emenda parlamentar',
}

export function labelUrgenciaTfd(urgencia: string): string {
  return URGENCIA_LABEL[urgencia] ?? urgencia
}

export function labelTipoAtendimentoTfd(tipo: string): string {
  return TIPO_ATENDIMENTO_LABEL[tipo] ?? tipo
}

export function labelViagemStatusTfd(status: string): string {
  return VIAGEM_STATUS_LABEL[status] ?? status
}

export function labelPrestacaoStatusTfd(status: string): string {
  return PRESTACAO_STATUS_LABEL[status] ?? status
}

export function labelFonteRecursoTfd(fonte: string): string {
  return FONTE_RECURSO_LABEL[fonte] ?? fonte
}

export function formatCompetenciaPeriodo(inicio: string, fim: string): string {
  const fmt = (iso: string) => {
    const [y, m, d] = iso.split('-')
    return `${d}/${m}/${y}`
  }
  return `${fmt(inicio)} — ${fmt(fim)}`
}

export function formatDestinoPrestador(cidade: string | null, estado: string | null): string {
  if (!cidade && !estado) {
    return '—'
  }
  if (cidade && estado) {
    return `${cidade}/${estado}`
  }
  return cidade ?? estado ?? '—'
}

export function formatVeiculoAgendamento(placa: string, modelo: string): string {
  return `${placa} — ${modelo}`
}
