import { Badge, cn } from '@saude/ui'
import type { ComponentProps } from 'react'

export const VIAGEM_STATUS_CONFIG = {
  PLANEJADA: { label: 'Planejada', color: 'gray' as const },
  CONFIRMADA: { label: 'Confirmada', color: 'blue' as const },
  EM_ANDAMENTO: { label: 'Em andamento', color: 'cyan' as const },
  CONCLUIDA: { label: 'Concluída', color: 'emerald' as const },
  CANCELADA: { label: 'Cancelada', color: 'slate' as const },
} as const

export type ViagemStatusValue = keyof typeof VIAGEM_STATUS_CONFIG

export interface ViagemStatusBadgeProps
  extends Omit<ComponentProps<typeof Badge>, 'variant' | 'children'> {
  status: string
}

export function ViagemStatusBadge({ status, className, size, ...props }: ViagemStatusBadgeProps) {
  const config =
    status in VIAGEM_STATUS_CONFIG
      ? VIAGEM_STATUS_CONFIG[status as ViagemStatusValue]
      : { label: status, color: 'gray' as const }

  return (
    <Badge variant={config.color} size={size} className={cn(className)} {...props}>
      {config.label}
    </Badge>
  )
}
