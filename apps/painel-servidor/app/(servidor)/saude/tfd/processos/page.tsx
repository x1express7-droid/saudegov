import { assertModuleActive, getTenantContext, requireTenantRole } from '@saude/core-auth/server'
import { getListaProcessosTfd, TFD_PERMISSIONS } from '@saude/mod-saude-tfd'
import type { ProcessoStatus, TfdUrgencia } from '@prisma/client'
import { Button, PageHeader } from '@saude/ui'
import { PermissionGate } from '@saude/ui/permission-gate'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'

import { ProcessoFiltros } from './components/processo-filtros'
import { ProcessoLista } from './components/processo-lista'
import { PROCESSO_STATUS_CONFIG, type ProcessoStatusValue } from '../components/processo-status-badge'

export const metadata: Metadata = {
  title: 'Processos TFD',
}

const URGENCIA_VALUES = new Set<string>(['BAIXA', 'INTERMEDIARIA', 'GRAVE', 'MUITO_URGENTE'])

interface ProcessosTfdPageProps {
  searchParams: Promise<{
    statusProcesso?: string
    urgencia?: string
    pacienteNome?: string
    protocolo?: string
    dataInicio?: string
    dataFim?: string
    page?: string
    perPage?: string
  }>
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function parseStatusProcesso(value: string | undefined): ProcessoStatus | undefined {
  if (!value || !(value in PROCESSO_STATUS_CONFIG)) {
    return undefined
  }
  return value as ProcessoStatusValue
}

function parseUrgencia(value: string | undefined): TfdUrgencia | undefined {
  if (!value || !URGENCIA_VALUES.has(value)) {
    return undefined
  }
  return value as TfdUrgencia
}

export default async function ProcessosTfdPage({ searchParams }: ProcessosTfdPageProps) {
  const tenant = await getTenantContext()
  if (!tenant.modules?.saude?.tfd) {
    notFound()
  }

  await assertModuleActive('saude', 'tfd')
  const session = await requireTenantRole('SERVIDOR')

  const params = await searchParams
  const page = parsePositiveInt(params.page, 1)
  const perPage = Math.min(100, parsePositiveInt(params.perPage, 20))

  const { items, total } = await getListaProcessosTfd({
    statusProcesso: parseStatusProcesso(params.statusProcesso),
    urgencia: parseUrgencia(params.urgencia),
    pacienteNome: params.pacienteNome?.trim() || undefined,
    protocolo: params.protocolo?.trim() || undefined,
    dataInicio: params.dataInicio?.trim() || undefined,
    dataFim: params.dataFim?.trim() || undefined,
    page,
    perPage,
  })

  return (
    <div className="flex flex-col gap-[var(--space-6)]">
      <PageHeader
        titulo="Processos TFD"
        subtitulo="Processos de Tratamento Fora de Domicílio e suas solicitações vinculadas."
        acoes={
          <PermissionGate session={session} permission={TFD_PERMISSIONS.ABRIR_SOLICITACAO}>
            <Button variant="primary" asChild>
              <Link href="/saude/tfd/processos/novo">Novo processo</Link>
            </Button>
          </PermissionGate>
        }
      />

      <Suspense
        fallback={
          <p className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
            Carregando filtros…
          </p>
        }
      >
        <ProcessoFiltros />
      </Suspense>

      <Suspense
        fallback={
          <p className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
            Carregando processos…
          </p>
        }
      >
        <ProcessoLista items={items} total={total} session={session} />
      </Suspense>
    </div>
  )
}
