import type { LucideIcon } from 'lucide-react'
import { Bus, Car, MoreHorizontal, Plane, Ship } from 'lucide-react'

export const TIPO_SEGMENTO_CONFIG: Record<
  string,
  { label: string; icon: LucideIcon; emoji: string }
> = {
  TERRESTRE_PROPRIO: { label: 'Terrestre próprio', icon: Car, emoji: '🚗' },
  TERRESTRE_TERCEIRO: { label: 'Terrestre terceiro', icon: Bus, emoji: '🚌' },
  AEREO: { label: 'Aéreo', icon: Plane, emoji: '✈️' },
  FLUVIAL: { label: 'Fluvial', icon: Ship, emoji: '🚢' },
  OUTRO: { label: 'Outro', icon: MoreHorizontal, emoji: '📍' },
}

export const TRANSPORTE_STATUS_CONFIG: Record<
  string,
  { label: string; color: 'gray' | 'teal' | 'cyan' | 'green' | 'orange' | 'red' }
> = {
  PENDENTE: { label: 'Pendente', color: 'orange' },
  CONFIRMADO: { label: 'Confirmado', color: 'teal' },
  EM_TRANSITO: { label: 'Em trânsito', color: 'cyan' },
  CONCLUIDO: { label: 'Concluído', color: 'green' },
  CANCELADO: { label: 'Cancelado', color: 'red' },
}

export const PRESTACAO_STATUS_CONFIG: Record<
  string,
  { label: string; color: 'gray' | 'teal' | 'cyan' | 'green' | 'orange' | 'red' }
> = {
  PENDENTE: { label: 'Pendente', color: 'orange' },
  ENVIADA: { label: 'Enviada', color: 'cyan' },
  APROVADA: { label: 'Aprovada', color: 'green' },
  REJEITADA: { label: 'Rejeitada', color: 'red' },
}

export const TIPO_ANEXO_OPTIONS = [
  { value: 'PASSAGEM', label: 'Passagem' },
  { value: 'NOTA_COMBUSTIVEL', label: 'Nota de combustível' },
  { value: 'NOTA_ALIMENTACAO', label: 'Nota de alimentação' },
  { value: 'OUTRO', label: 'Outro' },
] as const

export const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

export function formatDataHora(data: string | null, hora: string | null): string {
  if (!data) {
    return '—'
  }
  const parsed = data.length === 10 ? `${data}T12:00:00` : data
  const dataLabel = new Date(parsed).toLocaleDateString('pt-BR')
  return hora ? `${dataLabel} às ${hora}` : dataLabel
}

export function labelTipoSegmento(tipo: string): string {
  return TIPO_SEGMENTO_CONFIG[tipo]?.label ?? tipo
}
