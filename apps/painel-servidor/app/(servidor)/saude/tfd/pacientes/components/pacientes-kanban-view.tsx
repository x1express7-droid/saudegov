'use client'

import type { TfdPacienteVinculadoItem } from '@saude/mod-saude-tfd/client'
import { Card, cn } from '@saude/ui'
import { useMemo } from 'react'
import { useRouter } from 'next/navigation'

// BLOCO-7-PACIENTES
const PACIENTE_BASE = '/saude/tfd/pacientes'

const KANBAN_GRUPOS = [
  { id: 'A-F', label: 'A – F' },
  { id: 'G-L', label: 'G – L' },
  { id: 'M-R', label: 'M – R' },
  { id: 'S-Z', label: 'S – Z' },
] as const

type KanbanGrupoId = (typeof KANBAN_GRUPOS)[number]['id']

function formatDataVinculo(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function labelCns(cnsMascarado: string | null): string {
  return cnsMascarado ?? 'Sem CNS'
}

function getKanbanGrupo(nome: string): KanbanGrupoId {
  const first = nome.trim().charAt(0).toUpperCase()
  if (/[A-F]/.test(first)) {
    return 'A-F'
  }
  if (/[G-L]/.test(first)) {
    return 'G-L'
  }
  if (/[M-R]/.test(first)) {
    return 'M-R'
  }
  return 'S-Z'
}

function countClassName(count: number): string {
  if (count === 0) {
    return 'bg-[var(--color-bg)] text-[var(--color-text-muted)]'
  }
  return 'bg-[var(--color-primary-light)] text-[var(--color-primary)]'
}

export interface PacientesKanbanViewProps {
  items: TfdPacienteVinculadoItem[]
  podeVerPerfilPaciente: boolean
}

export function PacientesKanbanView({ items, podeVerPerfilPaciente }: PacientesKanbanViewProps) {
  const router = useRouter()

  const colunas = useMemo(
    () =>
      KANBAN_GRUPOS.map((grupo) => ({
        ...grupo,
        items: items.filter((item) => getKanbanGrupo(item.nome) === grupo.id),
      })),
    [items]
  )

  return (
    <div className="overflow-x-auto pb-[var(--space-2)]">
      <div className="flex min-w-max gap-[var(--space-4)]">
        {colunas.map((coluna) => (
          <div
            key={coluna.id}
            className="flex w-52 shrink-0 flex-col gap-[var(--space-2)] lg:w-64"
          >
            <div className="flex items-center justify-between gap-[var(--space-2)] px-[var(--space-1)]">
              <h3 className="text-[length:var(--text-sm)] font-semibold text-[var(--color-text)]">
                {coluna.label}
              </h3>
              <span
                className={cn(
                  'rounded-full px-2 py-0.5 text-[length:var(--text-xs)] font-bold',
                  countClassName(coluna.items.length)
                )}
              >
                {coluna.items.length}
              </span>
            </div>

            <div className="min-h-64 rounded-[var(--radius-lg)] bg-[var(--color-bg)] p-[var(--space-2)]">
              {coluna.items.length === 0 ? (
                <p className="flex min-h-64 items-center justify-center text-center text-[length:var(--text-xs)] text-[var(--color-text-subtle)]">
                  Nenhum paciente
                </p>
              ) : (
                <div className="flex flex-col gap-[var(--space-2)]">
                  {coluna.items.map((item) => {
                    const perfilHref = `${PACIENTE_BASE}/${item.id}`

                    return (
                      <Card
                        key={item.id}
                        bodyClassName="p-[var(--space-3)]"
                        className={cn(
                          podeVerPerfilPaciente && 'cursor-pointer transition-shadow hover:shadow-md'
                        )}
                        onClick={
                          podeVerPerfilPaciente
                            ? () => router.push(perfilHref)
                            : undefined
                        }
                        onKeyDown={
                          podeVerPerfilPaciente
                            ? (event) => {
                                if (event.key === 'Enter' || event.key === ' ') {
                                  event.preventDefault()
                                  router.push(perfilHref)
                                }
                              }
                            : undefined
                        }
                        role={podeVerPerfilPaciente ? 'button' : undefined}
                        tabIndex={podeVerPerfilPaciente ? 0 : undefined}
                      >
                        <p className="truncate text-[length:var(--text-sm)] font-medium text-[var(--color-text)]">
                          {item.nome}
                        </p>
                        <p className="truncate font-mono text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
                          {labelCns(item.cnsMascarado)}
                        </p>
                        <p className="mt-[var(--space-1)] text-[length:var(--text-xs)] text-[var(--color-text-subtle)]">
                          {formatDataVinculo(item.vinculadoEm)}
                        </p>
                      </Card>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
