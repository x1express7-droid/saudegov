import { cn } from '../utils/cn'

export interface TramitacaoItem {
  id: string
  tipo: string
  descricao: string
  autor: { nome: string }
  criadoAt: Date
}

export interface TramitacaoTimelineProps {
  tramitacoes: TramitacaoItem[]
  className?: string
  titulo?: string
}

const dateTimeFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

function sortChronologically(items: TramitacaoItem[]): TramitacaoItem[] {
  return [...items].sort((a, b) => a.criadoAt.getTime() - b.criadoAt.getTime())
}

export function TramitacaoTimeline({
  tramitacoes,
  className,
  titulo = 'Histórico de tramitações',
}: TramitacaoTimelineProps) {
  const ordered = sortChronologically(tramitacoes)

  if (ordered.length === 0) {
    return (
      <section
        className={cn(
          'rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] px-[var(--space-4)] py-[var(--space-6)] text-center',
          className
        )}
        aria-label={titulo}
      >
        <p className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
          Nenhuma tramitação registrada neste processo.
        </p>
      </section>
    )
  }

  return (
    <section className={cn('w-full', className)} aria-label={titulo}>
      <h2 className="mb-[var(--space-4)] text-[length:var(--text-lg)] font-semibold text-[var(--color-text)]">
        {titulo}
      </h2>
      <ol className="relative space-y-0">
        {ordered.map((item, index) => {
          const isLatest = index === ordered.length - 1
          const isFirst = index === 0

          return (
            <li key={item.id} className="relative flex gap-[var(--space-4)] pb-[var(--space-6)]">
              {!isFirst ? (
                <span
                  className="absolute left-[11px] top-0 h-[var(--space-3)] w-0.5 -translate-y-full bg-[var(--color-border)]"
                  aria-hidden="true"
                />
              ) : null}
              <span
                className={cn(
                  'relative z-10 mt-[var(--space-1)] flex size-6 shrink-0 items-center justify-center rounded-full border-2',
                  isLatest
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary)]'
                    : 'border-[var(--color-border-strong)] bg-[var(--color-surface)]'
                )}
                aria-hidden="true"
              >
                <span
                  className={cn(
                    'size-2 rounded-full',
                    isLatest ? 'bg-[var(--color-header-text)]' : 'bg-[var(--color-text-subtle)]'
                  )}
                />
              </span>
              {!isLatest ? (
                <span
                  className="absolute bottom-0 left-[11px] top-[calc(var(--space-1)+1.5rem)] w-0.5 bg-[var(--color-border)]"
                  aria-hidden="true"
                />
              ) : null}
              <article
                className={cn(
                  'min-w-0 flex-1 rounded-[var(--radius)] border px-[var(--space-4)] py-[var(--space-3)]',
                  isLatest
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)] shadow-[0_0_0_1px_var(--color-primary-light)]'
                    : 'border-[var(--color-border)] bg-[var(--color-surface)]'
                )}
              >
                <div className="flex flex-wrap items-baseline justify-between gap-[var(--space-2)]">
                  <p
                    className={cn(
                      'text-[length:var(--text-sm)] font-semibold',
                      isLatest ? 'text-[var(--color-primary)]' : 'text-[var(--color-text)]'
                    )}
                  >
                    {item.tipo}
                  </p>
                  <time
                    dateTime={item.criadoAt.toISOString()}
                    className="text-[length:var(--text-xs)] text-[var(--color-text-muted)]"
                  >
                    {dateTimeFormatter.format(item.criadoAt)}
                  </time>
                </div>
                <p className="mt-[var(--space-1)] text-[length:var(--text-sm)] text-[var(--color-text)]">
                  {item.descricao}
                </p>
                <p className="mt-[var(--space-2)] text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
                  {item.autor.nome}
                </p>
              </article>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
