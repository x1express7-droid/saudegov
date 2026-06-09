'use client'

import { exportarAgendamentosTfdCsv } from '@saude/mod-saude-tfd/actions/exportacao'
import type { TfdAgendamentoConsultaListItem } from '@saude/mod-saude-tfd/client'
import { Card, Input, Select } from '@saude/ui'
import { ArrowRight, Calendar } from 'lucide-react'
import Link from 'next/link'
import { useMemo, useState } from 'react'

import { AgendamentoStatusBadge } from '../../../components/agendamento-status-badge'
import {
  formatDataHoraAgendamento,
  labelPrestadorNome,
  labelTipoAtendimento,
} from '../../../agendamentos/components/agendamento-lista-utils'
import { RelatorioBarraHorizontal } from '../../components/relatorio-barra-horizontal'
import { RelatorioExportCsvButton } from '../../components/relatorio-export-buttons'
import { RelatorioItemRow } from '../../components/relatorio-item-row'
import { RelatorioSectionCard } from '../../components/relatorio-section-card'
import { RelatorioVoltarLink } from '../../components/relatorio-voltar-link'
import {
  AGENDAMENTO_STATUS_OPTIONS,
  defaultPeriodoMesAtual,
  RELATORIO_FILTRO_TODOS,
  TIPO_ATENDIMENTO_BAR_COLORS,
  TIPO_ATENDIMENTO_ORDER,
} from '../../components/relatorio-helpers'
import {
  compactDateInputClassName,
  compactSelectClassName,
  useRelatorioExport,
} from '../../components/use-relatorio-export'

// BLOCO-13-RELATORIOS
// TODO: substituir por query de agregação quando disponível
interface RelatorioAgendamentosViewProps {
  agendamentos: TfdAgendamentoConsultaListItem[]
  totalAgendamentos: number
}

function parseDataConsultaUtc(dataConsulta: string): Date {
  const [year, month, day] = dataConsulta.split('-').map(Number) as [number, number, number]
  return new Date(Date.UTC(year, month - 1, day))
}

function hojeUtcDate(): Date {
  const now = new Date()
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()))
}

function addDaysUtc(base: Date, days: number): Date {
  const result = new Date(base)
  result.setUTCDate(result.getUTCDate() + days)
  return result
}

