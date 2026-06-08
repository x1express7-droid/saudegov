'use client'

import type { GestaoTfdInboxCategoria, GestaoTfdInboxItem } from '@saude/mod-saude-tfd/client'
import { Badge, Card, EmptyState } from '@saude/ui'
import { Inbox } from 'lucide-react'
import Link from 'next/link'
import { useMemo, useState } from 'react'

const PRIORIDADE_LABEL = {
  critica: 'Crítica',
  alta: 'Alta',
  media: 'Média',
  baixa: 'Baixa',
} as const

const PRIORIDADE_VARIANT = {
  critica: 'red',
  alta: 'orange',
  media: 'yellow',
  baixa: 'gray',
} as const

const CATEGORIA_LABEL: Record<GestaoTfdInboxCategoria, string> = {
  regulacao: 'Regulação',
  transporte: 'Transporte',
  financeiro: 'Financeiro',
  prestacao: 'Prestação',
  complemento: 'Complemento',
}

type FiltroCategoria = 'todas' | GestaoTfdInboxCategoria

export interface GestaoInboxProps {
  items: GestaoTfdInboxItem[]
  inboxPorCategoria: Record<GestaoTfdInboxCategoria, number>
}

export function GestaoInbox({ items, inboxPorCategoria }: GestaoInboxProps) {
  const [filtro, setFiltro] = useState<FiltroCategoria>('todas')

  const filtrados = useMemo(() => {
    if (filtro === 'todas') {
      return items
    }
    return items.filter((item) => item.categoria === filtro)
  }, [filtro, items])

  const filtros: { id: FiltroCategoria; label: string; count: number }[] = [
    { id: 'todas', label: 'Todas', count: items.length },
    ...(
      Object.entries(CATEGORIA_LABEL) as [GestaoTfdInboxCategoria, string][]
    ).map(([id, label]) => ({
      id,
      label,
      count: inboxPorCategoria[id],
    })),
  ]

  return (
    <Card
      header={
        <div className="flex flex-col gap-[var(--space-3)]">
          <div>
            <h2 className="text-[length:var(--text-lg)] font-semibold text-[var(--color-text)]">
              Inbox de ações
            </h2>
            <p className="mt-[var(--space-1)] text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
              Pendências priorizadas que exigem atenção da equipe.
            </p>
          </div>
          <div className="flex flex-wrap gap-[var(--space-2)]" role="tablist" aria-label="Filtrar inbox">
            {filtros.map((tab) => {
              const ativo = filtro === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={ativo}
                  className={`inline-flex min-h-[36px] items-center gap-[var(--space-2)] rounded-[var(--radius-sm)] border px-[var(--space-3)] text-[length:var(--text-sm)] transition-colors ${
                    ativo
                      ? 'border-[var(--color-primary)] bg-[color-mix(in_srgb,var(--color-primary)_10%,var(--color-surface))] font-medium text-[var(--color-primary)]'
                      : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                  }`}
                  onClick={() => setFiltro(tab.id)}
                >
                  {tab.label}
                  <Badge variant={ativo ? 'blue' : 'gray'} size="sm">
                    {tab.count}
                  </Badge>
                </button>
              )
            })}
          </div>
        </div>
      }
    >
      {filtrados.length === 0 ? (
        <EmptyState
          icon={<Inbox className="size-6" />}
          titulo="Nenhuma ação pendente"
          descricao="Quando houver alertas operacionais, eles aparecerão aqui ordenados por prioridade."
          className="border-0 bg-transparent py-[var(--space-8)]"
        />
      ) : (
        <ul className="divide-y divide-[var(--color-border)]">
          {filtrados.map((item) => (
            <li key={item.id} className="py-[var(--space-3)] first:pt-0 last:pb-0">
              <div className="flex flex-wrap items-start justify-between gap-[var(--space-3)]">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-[var(--space-2)]">
                    <Badge
                      variant={PRIORIDADE_VARIANT[item.prioridade]}
                      size="sm"
                    >
                      {PRIORIDADE_LABEL[item.prioridade]}
                    </Badge>
                    <Badge variant="gray" size="sm">
                      {CATEGORIA_LABEL[item.categoria]}
                    </Badge>
                  </div>
                  <p className="mt-[var(--space-2)] font-medium text-[var(--color-text)]">
                    {item.titulo}
                  </p>
                  <p className="mt-[var(--space-1)] text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
                    {item.descricao}
                  </p>
                  <p className="mt-[var(--space-1)] text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
                    {item.protocolo ? `Solicitação ${item.protocolo}` : null}
                    {item.protocolo && item.pacienteNomeParcial ? ' · ' : null}
                    {item.pacienteNomeParcial ?? null}
                  </p>
                </div>
                <Link
                  href={item.href}
                  className="shrink-0 text-[length:var(--text-sm)] font-medium text-[var(--color-primary)] underline-offset-2 hover:underline"
                >
                  Resolver
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
