import type { TfdFonteRecursoValor } from '@saude/mod-saude-tfd/client'

export const FONTE_LABELS: Record<TfdFonteRecursoValor, string> = {
  FEDERAL_FNS: 'Federal (FNS)',
  ESTADUAL: 'Estadual',
  MUNICIPAL_PROPRIO: 'Municipal próprio',
  EMENDA_PARLAMENTAR: 'Emenda parlamentar',
}

export const MOVIMENTACAO_LABELS: Record<string, string> = {
  CREDITO: 'Crédito',
  RESERVA: 'Reserva',
  CONSUMO: 'Consumo',
  LIBERACAO: 'Liberação',
  ESTORNO: 'Estorno',
}

export function formatBrl(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

export function formatCompetenciaBr(inicio: string, fim: string): string {
  const toBr = (iso: string) => {
    const [year, month, day] = iso.split('-')
    if (!year || !month || !day) {
      return iso
    }
    return `${day}/${month}/${year}`
  }
  return `${toBr(inicio)} — ${toBr(fim)}`
}

export function formatDateTimeBr(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
}