export function RelatorioAgendamentosView({
  agendamentos,
  totalAgendamentos,
}: RelatorioAgendamentosViewProps) {
  const { loadingKey, erros, exportar } = useRelatorioExport()
  const periodoInicial = useMemo(() => defaultPeriodoMesAtual(), [])

  const [statusExport, setStatusExport] = useState(RELATORIO_FILTRO_TODOS)
  const [dataInicio, setDataInicio] = useState(periodoInicial.dataInicio)
  const [dataFim, setDataFim] = useState(periodoInicial.dataFim)

  const kpis = useMemo(() => {
    const agendados = agendamentos.filter((item) => item.status === 'AGENDADO').length
    const realizados = agendamentos.filter((item) => item.status === 'REALIZADO').length
    const cancelados = agendamentos.filter((item) => item.status === 'CANCELADO').length

    return { agendados, realizados, cancelados }
  }, [agendamentos])

  const tipoBars = useMemo(() => {
    const counts = agendamentos.reduce<Record<string, number>>((acc, item) => {
      acc[item.tipoAtendimento] = (acc[item.tipoAtendimento] ?? 0) + 1
      return acc
    }, {})

    return TIPO_ATENDIMENTO_ORDER.map((tipo) => ({
      key: tipo,
      label: labelTipoAtendimento(tipo),
      count: counts[tipo] ?? 0,
      barClassName: TIPO_ATENDIMENTO_BAR_COLORS[tipo] ?? 'bg-[var(--color-text-muted)]',
    }))
  }, [agendamentos])

  const proximosAgendamentos = useMemo(() => {
    const hoje = hojeUtcDate()
    const fimJanela = addDaysUtc(hoje, 7)

    return agendamentos
      .filter((item) => {
        const data = parseDataConsultaUtc(item.dataConsulta)
        return data >= hoje && data <= fimJanela
      })
      .sort((a, b) => a.dataConsulta.localeCompare(b.dataConsulta))
  }, [agendamentos])

  const proximosExibidos = proximosAgendamentos.slice(0, 10)
  const temMaisProximos = proximosAgendamentos.length > 10

  return (
    <div className="flex flex-col gap-[var(--space-6)]">
      <RelatorioVoltarLink />

      <section className="flex flex-col gap-[var(--space-4)]">
        <h2 className="text-[length:var(--text-base)] font-semibold text-[var(--color-text)]">
          Indicadores de agendamentos
        </h2>
        <div className="grid gap-[var(--space-4)] sm:grid-cols-2 xl:grid-cols-4">
          <Card>
            <p className="text-[length:var(--text-sm)] font-medium text-[var(--color-text-muted)]">
              Total de agendamentos
            </p>
            <p className="mt-[var(--space-2)] text-[length:var(--text-2xl)] font-bold tabular-nums text-[var(--color-text)]">
              {totalAgendamentos.toLocaleString('pt-BR')}
            </p>
            <p className="mt-[var(--space-3)] text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
              Baseado nas últimas 100 consultas carregadas
            </p>
          </Card>
          <Card>
            <p className="text-[length:var(--text-sm)] font-medium text-[var(--color-text-muted)]">
              Agendados
            </p>
            <p className="mt-[var(--space-2)] text-[length:var(--text-2xl)] font-bold tabular-nums text-[var(--color-text)]">
              {kpis.agendados.toLocaleString('pt-BR')}
            </p>
            <p className="mt-[var(--space-3)] text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
              Baseado nas últimas 100 consultas carregadas
            </p>
          </Card>
          <Card>
            <p className="text-[length:var(--text-sm)] font-medium text-[var(--color-text-muted)]">
              Realizados
            </p>
            <p className="mt-[var(--space-2)] text-[length:var(--text-2xl)] font-bold tabular-nums text-[var(--color-text)]">
              {kpis.realizados.toLocaleString('pt-BR')}
            </p>
            <p className="mt-[var(--space-3)] text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
              Baseado nas últimas 100 consultas carregadas
            </p>
          </Card>
          <Card>
            <p className="text-[length:var(--text-sm)] font-medium text-[var(--color-text-muted)]">
              Cancelados
            </p>
            <p className="mt-[var(--space-2)] text-[length:var(--text-2xl)] font-bold tabular-nums text-[var(--color-text)]">
              {kpis.cancelados.toLocaleString('pt-BR')}
            </p>
            <p className="mt-[var(--space-3)] text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
              Baseado nas últimas 100 consultas carregadas
            </p>
          </Card>
        </div>
      </section>

      <RelatorioBarraHorizontal
        titulo="Distribuição por tipo de atendimento"
        items={tipoBars}
        emptyTitulo="Nenhum agendamento carregado"
      />

      <Card
        header={
          <div className="flex flex-wrap items-center justify-between gap-[var(--space-2)]">
            <h2 className="text-[length:var(--text-base)] font-semibold text-[var(--color-text)]">
              Próximos agendamentos (7 dias)
            </h2>
            {temMaisProximos ? (
              <Link
                href="/saude/tfd/agendamentos"
                className="inline-flex items-center gap-1 text-[length:var(--text-sm)] font-medium text-[var(--color-primary)] underline-offset-2 hover:underline"
              >
                Ver todos
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            ) : null}
          </div>
        }
      >
        {proximosExibidos.length === 0 ? (
          <p className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
            Nenhum agendamento nos próximos 7 dias entre os registros carregados.
          </p>
        ) : (
          <ul className="flex flex-col gap-[var(--space-2)]" role="list">
            {proximosExibidos.map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-center gap-[var(--space-2)] border-b border-[var(--color-border)] py-[var(--space-2)] text-[length:var(--text-sm)] last:border-b-0"
              >
                <span className="font-mono text-[var(--color-text-muted)]">{item.protocolo}</span>
                <span className="min-w-[6rem] text-[var(--color-text)]">{item.pacienteNome}</span>
                <span className="text-[var(--color-text-muted)]">
                  {formatDataHoraAgendamento(item.dataConsulta, item.horaConsulta)}
                </span>
                <span className="min-w-0 flex-1 truncate text-[var(--color-text)]">
                  {labelPrestadorNome(item)}
                </span>
                <AgendamentoStatusBadge status={item.status} size="sm" />
              </li>
            ))}
          </ul>
        )}
      </Card>

      <RelatorioSectionCard titulo="Exportar dados" icon={Calendar}>
        <RelatorioItemRow
          showDivider={false}
          titulo="Lista de agendamentos (CSV)"
          descricao="Agendamentos com data, paciente, prestador, motorista, veículo e status."
          filtros={
            <>
              <Select
                id="painel-agendamento-status"
                options={[...AGENDAMENTO_STATUS_OPTIONS]}
                value={statusExport}
                onValueChange={setStatusExport}
                disabled={loadingKey === 'agendamentos-csv'}
                className={compactSelectClassName()}
              />
              <Input
                id="painel-agendamento-inicio"
                type="date"
                value={dataInicio}
                onChange={(event) => setDataInicio(event.target.value)}
                disabled={loadingKey === 'agendamentos-csv'}
                className={compactDateInputClassName()}
                aria-label="Data início"
              />
              <Input
                id="painel-agendamento-fim"
                type="date"
                value={dataFim}
                onChange={(event) => setDataFim(event.target.value)}
                disabled={loadingKey === 'agendamentos-csv'}
                className={compactDateInputClassName()}
                aria-label="Data fim"
              />
            </>
          }
          acao={
            <RelatorioExportCsvButton
              loading={loadingKey === 'agendamentos-csv'}
              onClick={() =>
                void exportar('agendamentos-csv', () =>
                  exportarAgendamentosTfdCsv({
                    ...(dataInicio ? { dataInicio } : {}),
                    ...(dataFim ? { dataFim } : {}),
                  })
                )
              }
            />
          }
          erro={erros['agendamentos-csv']}
        />
      </RelatorioSectionCard>
    </div>
  )
}
