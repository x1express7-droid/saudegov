'use client'

import { exportarSolicitacoesTfdCsv } from '@saude/mod-saude-tfd/actions/exportacao'
import type { TfdDashboardOutput } from '@saude/mod-saude-tfd/client'
import { Badge, Card, Select, TFD_STATUS_CONFIG, TFD_URGENCIA_CONFIG, type TfdStatus, type TfdUrgencia } from '@saude/ui'
import { Clock, FileText } from 'lucide-react'
import { useMemo, useState } from 'react'

import { RelatorioBarraHorizontal } from '../../components/relatorio-barra-horizontal'
import { barClassFromBadgeColor } from '../../components/relatorio-cores-barra'
import { RelatorioExportCsvButton } from '../../components/relatorio-export-buttons'
import { RelatorioItemRow } from '../../components/relatorio-item-row'
import { RelatorioSectionCard } from '../../components/relatorio-section-card'
import { RelatorioVoltarLink } from '../../components/relatorio-voltar-link'
import {
  RELATORIO_FILTRO_TODOS,
  STATUS_SOLICITACAO_OPTIONS,
  URGENCIA_OPTIONS,
} from '../../components/relatorio-helpers'
import {
  compactSelectClassName,
  useRelatorioExport,
} from '../../components/use-relatorio-export'

// BLOCO-13-RELATORIOS
interface RelatorioSolicitacoesViewProps {
  dashboard: TfdDashboardOutput
}

function countFromStatus(porStatus: Record<string, number>, keys: string[]): number {
  return keys.reduce((acc, key) => acc + (porStatus[key] ?? 0), 0)
}

const STATUS_ORDER: TfdStatus[] = [
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
  'RASCUNHO',
]

const URGENCIA_ORDER: TfdUrgencia[] = [
  'NAO_AGUDA',
  'BAIXA',
  'INTERMEDIARIA',
  'GRAVE',
  'MUITO_URGENTE',
]

interface KpiCardProps {
  titulo: string
  valor: number
  subtexto?: string
  badge?: { label: string; variant: 'green' | 'yellow' | 'red' }
}

function KpiCard({ titulo, valor, subtexto, badge }: KpiCardProps) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-[var(--space-2)]">
        <div className="min-w-0 flex-1">
          <p className="text-[length:var(--text-sm)] font-medium text-[var(--color-text-muted)]">
            {titulo}
          </p>
          <p className="mt-[var(--space-2)] text-[length:var(--text-2xl)] font-bold tabular-nums text-[var(--color-text)]">
            {valor.toLocaleString('pt-BR')}
          </p>
          {subtexto ? (
            <p className="mt-[var(--space-1)] text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
              {subtexto}
            </p>
          ) : null}
        </div>
        {badge ? <Badge variant={badge.variant}>{badge.label}</Badge> : null}
      </div>
      <p className="mt-[var(--space-3)] text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
        Mês corrente
      </p>
    </Card>
  )
}

