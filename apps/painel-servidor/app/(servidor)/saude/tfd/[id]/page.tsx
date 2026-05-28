import {
  assertModuleActive,
  getTenantContext,
  hasPermission,
  requireTenantRole,
} from '@saude/core-auth/server'
import {
  getContextoDecisaoTfd,
  getDadosClinicosProcesso,
  getSaldosTfd,
  getSolicitacaoTfd,
  getVeiculosAgendamentoTfd,
  getViagensSolicitacaoTfd,
  TFD_PERMISSIONS,
  type ContextoDecisaoTfd,
  type SaldoListItem,
  type TfdProcessoDadosClinicosOutput,
  type TfdVeiculoAgendamentoItem,
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

async function loadSaldosParaDecisao(
  status: string,
  canLoadSaldos: boolean
): Promise<SaldoListItem[]> {
  if (status !== 'EM_ANALISE' || !canLoadSaldos) {
    return []
  }

  try {
    return await getSaldosTfd()
  } catch {
    return []
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

  const canLoadSaldos =
    hasPermission(session, TFD_PERMISSIONS.GERENCIAR_SALDO) ||
    session.user.role === 'ADMIN' ||
    session.user.role === 'SUPERADMIN'

  const saldosAtivos = await loadSaldosParaDecisao(solicitacao.status, canLoadSaldos)

  let contextoDecisao: ContextoDecisaoTfd | null = null
  if (
    solicitacao.status === 'EM_ANALISE' &&
    hasPermission(session, TFD_PERMISSIONS.DECIDIR_SOLICITACAO)
  ) {
    try {
      contextoDecisao = await getContextoDecisaoTfd(id)
    } catch {
      contextoDecisao = null
    }
  }

  const statusAgendavel =
    solicitacao.status === 'APROVADO' || solicitacao.status === 'AGENDADO'

  const statusComViagens =
    statusAgendavel ||
    solicitacao.status === 'EM_VIAGEM' ||
    solicitacao.status === 'AGUARDANDO_PC' ||
    solicitacao.status === 'PC_EM_ANALISE' ||
    solicitacao.status === 'CONCLUIDO'

  let viagens: TfdViagemSolicitacaoItem[] = []
  let veiculosAgendamento: TfdVeiculoAgendamentoItem[] = []

  if (statusComViagens) {
    const acompanhanteNecessario = solicitacao.acompanhante !== null
    const viagensPromise = getViagensSolicitacaoTfd(id)
    const veiculosPromise = statusAgendavel
      ? getVeiculosAgendamentoTfd(acompanhanteNecessario)
      : Promise.resolve([] as TfdVeiculoAgendamentoItem[])

    ;[viagens, veiculosAgendamento] = await Promise.all([viagensPromise, veiculosPromise])
  }

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
            saldosAtivos={saldosAtivos}
            canLoadSaldos={canLoadSaldos}
            contextoDecisao={contextoDecisao}
            veiculosAgendamento={veiculosAgendamento}
            viagens={viagens}
            abrirCancelamentoInicial={abrirCancelamentoInicial}
          />
        </aside>
      </div>
    </div>
  )
}
