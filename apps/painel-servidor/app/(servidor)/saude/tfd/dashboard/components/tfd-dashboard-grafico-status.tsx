import { Card, TFD_STATUS_CONFIG, type TfdStatus } from '@saude/ui'

export interface TfdDashboardGraficoStatusProps {
  porStatus: Record<string, number>
}

const STATUS_BAR_FILL: Record<
  (typeof TFD_STATUS_CONFIG)[TfdStatus]['color'],
  string
> = {
  gray: 'bg-[var(--color-text-muted)]',
  blue: 'bg-[var(--color-info)]',
  green: 'bg-[var(--color-success)]',
  red: 'bg-[var(--color-error)]',
  yellow: 'bg-[var(--color-warning)]',
  orange: 'bg-[var(--color-warning)]',
  purple: 'bg-[var(--color-primary)]',
  teal: 'bg-[var(--color-success)]',
  cyan: 'bg-[var(--color-info)]',
  indigo: 'bg-[var(--color-primary)]',
}

const STATUS_ORDER: TfdStatus[] = [
  'ENVIADO',
  'EM_ANALISE',
  'PENDENTE',
  'APROVADO',
  'NEGADO',
  'AGENDADO',
  'EM_VIAGEM',
  'AGUARDANDO_PC',
  'PC_EM_ANALISE',
  'CONCLUIDO',
  'CANCELADO',
  'RASCUNHO',
]

export function TfdDashboardGraficoStatus({ porStatus }: TfdDashboardGraficoStatusProps) {
  const entries = STATUS_ORDER.map((status) => ({
    status,
    count: porStatus[status] ?? 0,
    config: TFD_STATUS_CONFIG[status],
  })).filter((entry) => entry.count > 0)

  const max = Math.max(1, ...entries.map((entry) => entry.count))

  return (
    <Card
      header={
        <h2 className="text-[length:var(--text-lg)] font-semibold text-[var(--color-text)]">
          Solicitações por status
        </h2>
      }
    >
      {entries.length === 0 ? (
        <p className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
          Nenhuma solicitação no mês corrente.
        </p>
      ) : (
        <ul className="flex flex-col gap-[var(--space-3)]" role="list">
          {entries.map(({ status, count, config }) => {
            const widthPercent = Math.round((count / max) * 100)
            const fillClass = STATUS_BAR_FILL[config.color]

            return (
              <li key={status} className="flex flex-col gap-[var(--space-1)]">
                <div className="flex items-center justify-between gap-[var(--space-2)] text-[length:var(--text-sm)]">
                  <span className="font-medium text-[var(--color-text)]">{config.label}</span>
                  <span className="tabular-nums text-[var(--color-text-muted)]">{count}</span>
                </div>
                <div
                  className="h-[var(--space-3)] w-full overflow-hidden rounded-[var(--radius-sm)] bg-[var(--color-bg)]"
                  role="presentation"
                >
                  <div
                    className={`h-full min-w-[2px] rounded-[var(--radius-sm)] transition-[width] ${fillClass}`}
                    style={{ width: `${widthPercent}%` }}
                    title={`${config.label}: ${count} solicitação(ões) no mês`}
                  />
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}
