import type { TfdDashboardOperacionalKpis } from '@saude/mod-saude-tfd/client'
import { Card } from '@saude/ui'
import { AlertTriangle, CheckCircle2, Clock, XCircle } from 'lucide-react'
import type { ReactNode } from 'react'

export interface TfdDashboardOperacionalKpisProps {
  kpis: TfdDashboardOperacionalKpis
}

interface KpiCardProps {
  titulo: string
  valor: number
  descricao: string
  icon: ReactNode
  tone: 'warning' | 'info' | 'success' | 'danger'
}

const toneStyles = {
  warning: {
    card: 'border-[color-mix(in_srgb,var(--color-warning)_35%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-warning)_8%,var(--color-surface))]',
    icon: 'text-[var(--color-warning)]',
    value: 'text-[var(--color-warning)]',
  },
  info: {
    card: 'border-[color-mix(in_srgb,var(--color-primary)_35%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-primary)_6%,var(--color-surface))]',
    icon: 'text-[var(--color-primary)]',
    value: 'text-[var(--color-primary)]',
  },
  success: {
    card: 'border-[color-mix(in_srgb,var(--color-success)_35%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-success)_8%,var(--color-surface))]',
    icon: 'text-[var(--color-success)]',
    value: 'text-[var(--color-success)]',
  },
  danger: {
    card: 'border-[color-mix(in_srgb,var(--color-error)_35%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-error)_6%,var(--color-surface))]',
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
          <p className="mt-[var(--space-1)] text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
            {descricao}
          </p>
        </div>
        <span className={`shrink-0 ${styles.icon}`} aria-hidden="true">
          {icon}
        </span>
      </div>
    </Card>
  )
}

export function TfdDashboardOperacionalKpis({ kpis }: TfdDashboardOperacionalKpisProps) {
  return (
    <div className="grid gap-[var(--space-4)] sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard
        titulo="Solicitações Pendentes"
        valor={kpis.pendentes}
        descricao="Aguardando início da análise"
        icon={<Clock className="size-6" />}
        tone="warning"
      />
      <KpiCard
        titulo="Em Análise"
        valor={kpis.emAnalise}
        descricao="Em avaliação pela equipe"
        icon={<AlertTriangle className="size-6" />}
        tone="info"
      />
      <KpiCard
        titulo="Aprovadas"
        valor={kpis.aprovadasMes}
        descricao="No mês atual"
        icon={<CheckCircle2 className="size-6" />}
        tone="success"
      />
      <KpiCard
        titulo="Negadas/Canceladas"
        valor={kpis.negadasCanceladasMes}
        descricao="No mês atual"
        icon={<XCircle className="size-6" />}
        tone="danger"
      />
    </div>
  )
}
