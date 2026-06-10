import {
  assertModuleActive,
  getTenantContext,
  hasPermission,
  requireTenantRole,
} from '@saude/core-auth/server'
import {
  getDadosClinicosProcesso,
  getSolicitacaoTfd,
  getViagensSolicitacaoTfd,
  TFD_PERMISSIONS,
  type TfdProcessoDadosClinicosOutput,
  type TfdViagemSolicitacaoItem,
} from '@saude/mod-saude-tfd'
import {
  PageHeader,
  ProtocoloBadge,
  StatusBadge,
  UrgenciaBadge,
  type TfdStatus,
  type TfdUrgencia,
} from '@saude/ui'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { DadosClinicosSection } from './components/dados-clinicos-section'
import { SolicitacaoAcoes } from './components/solicitacao-acoes'
import { SolicitacaoAnexosSection } from './components/solicitacao-anexos-section'
import { SolicitacaoDetalhe } from './components/solicitacao-detalhe'
import { SolicitacaoTimeline } from './components/solicitacao-timeline'

interface TfdDetalhePageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ cancelar?: string }>
}

export async function generateMetadata({ params }: TfdDetalhePageProps): Promise<Metadata> {
  const { id } = await params
  return {
    title: `Solicitação TFD`,
    description: `Detalhe da solicitação ${id}`,
  }
}

function isTfdStatus(value: string): value is TfdStatus {
  return value in
    {
      RASCUNHO: true,
      ENVIADO: true,
      EM_ANALISE: true,
      PENDENTE: true,
      APROVADO: true,
      NEGADO: true,
      AGENDADO: true,
      EM_VIAGEM: true,
      AGUARDANDO_PC: true,
      PC_EM_ANALISE: true,
      CONCLUIDO: true,
      CANCELADO: true,
    }
}

function isTfdUrgencia(value: string): value is TfdUrgencia {
  return value in
    {
      BAIXA: true,
      INTERMEDIARIA: true,
      GRAVE: true,
      MUITO_URGENTE: true,
    }
}

export default async function TfdDetalhePage({ params, searchParams }: TfdDetalhePageProps) {
  const tenant = await getTenantContext()
  if (!tenant.modules?.saude?.tfd) {
    notFound()
  }

  await assertModuleActive('saude', 'tfd')
  const session = await requireTenantRole('SERVIDOR')

  const { id } = await params
  const { cancelar: cancelarQuery } = await searchParams
  const solicitacao = await getSolicitacaoTfd(id)
  const abrirCancelamentoInicial = cancelarQuery === 'prazo'

  if (!solicitacao) {
    notFound()
  }

  const statusComViagens =
    solicitacao.status === 'APROVADO' ||
    solicitacao.status === 'AGENDADO' ||
    solicitacao.status === 'EM_VIAGEM' ||
    solicitacao.status === 'AGUARDANDO_PC' ||
    solicitacao.status === 'PC_EM_ANALISE' ||
    solicitacao.status === 'CONCLUIDO'

  let viagens: TfdViagemSolicitacaoItem[] = []

  if (statusComViagens) {
    viagens = await getViagensSolicitacaoTfd(id)
  }

  const statusEncerrados = new Set(['CONCLUIDO', 'NEGADO', 'CANCELADO'])
  const podeAnexarDocumentos =
    !statusEncerrados.has(solicitacao.status) &&
    (hasPermission(session, TFD_PERMISSIONS.ABRIR_SOLICITACAO) ||
      hasPermission(session, TFD_PERMISSIONS.ANALISAR_LAUDO) ||
      session.user.id === solicitacao.solicitante.id)

  const podeVerDadosClinicos =
    hasPermission(session, TFD_PERMISSIONS.REGISTRAR_DADOS_CLINICOS) ||
    hasPermission(session, TFD_PERMISSIONS.ANALISAR_LAUDO)

  let dadosClinicos: TfdProcessoDadosClinicosOutput | null = null
  if (podeVerDadosClinicos && solicitacao.processoId) {
    try {
      dadosClinicos = await getDadosClinicosProcesso(solicitacao.processoId)
    } catch {
      dadosClinicos = null
    }
  }

  // PC-PARTE-1.1: projeção financeira removida da UI — dados/actions preservados no backend

  return (
    <div className="flex flex-col gap-[var(--space-6)]">
      <PageHeader
        titulo={solicitacao.protocolo}
        subtitulo="Detalhe da solicitação de Tratamento Fora de Domicílio."
        breadcrumbs={[
          { label: 'Solicitações', href: '/saude/tfd/solicitacoes' },
          { label: solicitacao.protocolo },
        ]}
        acoes={
          <div className="flex flex-wrap items-center gap-[var(--space-2)]">
            <ProtocoloBadge protocolo={solicitacao.protocolo} />
            {isTfdStatus(solicitacao.status) ? (
              <StatusBadge status={solicitacao.status} />
            ) : (
              <span className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
                {solicitacao.status}
              </span>
            )}
            {isTfdUrgencia(solicitacao.urgencia) ? (
              <UrgenciaBadge urgencia={solicitacao.urgencia} />
            ) : (
              <span className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
                {solicitacao.urgencia}
              </span>
            )}
            <Link
              href="/saude/tfd/solicitacoes"
              className="text-[length:var(--text-sm)] font-medium text-[var(--color-primary)] hover:underline"
            >
              Voltar à fila
            </Link>
          </div>
        }
      />

      <div className="grid gap-[var(--space-6)] lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]">
        <div className="flex min-w-0 flex-col gap-[var(--space-6)]">
          <SolicitacaoDetalhe solicitacao={solicitacao} />
          <SolicitacaoAnexosSection
            solicitacaoId={solicitacao.id}
            processoId={solicitacao.processoId}
            podeAnexar={podeAnexarDocumentos}
            anexos={solicitacao.anexos}
          />
          {dadosClinicos ? (
            <DadosClinicosSection
              session={session}
              processoId={solicitacao.processoId}
              dadosIniciais={dadosClinicos}
            />
          ) : null}
          <SolicitacaoTimeline tramitacoes={solicitacao.tramitacoes} />
        </div>

        <aside className="min-w-0">
          <SolicitacaoAcoes
            session={session}
            solicitacao={solicitacao}
            viagens={viagens}
            abrirCancelamentoInicial={abrirCancelamentoInicial}
          />
        </aside>
      </div>
    </div>
  )
}
