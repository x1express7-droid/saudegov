import type { TfdFonteRecursoValor } from '@saude/mod-saude-tfd/client'
import {
  formatDateOnlyBr,
  formatDateTimeBr as formatDateTimeBrDisplay,
} from '@saude/ui'

// BLOCO-11-SALDOS

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
  return `${formatDateOnlyBr(inicio)} — ${formatDateOnlyBr(fim)}`
}

export function formatDateTimeBr(iso: string): string {
  return formatDateTimeBrDisplay(iso)
}

export function formatExtratoData(iso: string): string {
  return formatDateOnlyBr(iso)
}

export function formatExtratoHora(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
}

export function formatExtratoDiaGrupo(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(iso))
}

export function extratoDiaChave(iso: string): string {
  const date = new Date(iso)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// BLOCO-11.1-SALDOS
export function saldoSegmentWidth(value: number, total: number): number {
  if (total <= 0 || value <= 0) {
    return 0
  }
  return Math.max(0, Math.min(100, (value / total) * 100))
}

export function normalizeSaldoSearch(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
}

export type SaldoStatusFiltro = 'all' | 'ativo' | 'inativo'

export type SaldoDisponibilidadeNivel = 'critico' | 'atencao' | 'ok'

export function saldoDisponibilidadeNivel(percentual: number): SaldoDisponibilidadeNivel {
  if (percentual <= 20) {
    return 'critico'
  }
  if (percentual <= 50) {
    return 'atencao'
  }
  return 'ok'
}

export const FONTE_FILTER_OPTIONS = [
  { value: '__all__', label: 'Todas' },
  { value: 'MUNICIPAL_PROPRIO', label: FONTE_LABELS.MUNICIPAL_PROPRIO },
  { value: 'FEDERAL_FNS', label: FONTE_LABELS.FEDERAL_FNS },
  { value: 'ESTADUAL', label: FONTE_LABELS.ESTADUAL },
  { value: 'EMENDA_PARLAMENTAR', label: FONTE_LABELS.EMENDA_PARLAMENTAR },
] as const

export const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'Todos' },
  { value: 'ativo', label: 'Ativo' },
  { value: 'inativo', label: 'Inativo' },
] as const
