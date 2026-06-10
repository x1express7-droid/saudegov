import {
  assertModuleActive,
  getTenantContext,
  hasPermission,
  requireTenantRole,
} from '@saude/core-auth/server'
import {
  getAgendamentosPorProcesso,
  getProcessoFinanceiroTfd,
  getProcessoTfdDetalhe,
  TFD_PERMISSIONS,
  type TfdProcessoDadosClinicosOutput,
} from '@saude/mod-saude-tfd'
import {
  PageHeader,
  ProtocoloBadge,
  UrgenciaBadge,
  type TfdUrgencia,
} from '@saude/ui'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { ProcessoStatusBadge } from '../../components/processo-status-badge'
import { ProcessoDetalheView } from './components/processo-detalhe-view'

interface ProcessoTfdDetalhePageProps {
  params: Promise<{ id: string }>
}

function isTfdUrgencia(value: string): value is TfdUrgencia {
  return value in { BAIXA: true, INTERMEDIARIA: true, GRAVE: true, MUITO_URGENTE: true }
}

function calcularUrgenciaMaisCritica(
  solicitacoes: Array<{ urgencia: string; status: string }>
): TfdUrgencia | null {
  const ativas = solicitacoes.filter(
    (s) => !['CONCLUIDO', 'NEGADO', 'CANCELADO'].includes(s.status)
  )
  if (ativas.length === 0) {
    return null
  }

  const rank: Record<string, number> = {
    MUITO_URGENTE: 4,
    GRAVE: 3,
    INTERMEDIARIA: 2,
    BAIXA: 1,
  }

  let maior: TfdUrgencia | null = null
  for (const item of ativas) {
    if (!isTfdUrgencia(item.urgencia)) {
      continue
    }
    if (!maior || (rank[item.urgencia] ?? 0) > (rank[maior] ?? 0)) {
      maior = item.urgencia
    }
  }
  return maior
}

export async function generateMetadata({ params }: ProcessoTfdDetalhePageProps): Promise<Metadata> {
  const { id } = await params
  const processo = await getProcessoTfdDetalhe(id)
  return {
    title: processo ? `Processo ${processo.protocolo}` : 'Processo TFD',
    description: processo ? `Detalhe do processo ${processo.protocolo}` : `Processo ${id}`,
  }
}

export default async function ProcessoTfdDetalhePage({ params }: ProcessoTfdDetalhePageProps) {
  const tenant = await getTenantContext()
  if (!tenant.modules?.saude?.tfd) {
    notFound()
  }

  await assertModuleActive('saude', 'tfd')
  const session = await requireTenantRole('SERVIDOR')

  const { id } = await params
  const processo = await getProcessoTfdDetalhe(id)

  if (!processo) {
    notFound()
  }

  const [agendamentos, financeiro] = await Promise.all([
    getAgendamentosPorProcesso(id),
    getProcessoFinanceiroTfd(id),
  ])

  const podeVerDadosClinicos =
    hasPermission(session, TFD_PERMISSIONS.REGISTRAR_DADOS_CLINICOS) ||
    hasPermission(session, TFD_PERMISSIONS.ANALISAR_LAUDO)

  const dadosClinicos: TfdProcessoDadosClinicosOutput | null = podeVerDadosClinicos
    ? {
        processoId: processo.id,
        subjetivo: processo.dadosClinicos.subjetivo,
        objetivo: processo.dadosClinicos.objetivo,
        avaliacao: processo.dadosClinicos.avaliacao,
        plano: processo.dadosClinicos.plano,
        motivoQuadro: processo.dadosClinicos.motivoQuadro,
        observacao: processo.dadosClinicos.observacao,
        registradoPorNome: processo.dadosClinicos.registradoPorNome,
        updatedAt: processo.dadosClinicos.updatedAt,
      }
    : null

  const urgenciaMaisCritica = calcularUrgenciaMaisCritica(processo.solicitacoes)

  return (
    <div className="flex flex-col gap-[var(--space-6)]">
      <PageHeader
        titulo={processo.protocolo}
        subtitulo="Perfil do processo de Tratamento Fora de Domicílio."
        breadcrumbs={[
          { label: 'Processos TFD', href: '/saude/tfd/processos' },
          { label: processo.protocolo },
        ]}
        acoes={
          <div className="flex flex-wrap items-center gap-[var(--space-2)]">
            <ProtocoloBadge protocolo={processo.protocolo} />
            <ProcessoStatusBadge status={processo.status} />
            {urgenciaMaisCritica ? (
              <UrgenciaBadge urgencia={urgenciaMaisCritica} />
            ) : null}
            <Link
              href="/saude/tfd/processos"
              className="text-[length:var(--text-sm)] font-medium text-[var(--color-primary)] hover:underline"
            >
              Voltar à lista
            </Link>
          </div>
        }
      />

      <ProcessoDetalheView
        session={session}
        processo={processo}
        agendamentos={agendamentos}
        financeiro={financeiro}
        dadosClinicos={dadosClinicos}
        podeVerDadosClinicos={podeVerDadosClinicos}
      />
    </div>
  )
}
