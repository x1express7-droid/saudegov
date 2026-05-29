import { assertModuleActive, getTenantContext, requireTenantRole } from '@saude/core-auth/server'
import { getViagensTfd, TFD_PERMISSIONS } from '@saude/mod-saude-tfd'
import type { TfdViagemStatusV2 } from '@prisma/client'
import { Button, PageHeader } from '@saude/ui'
import { PermissionGate } from '@saude/ui/permission-gate'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'

import { VIAGEM_STATUS_CONFIG } from '../components/viagem-status-badge'
import { ViagemFiltros } from './components/viagem-filtros'
import { ViagemLista } from './components/viagem-lista'

export const metadata: Metadata = {
  title: 'Viagens TFD',
}

interface ViagensTfdPageProps {
  searchParams: Promise<{
    status?: string
    protocolo?: string
    dataSaidaInicio?: string
    dataSaidaFim?: string
    page?: string
    perPage?: string
  }>
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function parseStatus(value: string | undefined): TfdViagemStatusV2 | undefined {
  if (!value || !(value in VIAGEM_STATUS_CONFIG)) {
    return undefined
  }
  return value as TfdViagemStatusV2
}

export default async function ViagensTfdPage({ searchParams }: ViagensTfdPageProps) {
  const tenant = await getTenantContext()
  if (!tenant.modules?.saude?.tfd) {
    notFound()
  }

  await assertModuleActive('saude', 'tfd')
  const session = await requireTenantRole('SERVIDOR')

  const params = await searchParams
  const protocoloFilter = params.protocolo?.trim() || undefined
  const page = parsePositiveInt(params.page, 1)
  const perPage = Math.min(100, parsePositiveInt(params.perPage, 20))

  const { items, total } = await getViagensTfd({
    status: parseStatus(params.status),
    protocolo: protocoloFilter,
    dataSaidaInicio: params.dataSaidaInicio?.trim() || undefined,
    dataSaidaFim: params.dataSaidaFim?.trim() || undefined,
    page,
    perPage,
  })

  return (
    <div className="flex flex-col gap-[var(--space-6)]">
      <PageHeader
        titulo="Viagens"
        subtitulo="Deslocamentos vinculados aos processos TFD."
        breadcrumbs={[
          { label: 'TFD', href: '/saude/tfd/dashboard' },
          { label: 'Viagens' },
        ]}
        acoes={
          <PermissionGate session={session} permission={TFD_PERMISSIONS.GERENCIAR_VIAGEM}>
            <Button variant="primary" asChild>
              <Link href="/saude/tfd/viagens/nova">Nova viagem</Link>
            </Button>
          </PermissionGate>
        }
      />

      <Suspense fallback={null}>
        <ViagemFiltros />
      </Suspense>

      <ViagemLista items={items} total={total} session={session} />
    </div>
  )
}
