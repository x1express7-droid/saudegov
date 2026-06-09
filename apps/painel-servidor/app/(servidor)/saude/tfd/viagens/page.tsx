import {
  assertModuleActive,
  getTenantContext,
  hasPermission,
  requireTenantRole,
} from '@saude/core-auth/server'
import {
  getMotoristasAgendamentoTfd,
  getVeiculosAgendamentoTfd,
  getViagensTfd,
  TFD_PERMISSIONS,
} from '@saude/mod-saude-tfd'
import type { TfdViagemStatusV2 } from '@prisma/client'
import { PageHeader } from '@saude/ui'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'

import { VIAGEM_STATUS_CONFIG } from '../components/viagem-status-badge'
import { ViagemListagem } from './components/viagem-listagem'

// BLOCO-10-VIAGENS
export const metadata: Metadata = {
  title: 'Viagens TFD',
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

interface ViagensTfdPageProps {
  searchParams: Promise<{
    status?: string
    protocolo?: string
    dataSaidaInicio?: string
    dataSaidaFim?: string
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

function parseStatus(value: string | undefined): TfdViagemStatusV2 | undefined {
  if (!value || !(value in VIAGEM_STATUS_CONFIG)) {
    return undefined
  }
  return value as TfdViagemStatusV2
}

function parseUuidParam(value: string | undefined): string | undefined {
  const trimmed = value?.trim()
  if (!trimmed || !UUID_REGEX.test(trimmed)) {
    return undefined
  }
  return trimmed
}

function temFiltrosServidorAtivos(params: {
  status?: string
  protocolo?: string
  dataSaidaInicio?: string
  dataSaidaFim?: string
  motoristaId?: string
  veiculoId?: string
}): boolean {
  return Boolean(
    (params.status && params.status in VIAGEM_STATUS_CONFIG) ||
      params.protocolo?.trim() ||
      params.dataSaidaInicio?.trim() ||
      params.dataSaidaFim?.trim() ||
      params.motoristaId?.trim() ||
      params.veiculoId?.trim()
  )
}

export default async function ViagensTfdPage({ searchParams }: ViagensTfdPageProps) {
  const tenant = await getTenantContext()
  if (!tenant.modules?.saude?.tfd) {
    notFound()
  }

  await assertModuleActive('saude', 'tfd')
  const session = await requireTenantRole('SERVIDOR')
  const podeNovaViagem = hasPermission(session, TFD_PERMISSIONS.GERENCIAR_VIAGEM)

  const params = await searchParams
  const protocoloFilter = params.protocolo?.trim() || undefined
  const page = parsePositiveInt(params.page, 1)
  const perPage = Math.min(100, parsePositiveInt(params.perPage, 20))

  const dataReferenciaMotoristas =
    params.dataSaidaInicio?.trim() || new Date().toISOString().slice(0, 10)

  const [{ items, total }, motoristas, veiculos] = await Promise.all([
    getViagensTfd({
      status: parseStatus(params.status),
      protocolo: protocoloFilter,
      dataSaidaInicio: params.dataSaidaInicio?.trim() || undefined,
      dataSaidaFim: params.dataSaidaFim?.trim() || undefined,
      motoristaId: parseUuidParam(params.motoristaId),
      veiculoId: parseUuidParam(params.veiculoId),
      page,
      perPage,
    }),
    getMotoristasAgendamentoTfd(dataReferenciaMotoristas),
    getVeiculosAgendamentoTfd(false),
  ])

  return (
    <div className="flex flex-col gap-[var(--space-6)]">
      <PageHeader
        titulo="Viagens"
        subtitulo="Deslocamentos vinculados aos processos TFD."
        breadcrumbs={[
          { label: 'TFD', href: '/saude/tfd/dashboard' },
          { label: 'Viagens' },
        ]}
      />

      <Suspense
        fallback={
          <p className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
            Carregando viagens…
          </p>
        }
      >
        <ViagemListagem
          items={items}
          total={total}
          page={page}
          perPage={perPage}
          session={session}
          podeNovaViagem={podeNovaViagem}
          temFiltrosServidor={temFiltrosServidorAtivos(params)}
          motoristas={motoristas.map((item) => ({ id: item.id, nome: item.nome }))}
          veiculos={veiculos.map((item) => ({
            id: item.id,
            placa: item.placa,
            modelo: item.modelo,
          }))}
        />
      </Suspense>
    </div>
  )
}
