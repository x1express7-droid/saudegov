import { assertModuleActive, getTenantContext } from '@saude/core-auth/server'
import { getGestaoTfdCentral } from '@saude/mod-saude-tfd'
import { Badge, PageHeader } from '@saude/ui'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { TfdDashboardOperacionalAtividade } from '../dashboard/components/tfd-dashboard-operacional-atividade'
import { TfdDashboardOperacionalKpis } from '../dashboard/components/tfd-dashboard-operacional-kpis'
import { GestaoAcoesRapidas } from './components/gestao-acoes-rapidas'
import { GestaoAlertasPanel } from './components/gestao-alertas-panel'
import { GestaoInbox } from './components/gestao-inbox'
import { GestaoRelacionamentos } from './components/gestao-relacionamentos'

export const metadata: Metadata = {
  title: 'Central de Gestão TFD',
}

export default async function GestaoTfdPage() {
  const tenant = await getTenantContext()
  if (!tenant.modules?.saude?.tfd) {
    notFound()
  }

  await assertModuleActive('saude', 'tfd')
  const dados = await getGestaoTfdCentral()

  return (
    <div className="flex flex-col gap-[var(--space-6)]">
      <PageHeader
        titulo="Central de Gestão TFD"
        subtitulo="Inbox priorizada, alertas operacionais e visão estratégica do módulo de Tratamento Fora de Domicílio."
        acoes={
          <div className="flex flex-wrap items-center gap-[var(--space-2)]">
            {dados.isGestorView ? (
              <Badge variant="purple" size="sm">
                Visão gestor
              </Badge>
            ) : (
              <Badge variant="blue" size="sm">
                Visão operacional
              </Badge>
            )}
            <Badge variant={dados.totalInbox > 0 ? 'orange' : 'green'} size="sm">
              {dados.totalInbox === 0
                ? 'Sem pendências'
                : dados.totalInbox === 1
                  ? '1 ação pendente'
                  : `${dados.totalInbox} ações pendentes`}
            </Badge>
          </div>
        }
      />

      <TfdDashboardOperacionalKpis kpis={dados.kpis} />

      <GestaoAcoesRapidas isGestorView={dados.isGestorView} />

      <GestaoInbox items={dados.inbox} inboxPorCategoria={dados.inboxPorCategoria} />

      <GestaoRelacionamentos />

      <GestaoAlertasPanel dados={dados} />

      <section className="flex flex-col gap-[var(--space-3)]">
        <h2 className="text-[length:var(--text-lg)] font-semibold text-[var(--color-text)]">
          Atividade recente
        </h2>
        <TfdDashboardOperacionalAtividade items={dados.atividadeRecente} />
      </section>
    </div>
  )
}
