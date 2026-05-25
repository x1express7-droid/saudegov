import { Card } from '@saude/ui'
import { AlertTriangle, CheckCircle2, ClipboardList, XCircle } from 'lucide-react'
import type { ReactNode } from 'react'

export interface TfdDashboardKpisProps {
  totalSolicitacoes: number
  porStatus: Record<string, number>
}

function countFromStatus(porStatus: Record<string, number>, keys: string[]): number {
  return keys.reduce((acc, key) => acc + (porStatus[key] ?? 0), 0)
}

interface KpiCardProps {
  titulo: string
  valor: number
  descricao?: string
  icon: ReactNode
  tone: 'neutral' | 'success' | 'info' | 'danger'
}

const toneStyles = {
  neutral: {
    card: 'border-l-4 border-l-[var(--color-text-muted)] border-[color-mix(in_srgb,var(--color-text-muted)_25%,var(--color-border))] bg-[var(--color-surface)]',
    icon: 'text-[var(--color-text-muted)]',
    value: 'text-[var(--color-text)]',
  },
  info: {
    card: 'border-l-4 border-l-[var(--color-primary)] border-[color-mix(in_srgb,var(--color-primary)_35%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-primary)_6%,var(--color-surface))]',
    icon: 'text-[var(--color-primary)]',
    value: 'text-[var(--color-primary)]',
  },
  success: {
    card: 'border-l-4 border-l-[var(--color-success)] border-[color-mix(in_srgb,var(--color-success)_35%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-success)_8%,var(--color-surface))]',
    icon: 'text-[var(--color-success)]',
    value: 'text-[var(--color-success)]',
  },
  danger: {
    card: 'border-l-4 border-l-[var(--color-error)] border-[color-mix(in_srgb,var(--color-error)_35%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-error)_6%,var(--color-surface))]',
    icon: 'text-[var(--color-error)]',
    value: 'text-[var(--color-error)]',
  },
} as const

function KpiCard({ titulo, valor, descricao, icon, tone }: KpiCardProps) {
  const styles = toneStyles[tone]

  return (
    <Card className={styles.card}>
      <div className="flex items-start justify-between gap-[var(--space-3)]">
        <div className="min-w-0 flex-1">
          <p className="text-[length:var(--text-sm)] font-medium text-[var(--color-text-muted)]">
            {titulo}
          </p>
          <p
            className={`mt-[var(--space-2)] text-[length:var(--text-2xl)] font-bold tabular-nums ${styles.value}`}
          >
            {valor.toLocaleString('pt-BR')}
          </p>
          {descricao ? (
            <p className="mt-[var(--space-1)] text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
              {descricao}
            </p>
          ) : null}
        </div>
        <span className={`shrink-0 ${styles.icon}`} aria-hidden="true">
          {icon}
        </span>
      </div>
    </Card>
  )
}

export function TfdDashboardKpis({ totalSolicitacoes, porStatus }: TfdDashboardKpisProps) {
  const aprovadas = porStatus.APROVADO ?? 0
  const emAnalise = countFromStatus(porStatus, ['ENVIADO', 'EM_ANALISE', 'PENDENTE'])
  const canceladas = (porStatus.CANCELADO ?? 0) + (porStatus.NEGADO ?? 0)

  return (
    <div className="grid gap-[var(--space-4)] sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard
        titulo="Total no mês"
        valor={totalSolicitacoes}
        descricao="Exceto rascunhos"
        icon={<ClipboardList className="size-6" />}
        tone="neutral"
      />
      <KpiCard
        titulo="Aprovadas"
        valor={aprovadas}
        descricao="Status Aprovado"
        icon={<CheckCircle2 className="size-6" />}
        tone="success"
      />
      <KpiCard
        titulo="Em análise"
        valor={emAnalise}
        descricao="Enviado, em análise ou pendente"
        icon={<AlertTriangle className="size-6" />}
        tone="info"
      />
      <KpiCard
        titulo="Canceladas / negadas"
        valor={canceladas}
        descricao="No mês corrente"
        icon={<XCircle className="size-6" />}
        tone="danger"
      />
    </div>
  )
}
