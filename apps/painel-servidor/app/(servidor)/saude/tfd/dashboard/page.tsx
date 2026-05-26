import {
  assertModuleActive,
  getTenantContext,
  hasPermission,
  requireTenantRole,
} from '@saude/core-auth/server'
import {
  getAlertasLembreteViagemTfd,
  getAlertasPendente30Dias,
  getAlertasPendente60Dias,
  getAlertasPrestacaoTfd,
  getAlertasUrgentesTfd,
  getDashboardFinanceiroTfd,
  getDashboardTfd,
  getMotoristasRelatorioOpcoesTfd,
  getPrestadoresRelatorioOpcoesTfd,
  getSolicitacoesTfd,
  TFD_PERMISSIONS,
} from '@saude/mod-saude-tfd'
import { PageHeader } from '@saude/ui'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'

import { TfdDashboardAlertas } from './components/tfd-dashboard-alertas'
import { TfdDashboardFinanceiro } from './components/tfd-dashboard-financeiro'
import { TfdDashboardGraficoStatus } from './components/tfd-dashboard-grafico-status'
import { TfdDashboardKpis } from './components/tfd-dashboard-kpis'
import { TfdDashboardOperacional } from './components/tfd-dashboard-operacional'
import { TfdDashboardUltimasSolicitacoes } from './components/tfd-dashboard-ultimas-solicitacoes'
import { TfdRelatoriosPanel } from './components/tfd-relatorios-panel'

export const metadata: Metadata = {
  title: 'Dashboard TFD',
}

async function GestorDashboard() {
  const session = await requireTenantRole('GESTOR')

  const [
    dashboard,
    financeiro,
    alertasUrgentes,
    alertasPrestacao,
    alertasPendente30,
    alertasPendente60,
    alertasLembreteViagem,
    listagem,
    prestadoresOpcoes,
    motoristasOpcoes,
  ] = await Promise.all([
    getDashboardTfd(),
    getDashboardFinanceiroTfd(),
    getAlertasUrgentesTfd(),
    getAlertasPrestacaoTfd(),
    getAlertasPendente30Dias(),
    getAlertasPendente60Dias(),
    getAlertasLembreteViagemTfd(),
    getSolicitacoesTfd({ page: 1, perPage: 10 }),
    getPrestadoresRelatorioOpcoesTfd(),
    getMotoristasRelatorioOpcoesTfd(),
  ])

  return (
    <div className="flex flex-col gap-[var(--space-6)]">
      <PageHeader
        titulo="Dashboard TFD"
        subtitulo="Visão operacional do mês corrente, alertas consolidados e últimas solicitações."
        acoes={
          <Link
            href="/saude/tfd"
            className="text-[length:var(--text-sm)] font-medium text-[var(--color-primary)] underline-offset-2 hover:underline"
          >
            Ir para a fila
          </Link>
        }
      />

      <TfdDashboardKpis porStatus={dashboard.porStatus} totalSolicitacoes={dashboard.totalSolicitacoes} />

      <TfdDashboardFinanceiro financeiro={financeiro} />

      <div className="grid gap-[var(--space-6)] lg:grid-cols-2">
        <TfdDashboardGraficoStatus porStatus={dashboard.porStatus} />
        <TfdDashboardAlertas
          alertasUrgentes={alertasUrgentes}
          saldosBaixo={[]}
          alertasPrestacao={alertasPrestacao}
          alertasPendente30={alertasPendente30}
          alertasPendente60={alertasPendente60}
          alertasLembreteViagem={alertasLembreteViagem}
        />
      </div>

      <section className="flex flex-col gap-[var(--space-3)]">
        <div className="flex flex-wrap items-baseline justify-between gap-[var(--space-2)]">
          <h2 className="text-[length:var(--text-lg)] font-semibold text-[var(--color-text)]">
            Últimas solicitações
          </h2>
          <p className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
            Tempo médio de aprovação: {dashboard.tempoMedioAprovacaoDias} dias · PCs pendentes:{' '}
            {dashboard.prestacoesPendentes} · Viagens (7 dias): {dashboard.viagensProximos7Dias}
          </p>
        </div>
        <TfdDashboardUltimasSolicitacoes items={listagem.items} />
      </section>

      <TfdRelatoriosPanel
        session={session}
        prestadoresOpcoes={prestadoresOpcoes}
        motoristasOpcoes={motoristasOpcoes}
      />
    </div>
  )
}

export default async function TfdDashboardPage() {
  const tenant = await getTenantContext()
  if (!tenant.modules?.saude?.tfd) {
    notFound()
  }

  await assertModuleActive('saude', 'tfd')
  const session = await requireTenantRole('SERVIDOR')

  const isGestorDashboard =
    hasPermission(session, TFD_PERMISSIONS.VER_DASHBOARD) &&
    (session.user.role === 'GESTOR' || session.user.role === 'ADMIN')

  if (isGestorDashboard) {
    return <GestorDashboard />
  }

  return <TfdDashboardOperacional />
}
