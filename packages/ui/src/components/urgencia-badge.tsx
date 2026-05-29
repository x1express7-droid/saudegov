import type { ComponentProps } from 'react'
import { Badge } from './badge'
import { cn } from '../utils/cn'

export const TFD_URGENCIA_CONFIG = {
  NAO_AGUDA: { label: 'Não aguda', color: 'blue', icon: '●' },
  BAIXA: { label: 'Baixa', color: 'green', icon: '●' },
  INTERMEDIARIA: { label: 'Intermediária', color: 'yellow', icon: '●' },
  GRAVE: { label: 'Grave', color: 'red', icon: '▲' },
  MUITO_URGENTE: { label: 'Muito Urgente', color: 'red', icon: '⚠' },
} as const

export type TfdUrgencia = keyof typeof TFD_URGENCIA_CONFIG

type UrgenciaBadgeColor = (typeof TFD_URGENCIA_CONFIG)[TfdUrgencia]['color']

export interface UrgenciaBadgeProps extends Omit<ComponentProps<typeof Badge>, 'variant' | 'children'> {
  urgencia: TfdUrgencia
}

export function UrgenciaBadge({ urgencia, className, size, ...props }: UrgenciaBadgeProps) {
  const config = TFD_URGENCIA_CONFIG[urgencia]
  const isMuitoUrgente = urgencia === 'MUITO_URGENTE'

  return (
    <Badge
      variant={config.color as UrgenciaBadgeColor}
      size={size}
      className={cn('gap-[var(--space-1)]', isMuitoUrgente && 'animate-pulse', className)}
      {...props}
    >
      <span aria-hidden="true">{config.icon}</span>
      {config.label}
    </Badge>
  )
}
