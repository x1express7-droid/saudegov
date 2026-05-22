import { Card } from '@saude/ui'

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
}

function KpiCard({ titulo, valor, descricao }: KpiCardProps) {
  return (
    <Card>
      <p className="text-[length:var(--text-sm)] font-medium text-[var(--color-text-muted)]">
        {titulo}
      </p>
      <p className="mt-[var(--space-2)] text-[length:var(--text-2xl)] font-semibold tabular-nums text-[var(--color-text)]">
        {valor.toLocaleString('pt-BR')}
      </p>
      {descricao ? (
        <p className="mt-[var(--space-1)] text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
          {descricao}
        </p>
      ) : null}
    </Card>
  )
}

export function TfdDashboardKpis({ totalSolicitacoes, porStatus }: TfdDashboardKpisProps) {
  const aprovadas = porStatus.APROVADO ?? 0
  const emAnalise = countFromStatus(porStatus, ['ENVIADO', 'EM_ANALISE', 'PENDENTE'])
  const canceladas = porStatus.CANCELADO ?? 0

  return (
    <div className="grid gap-[var(--space-4)] sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard titulo="Total no mês" valor={totalSolicitacoes} descricao="Exceto rascunhos" />
      <KpiCard titulo="Aprovadas" valor={aprovadas} descricao="Status Aprovado" />
      <KpiCard titulo="Em análise" valor={emAnalise} descricao="Enviado, em análise ou pendente" />
      <KpiCard titulo="Canceladas" valor={canceladas} />
    </div>
  )
}
