import { assertModuleActive, getTenantContext, requireTenantRole } from '@saude/core-auth'
import { getPrestacoesTfd } from '@saude/mod-saude-tfd'
import type { TfdPrestacaoStatus } from '@prisma/client'
import { PageHeader } from '@saude/ui'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'

import { PrestacaoFiltros } from './components/prestacao-filtros'
import { PrestacaoLista } from './components/prestacao-lista'

export const metadata: Metadata = {
  title: 'Prestações de Contas TFD',
}

const PRESTACAO_STATUS_VALUES = new Set<string>(['PENDENTE', 'ENVIADA', 'APROVADA', 'REJEITADA'])

interface TfdPrestacoesPageProps {
  searchParams: Promise<{
    status?: string
    page?: string
    perPage?: string
  }>
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function parseStatus(value: string | undefined): TfdPrestacaoStatus | undefined {
  if (!value || !PRESTACAO_STATUS_VALUES.has(value)) {
    return undefined
  }
  return value as TfdPrestacaoStatus
}

export default async function TfdPrestacoesPage({ searchParams }: TfdPrestacoesPageProps) {
  const tenant = await getTenantContext()
  if (!tenant.modules?.saude?.tfd) {
    notFound()
  }

  await assertModuleActive('saude', 'tfd')
  await requireTenantRole('SERVIDOR')

  const params = await searchParams
  const page = parsePositiveInt(params.page, 1)
  const perPage = Math.min(100, parsePositiveInt(params.perPage, 20))

  const { items, total } = await getPrestacoesTfd({
    status: parseStatus(params.status),
    page,
    perPage,
  })

  return (
    <div className="flex flex-col gap-[var(--space-6)]">
      <PageHeader
        titulo="Prestações de Contas TFD"
        subtitulo="Prestações vinculadas às viagens realizadas — acompanhamento e envio para análise."
        breadcrumbs={[
          { label: 'Fila TFD', href: '/saude/tfd' },
          { label: 'Prestações' },
        ]}
      />

      <Suspense
        fallback={
          <p className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
            Carregando filtros…
          </p>
        }
      >
        <PrestacaoFiltros />
      </Suspense>

      <Suspense
        fallback={
          <p className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
            Carregando prestações…
          </p>
        }
      >
        <PrestacaoLista items={items} total={total} />
      </Suspense>
    </div>
  )
}
