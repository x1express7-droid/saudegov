import { assertModuleActive, getTenantContext, requireTenantRole } from '@saude/core-auth/server'
import { getAgendamentosConsulta, getAgendamentosTfd } from '@saude/mod-saude-tfd'
import type { TfdAgendamentoStatus } from '@prisma/client'
import { PageHeader } from '@saude/ui'
import { getDefaultAgendamentosPeriodo } from '@/lib/tfd/default-agendamentos-periodo'
import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { Suspense } from 'react'

import {
  AgendamentoListagemConsultas,
  AgendamentoListagemLegado,
} from './components/agendamento-listagem'

// BLOCO-9-AGENDAMENTOS
export const metadata: Metadata = {
  title: 'Agendamentos TFD',
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/

const AGENDAMENTO_STATUS_VALUES = new Set<string>([
  'AGENDADO',
  'EM_VIAGEM',
  'REALIZADO',
  'CANCELADO',
])

interface TfdAgendamentosPageProps {
  searchParams: Promise<{
    fonte?: string
    dataInicio?: string
    dataFim?: string
    motoristaId?: string
    veiculoId?: string
    prestadorId?: string
    status?: string
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

function parseAgendamentoStatus(value: string | undefined): TfdAgendamentoStatus | undefined {
  if (!value || !AGENDAMENTO_STATUS_VALUES.has(value)) {
    return undefined
  }
  return value as TfdAgendamentoStatus
}

function temFiltrosServidorAtivos(params: {
  status?: string
  dataInicio?: string
  dataFim?: string
}): boolean {
  const { dataInicio: defaultInicio, dataFim: defaultFim } = getDefaultAgendamentosPeriodo()

  if (params.status && AGENDAMENTO_STATUS_VALUES.has(params.status)) {
    return true
  }
  if (params.dataInicio && params.dataInicio !== defaultInicio) {
    return true
  }
  if (params.dataFim && params.dataFim !== defaultFim) {
    return true
  }
  return false
}

export default async function TfdAgendamentosPage({ searchParams }: TfdAgendamentosPageProps) {
  const tenant = await getTenantContext()
  if (!tenant.modules?.saude?.tfd) {
    notFound()
  }

  await assertModuleActive('saude', 'tfd')
  const session = await requireTenantRole('SERVIDOR')

  const params = await searchParams
  const fonte = params.fonte === 'viagens' ? 'viagens' : 'consultas'

  const dataInicioParam = parseDateParam(params.dataInicio)
  const dataFimParam = parseDateParam(params.dataFim)

  if (!dataInicioParam && !dataFimParam) {
    const { dataInicio, dataFim } = getDefaultAgendamentosPeriodo()
    const next = new URLSearchParams()
    next.set('fonte', fonte)
    next.set('dataInicio', dataInicio)
    next.set('dataFim', dataFim)

    if (params.motoristaId?.trim()) {
      next.set('motoristaId', params.motoristaId.trim())
    }
    if (params.veiculoId?.trim()) {
      next.set('veiculoId', params.veiculoId.trim())
    }
    if (params.prestadorId?.trim()) {
      next.set('prestadorId', params.prestadorId.trim())
    }
    if (params.status?.trim()) {
      next.set('status', params.status.trim())
    }
    if (params.page?.trim()) {
      next.set('page', params.page.trim())
    }
    if (params.perPage?.trim()) {
      next.set('perPage', params.perPage.trim())
    }

    redirect(`/saude/tfd/agendamentos?${next.toString()}`)
  }

  const page = parsePositiveInt(params.page, 1)
  const perPage = Math.min(100, parsePositiveInt(params.perPage, 20))

  const subtitulo =
    fonte === 'viagens'
      ? 'Registros do sistema anterior. Novos deslocamentos são gerenciados em Viagens TFD.'
      : 'Consultas agendadas na nova entidade de agendamentos TFD.'

  return (
    <div className="flex flex-col gap-[var(--space-6)]">
      <PageHeader
        titulo="Agendamentos TFD"
        subtitulo={subtitulo}
        breadcrumbs={[
          { label: 'TFD', href: '/saude/tfd' },
          { label: 'Agendamentos' },
        ]}
      />

      {fonte === 'viagens' ? (
        <p className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
          Registros do sistema anterior. Novos deslocamentos são gerenciados em Viagens TFD.
        </p>
      ) : null}

      <Suspense
        fallback={
          <p className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
            Carregando agendamentos…
          </p>
        }
      >
        {fonte === 'viagens' ? (
          <AgendamentosViagensListagem
            session={session}
            dataInicio={dataInicioParam}
            dataFim={dataFimParam}
            motoristaId={parseUuidParam(params.motoristaId)}
            veiculoId={parseUuidParam(params.veiculoId)}
            page={page}
            perPage={perPage}
          />
        ) : (
          <AgendamentosConsultasListagem
            dataInicio={dataInicioParam}
            dataFim={dataFimParam}
            prestadorId={parseUuidParam(params.prestadorId)}
            status={parseAgendamentoStatus(params.status)}
            page={page}
            perPage={perPage}
            temFiltrosServidor={temFiltrosServidorAtivos({
              status: params.status,
              dataInicio: dataInicioParam,
              dataFim: dataFimParam,
            })}
          />
        )}
      </Suspense>
    </div>
  )
}

async function AgendamentosViagensListagem({
  session,
  dataInicio,
  dataFim,
  motoristaId,
  veiculoId,
  page,
  perPage,
}: {
  session: Parameters<typeof AgendamentoListagemLegado>[0]['session']
  dataInicio?: string
  dataFim?: string
  motoristaId?: string
  veiculoId?: string
  page: number
  perPage: number
}) {
  const { items, total } = await getAgendamentosTfd({
    dataInicio,
    dataFim,
    motoristaId,
    veiculoId,
    page,
    perPage,
  })

  return <AgendamentoListagemLegado items={items} total={total} session={session} />
}

async function AgendamentosConsultasListagem({
  dataInicio,
  dataFim,
  prestadorId,
  status,
  page,
  perPage,
  temFiltrosServidor,
}: {
  dataInicio?: string
  dataFim?: string
  prestadorId?: string
  status?: TfdAgendamentoStatus
  page: number
  perPage: number
  temFiltrosServidor: boolean
}) {
  const { items, total } = await getAgendamentosConsulta({
    dataInicio,
    dataFim,
    prestadorId,
    status,
    page,
    perPage,
  })

  return (
    <AgendamentoListagemConsultas
      items={items}
      total={total}
      page={page}
      perPage={perPage}
      temFiltrosServidor={temFiltrosServidor}
    />
  )
}
