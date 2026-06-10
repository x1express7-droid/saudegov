import type { TfdPrestacaoListItem } from '@saude/mod-saude-tfd/client'

// BLOCO-14-PRESTACOES
export const VIAGEM_DETAIL_BASE = '/saude/tfd/viagens'

export function formatDataPrazo(iso: string): string {
  const parsed = iso.length === 10 ? `${iso}T12:00:00` : iso
  return new Date(parsed).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function formatValorBrl(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(valor)
}

export function normalizeSearch(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
}

export function diasAtePrazo(prazoEnvioAt: string): number {
  const prazo = new Date(`${prazoEnvioAt}T12:00:00`)
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  prazo.setHours(0, 0, 0, 0)
  return Math.ceil((prazo.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24))
}

export function prazoBadgeVariant(dias: number): 'green' | 'yellow' | 'red' {
  if (dias < 0) {
    return 'red'
  }
  if (dias <= 5) {
    return 'yellow'
  }
  return 'green'
}

export type PrazoDestaque = 'none' | 'warning' | 'error'

export function getPrazoDestaque(item: TfdPrestacaoListItem): PrazoDestaque {
  if (item.status === 'APROVADA') {
    return 'none'
  }

  const dias = diasAtePrazo(item.prazoEnvioAt)
  if (dias < 0) {
    return 'error'
  }
  if (dias <= 5) {
    return 'warning'
  }
  return 'none'
}

export function prazoDestaqueClassName(destaque: PrazoDestaque): string {
  if (destaque === 'error') {
    return 'bg-[var(--color-error-light)]'
  }
  if (destaque === 'warning') {
    return 'bg-[var(--color-warning-light)]'
  }
  return ''
}

export function prazoTextClassName(item: TfdPrestacaoListItem): string {
  if (item.status === 'APROVADA') {
    return 'text-[var(--color-text-muted)]'
  }

  const dias = diasAtePrazo(item.prazoEnvioAt)
  if (dias < 0) {
    return 'text-[var(--color-error)]'
  }
  if (dias <= 5) {
    return 'text-[var(--color-warning)]'
  }
  return 'text-[var(--color-text-muted)]'
}

/** Protocolo da prestação de contas (VGM vinculado à PC). */
export function protocoloPc(item: TfdPrestacaoListItem): string {
  return item.viagemProtocolo
}

export function prestacaoDetalheHref(viagemId: string): string {
  return `${VIAGEM_DETAIL_BASE}/${viagemId}?tab=prestacao`
}

export function labelDespesas(quantidadeItens: number): string {
  if (quantidadeItens === 0) {
    return 'Sem despesas'
  }
  return quantidadeItens === 1 ? '1 despesa' : `${quantidadeItens} despesas`
}

// PC-PARTE-4: colunas de adiantamento e situação financeira na listagem
export function labelAdiantamento(item: TfdPrestacaoListItem): string {
  if (item.valorAdiantamento === null) {
    return '—'
  }
  return formatValorBrl(item.valorAdiantamento)
}

export type SituacaoFinanceiraVariant = 'success' | 'error' | 'warning' | 'muted'

export function labelSituacaoFinanceira(
  item: TfdPrestacaoListItem
): { label: string; variant: SituacaoFinanceiraVariant } | null {
  if (item.status !== 'PENDENTE' && item.status !== 'ENVIADA') {
    return null
  }

  if (item.valorAdiantamento === null || item.quantidadeItens === 0) {
    return { label: '—', variant: 'muted' }
  }

  const diferenca = item.valorTotal - item.valorAdiantamento

  if (Math.abs(diferenca) < 0.005) {
    return { label: 'Conferido ✓', variant: 'success' }
  }

  if (diferenca > 0) {
    return {
      label: `Diferença ${formatValorBrl(diferenca)}`,
      variant: 'error',
    }
  }

  return {
    label: `Devolução ${formatValorBrl(Math.abs(diferenca))}`,
    variant: 'warning',
  }
}

export function labelValorTotal(item: TfdPrestacaoListItem): string | null {
  if (item.valorTotal > 0) {
    return formatValorBrl(item.valorTotal)
  }
  if (item.status === 'PENDENTE') {
    return null
  }
  return formatValorBrl(0)
}

export function computePrestacaoKpis(items: TfdPrestacaoListItem[]) {
  let pendentes = 0
  let aguardandoEnvio = 0
  let emAnalise = 0
  let vencidas = 0

  for (const item of items) {
    const dias = diasAtePrazo(item.prazoEnvioAt)

    if (item.status === 'PENDENTE') {
      pendentes += 1
      if (dias < 0) {
        vencidas += 1
      } else if (dias <= 5) {
        aguardandoEnvio += 1
      }
    }

    if (item.status === 'ENVIADA') {
      emAnalise += 1
    }
  }

  return { pendentes, aguardandoEnvio, emAnalise, vencidas }
}