export function RelatorioSolicitacoesView({ dashboard }: RelatorioSolicitacoesViewProps) {
  const { porStatus, porUrgencia, totalSolicitacoes, tempoMedioAprovacaoDias } = dashboard
  const { loadingKey, erros, exportar } = useRelatorioExport()

  const [statusSolicitacao, setStatusSolicitacao] = useState(RELATORIO_FILTRO_TODOS)
  const [urgenciaSolicitacao, setUrgenciaSolicitacao] = useState(RELATORIO_FILTRO_TODOS)

  const aprovadas = porStatus.APROVADO ?? 0
  const emAnalise = countFromStatus(porStatus, ['ENVIADO', 'EM_ANALISE', 'PENDENTE'])
  const negadasCanceladas = (porStatus.NEGADO ?? 0) + (porStatus.CANCELADO ?? 0)

  const statusBars = useMemo(
    () =>
      STATUS_ORDER.map((status) => ({
        key: status,
        label: TFD_STATUS_CONFIG[status].label,
        count: porStatus[status] ?? 0,
        barClassName: barClassFromBadgeColor(TFD_STATUS_CONFIG[status].color),
      })),
    [porStatus]
  )

  const urgenciaBars = useMemo(
    () =>
      URGENCIA_ORDER.map((urgencia) => ({
        key: urgencia,
        label: TFD_URGENCIA_CONFIG[urgencia].label,
        count: porUrgencia[urgencia] ?? 0,
        barClassName: barClassFromBadgeColor(TFD_URGENCIA_CONFIG[urgencia].color),
      })),
    [porUrgencia]
  )

  return (
    <div className="flex flex-col gap-[var(--space-6)]">
      <RelatorioVoltarLink />

      <section className="flex flex-col gap-[var(--space-4)]">
        <h2 className="text-[length:var(--text-base)] font-semibold text-[var(--color-text)]">
          KPIs do mês
        </h2>
        <div className="grid gap-[var(--space-4)] sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard titulo="Total no mês" valor={totalSolicitacoes} subtexto="Exceto rascunhos" />
          <KpiCard
            titulo="Aprovadas"
            valor={aprovadas}
            badge={{ label: 'Aprovado', variant: 'green' }}
          />
          <KpiCard
            titulo="Em análise"
            valor={emAnalise}
            badge={{ label: 'Em análise', variant: 'yellow' }}
          />
          <KpiCard
            titulo="Negadas / Canceladas"
            valor={negadasCanceladas}
            badge={{ label: 'Encerradas', variant: 'red' }}
          />
        </div>
      </section>

      <RelatorioBarraHorizontal
        titulo="Distribuição por status — mês corrente"
        items={statusBars}
        emptyTitulo="Nenhuma solicitação no mês corrente"
      />

      <RelatorioBarraHorizontal
        titulo="Distribuição por urgência — mês corrente"
        items={urgenciaBars}
        emptyTitulo="Nenhuma solicitação no mês corrente"
      />

      <Card>
        <div className="flex items-start gap-[var(--space-3)]">
          <Clock className="mt-1 size-6 shrink-0 text-[var(--color-primary)]" aria-hidden="true" />
          <div>
            <p className="text-[length:var(--text-sm)] font-medium text-[var(--color-text-muted)]">
              Tempo médio de aprovação
            </p>
            <p className="mt-[var(--space-2)] text-[length:var(--text-3xl)] font-bold tabular-nums text-[var(--color-text)]">
              {tempoMedioAprovacaoDias}{' '}
              <span className="text-[length:var(--text-lg)] font-semibold text-[var(--color-text-muted)]">
                dias (histórico completo)
              </span>
            </p>
            <p className="mt-[var(--space-2)] text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
              Calculado sobre todas as solicitações aprovadas desde o início do uso do sistema.
            </p>
          </div>
        </div>
      </Card>

      <RelatorioSectionCard titulo="Exportar dados" icon={FileText}>
        <RelatorioItemRow
          showDivider={false}
          titulo="Lista de solicitações (CSV)"
          descricao="Exporta solicitações com status, urgência, especialidade e datas."
          filtros={
            <>
              <Select
                id="painel-solicitacao-status"
                options={[...STATUS_SOLICITACAO_OPTIONS]}
                value={statusSolicitacao}
                onValueChange={setStatusSolicitacao}
                disabled={loadingKey === 'solicitacoes-csv'}
                className={compactSelectClassName()}
              />
              <Select
                id="painel-solicitacao-urgencia"
                options={[...URGENCIA_OPTIONS]}
                value={urgenciaSolicitacao}
                onValueChange={setUrgenciaSolicitacao}
                disabled={loadingKey === 'solicitacoes-csv'}
                className={compactSelectClassName()}
              />
            </>
          }
          acao={
            <RelatorioExportCsvButton
              loading={loadingKey === 'solicitacoes-csv'}
              onClick={() =>
                void exportar('solicitacoes-csv', () =>
                  exportarSolicitacoesTfdCsv({
                    ...(statusSolicitacao !== RELATORIO_FILTRO_TODOS
                      ? { status: statusSolicitacao }
                      : {}),
                    ...(urgenciaSolicitacao !== RELATORIO_FILTRO_TODOS
                      ? { urgencia: urgenciaSolicitacao }
                      : {}),
                  })
                )
              }
            />
          }
          erro={erros['solicitacoes-csv']}
        />
      </RelatorioSectionCard>
    </div>
  )
}
