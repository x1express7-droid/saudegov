import { Badge } from '@saude/ui'

import { formatBrl, MOVIMENTACAO_LABELS } from './saldos-ui'

// BLOCO-11-SALDOS
const TIPO_VARIANT: Record<string, 'yellow' | 'red' | 'green' | 'gray' | 'blue'> = {
  RESERVA: 'yellow',
  CONSUMO: 'red',
  LIBERACAO: 'green',
  ESTORNO: 'gray',
  CREDITO: 'blue',
}

export function ExtratoTipoBadge({ tipo }: { tipo: string }) {
  const variant = TIPO_VARIANT[tipo] ?? 'gray'
  const label = MOVIMENTACAO_LABELS[tipo] ?? tipo

  return (
    <Badge variant={variant} size="sm">
      {label}
    </Badge>
  )
}

export function extratoValorClassName(tipo: string): string {
  if (tipo === 'CONSUMO' || tipo === 'RESERVA') {
    return 'font-mono font-bold text-[var(--color-error)]'
  }
  if (tipo === 'LIBERACAO' || tipo === 'CREDITO' || tipo === 'ESTORNO') {
    return 'font-mono font-bold text-[var(--color-success)]'
  }
  return 'font-mono font-bold text-[var(--color-text)]'
}

export function formatExtratoValorComSinal(tipo: string, valor: number): string {
  const formatted = formatBrl(Math.abs(valor))
  if (tipo === 'CONSUMO' || tipo === 'RESERVA') {
    return `− ${formatted}`
  }
  if (tipo === 'LIBERACAO' || tipo === 'CREDITO' || tipo === 'ESTORNO') {
    return `+ ${formatted}`
  }
  return formatted
}
