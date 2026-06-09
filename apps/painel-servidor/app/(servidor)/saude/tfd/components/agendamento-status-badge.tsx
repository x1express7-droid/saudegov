import { Badge, cn } from '@saude/ui'
import type { ComponentProps } from 'react'

export const AGENDAMENTO_STATUS_CONFIG = {
  AGENDADO: { label: 'Agendado', color: 'teal' as const },
  EM_VIAGEM: { label: 'Em viagem', color: 'cyan' as const },
  REALIZADO: { label: 'Realizado', color: 'green' as const },
  CANCELADO: { label: 'Cancelado', color: 'red' as const },
} as const

export type AgendamentoStatusValue = keyof typeof AGENDAMENTO_STATUS_CONFIG

export interface AgendamentoStatusBadgeProps
  extends Omit<ComponentProps<typeof Badge>, 'variant' | 'children'> {
  status: string
}

export function AgendamentoStatusBadge({ status, className, size, ...props }: AgendamentoStatusBadgeProps) {
  const config =
    status in AGENDAMENTO_STATUS_CONFIG
      ? AGENDAMENTO_STATUS_CONFIG[status as AgendamentoStatusValue]
      : { label: status, color: 'gray' as const }

  return (
    <Badge variant={config.color} size={size} className={cn(className)} {...props}>
      {config.label}
    </Badge>
  )
}
