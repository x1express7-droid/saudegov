import type { ComponentProps } from 'react'
import { Badge } from './badge'
import { cn } from '../utils/cn'

export const TFD_STATUS_CONFIG = {
  RASCUNHO: { label: 'Rascunho', color: 'gray' },
  ENVIADO: { label: 'Enviado', color: 'blue' },
  EM_ANALISE: { label: 'Em Análise', color: 'indigo' },
  PENDENTE: { label: 'Pendente', color: 'yellow' },
  APROVADO: { label: 'Aprovado', color: 'green' },
  NEGADO: { label: 'Negado', color: 'red' },
  AGENDADO: { label: 'Agendado', color: 'teal' },
  EM_VIAGEM: { label: 'Em Viagem', color: 'cyan' },
  AGUARDANDO_PC: { label: 'Aguardando PC', color: 'orange' },
  PC_EM_ANALISE: { label: 'PC em Análise', color: 'purple' },
  CONCLUIDO: { label: 'Concluído', color: 'emerald' },
  CANCELADO: { label: 'Cancelado', color: 'slate' },
} as const

export type TfdStatus = keyof typeof TFD_STATUS_CONFIG

type StatusBadgeColor = (typeof TFD_STATUS_CONFIG)[TfdStatus]['color']

export interface StatusBadgeProps extends Omit<ComponentProps<typeof Badge>, 'variant' | 'children'> {
  status: TfdStatus
}

export function StatusBadge({ status, className, size, ...props }: StatusBadgeProps) {
  const config = TFD_STATUS_CONFIG[status]

  return (
    <Badge
      variant={config.color as StatusBadgeColor}
      size={size}
      className={cn(className)}
      {...props}
    >
      {config.label}
    </Badge>
  )
}
