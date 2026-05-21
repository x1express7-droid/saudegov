import {
  assertModuleActive,
  getTenantContext,
  hasRole,
  requireTenantRole,
} from '@saude/core-auth'
import {
  getAlertasPendente30Dias,
  getSolicitacoesTfd,
  TFD_PERMISSIONS,
  type AlertaPendente30Dias,
} from '@saude/mod-saude-tfd'
import type { TfdStatusSolicitacao, TfdUrgencia } from '@prisma/client'
import { Alert, Button, PageHeader, PermissionGate } from '@saude/ui'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'

import { AlertaPendentes } from './components/alerta-pendentes'
import { SolicitacaoFiltros } from './components/solicitacao-filtros'
import { SolicitacaoLista } from './components/solicitacao-lista'

export const metadata: Metadata = {
  title: 'Fila TFD',
}

const STATUS_VALUES = new Set<string>([
  'RASCUNHO',
  'ENVIADO',
  'EM_ANALISE',
  'PENDENTE',
  'APROVADO',
  'NEGADO',
  'AGENDADO',
  'EM_VIAGEM',
  'AGUARDANDO_PC',
  'PC_EM_ANALISE',
  'CONCLUIDO',
  'CANCELADO',
])

const URGENCIA_VALUES = new Set<string>([
  'BAIXA',
  'INTERMEDIARIA',
  'GRAVE',
  'MUITO_URGENTE',
])

interface TfdFilaPageProps {
  searchParams: Promise<{
    status?: string
    urgencia?: string
    protocolo?: string
    page?: string
    perPage?: string
    enviado?: string
    rascunho?: string
  }>
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function parseStatus(value: string | undefined): TfdStatusSolicitacao | undefined {
  if (!value || !STATUS_VALUES.has(value)) {
    return undefined
  }
  return value as TfdStatusSolicitacao
}

function parseUrgencia(value: string | undefined): TfdUrgencia | undefined {
  if (!value || !URGENCIA_VALUES.has(value)) {
    return undefined
  }
  return value as TfdUrgencia
}

export default async function TfdFilaPage({ searchParams }: TfdFilaPageProps) {
  const tenant = await getTenantContext()
  if (!tenant.modules?.saude?.tfd) {
    notFound()
  }

  await assertModuleActive('saude', 'tfd')
  const session = await requireTenantRole('SERVIDOR')

  const params = await searchParams
  const page = parsePositiveInt(params.page, 1)
  const perPage = Math.min(100, parsePositiveInt(params.perPage, 20))

  const { items, total } = await getSolicitacoesTfd({
    status: parseStatus(params.status),
    urgencia: parseUrgencia(params.urgencia),
    protocolo: params.protocolo,
    page,
    perPage,
  })

  const protocoloEnviado = params.enviado?.trim()
  const protocoloRascunho = params.rascunho?.trim()

  let alertasPendente30Dias: AlertaPendente30Dias[] = []
  if (hasRole(session, 'GESTOR')) {
    try {
      alertasPendente30Dias = await getAlertasPendente30Dias()
    } catch {
      alertasPendente30Dias = []
    }
  }

  return (
    <div className="flex flex-col gap-[var(--space-6)]">
      <PageHeader
        titulo="Fila TFD"
        subtitulo="Solicitações de Tratamento Fora de Domicílio em regulação e acompanhamento."
        acoes={
          <PermissionGate
            session={session}
            permission={TFD_PERMISSIONS.ABRIR_SOLICITACAO}
          >
            <Button variant="primary" asChild>
              <Link href="/saude/tfd/nova">Nova solicitação</Link>
            </Button>
          </PermissionGate>
        }
      />

      {protocoloEnviado ? (
        <Alert variant="success" role="status">
          Solicitação <strong>{protocoloEnviado}</strong> enviada para regulação com sucesso.
        </Alert>
      ) : null}

      {protocoloRascunho ? (
        <Alert variant="info" role="status">
          Rascunho salvo com protocolo <strong>{protocoloRascunho}</strong>. Você pode
          localizá-lo na fila e concluir o envio quando o laudo estiver pronto.
        </Alert>
      ) : null}

      <AlertaPendentes alertas={alertasPendente30Dias} />

      <Suspense
        fallback={
          <p className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
            Carregando filtros…
          </p>
        }
      >
        <SolicitacaoFiltros />
      </Suspense>

      <Suspense
        fallback={
          <p className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
            Carregando solicitações…
          </p>
        }
      >
        <SolicitacaoLista items={items} total={total} />
      </Suspense>
    </div>
  )
}
