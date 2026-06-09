import { Card, EmptyState } from '@saude/ui'
import { BarChart3 } from 'lucide-react'

// BLOCO-13-RELATORIOS
export interface RelatorioBarraItem {
  key: string
  label: string
  count: number
  barClassName: string
}

interface RelatorioBarraHorizontalProps {
  titulo: string
  items: RelatorioBarraItem[]
  emptyTitulo?: string
  emptyDescricao?: string
}

export function RelatorioBarraHorizontal({
  titulo,
  items,
  emptyTitulo = 'Sem dados no período',
  emptyDescricao = 'Quando houver registros, a distribuição aparecerá aqui.',
}: RelatorioBarraHorizontalProps) {
  const entries = items.filter((item) => item.count > 0)
  const max = Math.max(1, ...entries.map((item) => item.count))

  return (
    <Card
      header={
        <h2 className="text-[length:var(--text-base)] font-semibold text-[var(--color-text)]">
          {titulo}
        </h2>
      }
    >
      {entries.length === 0 ? (
        <EmptyState
          icon={<BarChart3 className="size-6" />}
          titulo={emptyTitulo}
          descricao={emptyDescricao}
          className="border-0 bg-transparent py-[var(--space-6)]"
        />
      ) : (
        <ul className="flex flex-col gap-[var(--space-3)]" role="list">
          {entries.map((item) => {
            const widthPercent = Math.round((item.count / max) * 100)

            return (
              <li key={item.key} className="flex items-center gap-[var(--space-2)]">
                <span className="w-[7.5rem] shrink-0 truncate text-[length:var(--text-sm)] font-medium text-[var(--color-text)]">
                  {item.label}
                </span>
                <div
                  className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-[var(--color-bg)]"
                  role="presentation"
                >
                  <div
                    className={`h-full min-w-[2px] rounded-full ${item.barClassName}`}
                    style={{ width: `${widthPercent}%` }}
                    title={`${item.label}: ${item.count}`}
                  />
                </div>
                <span className="w-8 shrink-0 text-right text-[length:var(--text-sm)] tabular-nums text-[var(--color-text-muted)]">
                  {item.count}
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}
