import { assertModuleActive, getTenantContext, requireTenantRole } from '@saude/core-auth'
import { getAgendamentosTfd } from '@saude/mod-saude-tfd'
import { PageHeader } from '@saude/ui'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'

import { AgendamentoFiltros } from './components/agendamento-filtros'
import { AgendamentoLista } from './components/agendamento-lista'

export const metadata: Metadata = {
  title: 'Agendamentos TFD',
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/

interface TfdAgendamentosPageProps {
  searchParams: Promise<{
    dataInicio?: string
    dataFim?: string
    motoristaId?: string
    veiculoId?: string
    page?: string
    perPage?: string
  }>
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function parseDateParam(value: string | undefined): string | undefined {
  const trimmed = value?.trim()
  if (!trimmed || !DATE_REGEX.test(trimmed)) {
    return undefined
  }
  return trimmed
}

function parseUuidParam(value: string | undefined): string | undefined {
  const trimmed = value?.trim()
  if (!trimmed || !UUID_REGEX.test(trimmed)) {
    return undefined
  }
  return trimmed
}

export default async function TfdAgendamentosPage({ searchParams }: TfdAgendamentosPageProps) {
  const tenant = await getTenantContext()
  if (!tenant.modules?.saude?.tfd) {
    notFound()
  }

  await assertModuleActive('saude', 'tfd')
  await requireTenantRole('SERVIDOR')

  const params = await searchParams
  const page = parsePositiveInt(params.page, 1)
  const perPage = Math.min(100, parsePositiveInt(params.perPage, 20))

  const { items, total } = await getAgendamentosTfd({
    dataInicio: parseDateParam(params.dataInicio),
    dataFim: parseDateParam(params.dataFim),
    motoristaId: parseUuidParam(params.motoristaId),
    veiculoId: parseUuidParam(params.veiculoId),
    page,
    perPage,
  })

  return (
    <div className="flex flex-col gap-[var(--space-6)]">
      <PageHeader
        titulo="Agendamentos TFD"
        subtitulo="Viagens agendadas para Tratamento Fora de Domicílio."
        breadcrumbs={[
          { label: 'Fila TFD', href: '/saude/tfd' },
          { label: 'Agendamentos' },
        ]}
      />

      <Suspense
        fallback={
          <p className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
            Carregando filtros…
          </p>
        }
      >
        <AgendamentoFiltros />
      </Suspense>

      <Suspense
        fallback={
          <p className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
            Carregando agendamentos…
          </p>
        }
      >
        <AgendamentoLista items={items} total={total} />
      </Suspense>
    </div>
  )
}
