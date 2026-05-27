import { Badge, cn } from '@saude/ui'
import type { ComponentProps } from 'react'

export const PROCESSO_STATUS_CONFIG = {
  ABERTO: { label: 'Aberto', color: 'blue' as const },
  EM_ANDAMENTO: { label: 'Em andamento', color: 'indigo' as const },
  AGUARDANDO: { label: 'Aguardando', color: 'yellow' as const },
  AGUARDANDO_COMPLEMENTO: { label: 'Aguardando complemento', color: 'orange' as const },
  CONCLUIDO: { label: 'Concluído', color: 'green' as const },
  CANCELADO: { label: 'Cancelado', color: 'red' as const },
  ARQUIVADO: { label: 'Arquivado', color: 'gray' as const },
} as const

export type ProcessoStatusValue = keyof typeof PROCESSO_STATUS_CONFIG

export interface ProcessoStatusBadgeProps
  extends Omit<ComponentProps<typeof Badge>, 'variant' | 'children'> {
  status: string
}

export function ProcessoStatusBadge({ status, className, size, ...props }: ProcessoStatusBadgeProps) {
  const config =
    status in PROCESSO_STATUS_CONFIG
      ? PROCESSO_STATUS_CONFIG[status as ProcessoStatusValue]
      : { label: status, color: 'gray' as const }

  return (
    <Badge variant={config.color} size={size} className={cn(className)} {...props}>
      {config.label}
    </Badge>
  )
}
