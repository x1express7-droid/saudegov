import { PRESTACAO_STATUS_CONFIG } from '@/app/(servidor)/saude/tfd/processos/[id]/agendamentos/[agId]/components/transporte-constants'
import { Badge, cn } from '@saude/ui'
import type { ComponentProps } from 'react'

// BLOCO-14-PRESTACOES
export interface PrestacaoStatusBadgeProps
  extends Omit<ComponentProps<typeof Badge>, 'variant' | 'children'> {
  status: string
}

export function PrestacaoStatusBadge({
  status,
  className,
  size,
  ...props
}: PrestacaoStatusBadgeProps) {
  const config = PRESTACAO_STATUS_CONFIG[status] ?? {
    label: status,
    color: 'gray' as const,
  }

  return (
    <Badge variant={config.color} size={size} className={cn(className)} {...props}>
      {config.label}
    </Badge>
  )
}
