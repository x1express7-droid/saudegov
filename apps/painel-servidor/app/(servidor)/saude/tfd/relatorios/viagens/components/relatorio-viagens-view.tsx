'use client'

import { gerarRelatorioMotoristaTfd, gerarRelatorioPrestadorTfd } from '@saude/mod-saude-tfd/actions/relatorio'
import type { RelatorioSelectOption } from '@saude/mod-saude-tfd/client'
import type { ViagemTfdListItem } from '@saude/mod-saude-tfd/client'
import { Card, Input, Select } from '@saude/ui'
import { Bus } from 'lucide-react'
import { useMemo, useState } from 'react'

import { VIAGEM_STATUS_CONFIG, type ViagemStatusValue } from '../../../components/viagem-status-badge'
import { RelatorioBarraHorizontal } from '../../components/relatorio-barra-horizontal'
import { barClassFromBadgeColor } from '../../components/relatorio-cores-barra'
import { RelatorioExportPdfButton } from '../../components/relatorio-export-buttons'
import { RelatorioItemRow } from '../../components/relatorio-item-row'
import { RelatorioSectionCard } from '../../components/relatorio-section-card'
import { RelatorioVoltarLink } from '../../components/relatorio-voltar-link'
import {
  defaultPeriodoMesAtual,
  RELATORIO_FILTRO_TODOS,
} from '../../components/relatorio-helpers'
import {
  compactDateInputClassName,
  compactSelectClassName,
  useRelatorioExport,
} from '../../components/use-relatorio-export'

// BLOCO-13-RELATORIOS
// TODO: substituir por query de agregação quando disponível
interface RelatorioViagensViewProps {
  viagens: ViagemTfdListItem[]
  viagensProximos7Dias: number
  prestadoresOpcoes: RelatorioSelectOption[]
  motoristasOpcoes: RelatorioSelectOption[]
}

const VIAGEM_STATUS_ORDER: ViagemStatusValue[] = [
  'PLANEJADA',
  'CONFIRMADA',
  'EM_ANDAMENTO',
  'CONCLUIDA',
  'CANCELADA',
]

export function RelatorioViagensView({
  viagens,
  viagensProximos7Dias,
  prestadoresOpcoes,
  motoristasOpcoes,
}: RelatorioViagensViewProps) {
  const { loadingKey, erros, exportar } = useRelatorioExport()
  const periodoInicial = useMemo(() => defaultPeriodoMesAtual(), [])

  const [dataInicioMotorista, setDataInicioMotorista] = useState(periodoInicial.dataInicio)
  const [dataFimMotorista, setDataFimMotorista] = useState(periodoInicial.dataFim)
  const [motoristaId, setMotoristaId] = useState(RELATORIO_FILTRO_TODOS)

  const [dataInicioPrestador, setDataInicioPrestador] = useState(periodoInicial.dataInicio)
  const [dataFimPrestador, setDataFimPrestador] = useState(periodoInicial.dataFim)
  const [prestadorId, setPrestadorId] = useState(RELATORIO_FILTRO_TODOS)

  const kpis = useMemo(() => {
    const concluidas = viagens.filter((viagem) => viagem.status === 'CONCLUIDA')
    const passageiros = concluidas.reduce((acc, viagem) => acc + viagem.totalPassageiros, 0)

    const ocupacoes = viagens
      .filter((viagem) => viagem.capacidadeVeiculo != null && viagem.capacidadeVeiculo > 0)
      .map((viagem) => (viagem.totalPassageiros / viagem.capacidadeVeiculo!) * 100)

    const ocupacaoMedia =
      ocupacoes.length > 0
        ? (ocupacoes.reduce((acc, value) => acc + value, 0) / ocupacoes.length).toFixed(1)
        : null

    return {
      viagensRealizadas: concluidas.length,
      passageiros,
      ocupacaoMedia,
    }
  }, [viagens])

  const statusBars = useMemo(() => {
    const counts = viagens.reduce<Record<string, number>>((acc, viagem) => {
      acc[viagem.status] = (acc[viagem.status] ?? 0) + 1
      return acc
    }, {})

    return VIAGEM_STATUS_ORDER.map((status) => ({
      key: status,
      label: VIAGEM_STATUS_CONFIG[status].label,
      count: counts[status] ?? 0,
      barClassName: barClassFromBadgeColor(VIAGEM_STATUS_CONFIG[status].color),
    }))
  }, [viagens])

  const prestadorSelectOptions = useMemo(
    () => [
      { value: RELATORIO_FILTRO_TODOS, label: 'Prestador: todos' },
      ...prestadoresOpcoes.map((item) => ({ value: item.id, label: item.nome })),
    ],
    [prestadoresOpcoes]
  )

  const motoristaSelectOptions = useMemo(
    () => [
      { value: RELATORIO_FILTRO_TODOS, label: 'Motorista: todos' },
      ...motoristasOpcoes.map((item) => ({ value: item.id, label: item.nome })),
    ],
    [motoristasOpcoes]
  )

  return (
    <div className="flex flex-col gap-[var(--space-6)]">
      <RelatorioVoltarLink />

      <section className="flex flex-col gap-[var(--space-4)]">
        <h2 className="text-[length:var(--text-base)] font-semibold text-[var(--color-text)]">
          Indicadores de viagens
        </h2>
        <div className="grid gap-[var(--space-4)] sm:grid-cols-2 xl:grid-cols-4">
          <Card>
            <p className="text-[length:var(--text-sm)] font-medium text-[var(--color-text-muted)]">
              Viagens realizadas
            </p>
            <p className="mt-[var(--space-2)] text-[length:var(--text-2xl)] font-bold tabular-nums text-[var(--color-text)]">
              {kpis.viagensRealizadas.toLocaleString('pt-BR')}
            </p>
            <p className="mt-[var(--space-3)] text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
              Baseado nas últimas 100 viagens carregadas
            </p>
          </Card>
          <Card>
            <p className="text-[length:var(--text-sm)] font-medium text-[var(--color-text-muted)]">
              Passageiros transportados
            </p>
            <p className="mt-[var(--space-2)] text-[length:var(--text-2xl)] font-bold tabular-nums text-[var(--color-text)]">
              {kpis.passageiros.toLocaleString('pt-BR')}
            </p>
            <p className="mt-[var(--space-3)] text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
              Baseado nas últimas 100 viagens carregadas
            </p>
          </Card>
          <Card>
            <p className="text-[length:var(--text-sm)] font-medium text-[var(--color-text-muted)]">
              Ocupação média
            </p>
            <p className="mt-[var(--space-2)] text-[length:var(--text-2xl)] font-bold tabular-nums text-[var(--color-text)]">
              {kpis.ocupacaoMedia != null ? `${kpis.ocupacaoMedia}%` : '—'}
            </p>
            <p className="mt-[var(--space-3)] text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
              Baseado nas últimas 100 viagens carregadas
            </p>
          </Card>
          <Card>
            <p className="text-[length:var(--text-sm)] font-medium text-[var(--color-text-muted)]">
              Viagens próximos 7 dias
            </p>
            <p className="mt-[var(--space-2)] text-[length:var(--text-2xl)] font-bold tabular-nums text-[var(--color-text)]">
              {viagensProximos7Dias.toLocaleString('pt-BR')}
            </p>
            <p className="mt-[var(--space-3)] text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
              Viagens legadas agendadas (dashboard)
            </p>
          </Card>
        </div>
      </section>

      <RelatorioBarraHorizontal
        titulo="Distribuição por status"
        items={statusBars}
        emptyTitulo="Nenhuma viagem carregada"
        emptyDescricao="As viagens recentes aparecerão aqui quando houver registros."
      />

      <RelatorioSectionCard titulo="Relatórios por motorista e prestador" icon={Bus}>
        <RelatorioItemRow
          showDivider={false}
          titulo="Relatório por motorista (PDF)"
          descricao="Viagens e custos por motorista no período."
          filtros={
            <>
              <Select
                id="painel-motorista-id"
                options={motoristaSelectOptions}
                value={motoristaId}
                onValueChange={setMotoristaId}
                disabled={loadingKey === 'motorista-pdf'}
                className={compactSelectClassName()}
              />
              <Input
                id="painel-motorista-inicio"
                type="date"
                value={dataInicioMotorista}
                onChange={(event) => setDataInicioMotorista(event.target.value)}
                disabled={loadingKey === 'motorista-pdf'}
                className={compactDateInputClassName()}
                aria-label="Data início"
              />
              <Input
                id="painel-motorista-fim"
                type="date"
                value={dataFimMotorista}
                onChange={(event) => setDataFimMotorista(event.target.value)}
                disabled={loadingKey === 'motorista-pdf'}
                className={compactDateInputClassName()}
                aria-label="Data fim"
              />
            </>
          }
          acao={
            <RelatorioExportPdfButton
              loading={loadingKey === 'motorista-pdf'}
              disabled={!dataInicioMotorista || !dataFimMotorista}
              onClick={() =>
                void exportar('motorista-pdf', () =>
                  gerarRelatorioMotoristaTfd({
                    dataInicio: dataInicioMotorista,
                    dataFim: dataFimMotorista,
                    ...(motoristaId !== RELATORIO_FILTRO_TODOS ? { motoristaId } : {}),
                  })
                )
              }
            />
          }
          erro={erros['motorista-pdf']}
        />

        <RelatorioItemRow
          titulo="Relatório por prestador (PDF)"
          descricao="Volume e gastos no período por prestador de destino."
          filtros={
            <>
              <Select
                id="painel-prestador-id"
                options={prestadorSelectOptions}
                value={prestadorId}
                onValueChange={setPrestadorId}
                disabled={loadingKey === 'prestador-pdf'}
                className={compactSelectClassName()}
              />
              <Input
                id="painel-prestador-inicio"
                type="date"
                value={dataInicioPrestador}
                onChange={(event) => setDataInicioPrestador(event.target.value)}
                disabled={loadingKey === 'prestador-pdf'}
                className={compactDateInputClassName()}
                aria-label="Data início"
              />
              <Input
                id="painel-prestador-fim"
                type="date"
                value={dataFimPrestador}
                onChange={(event) => setDataFimPrestador(event.target.value)}
                disabled={loadingKey === 'prestador-pdf'}
                className={compactDateInputClassName()}
                aria-label="Data fim"
              />
            </>
          }
          acao={
            <RelatorioExportPdfButton
              loading={loadingKey === 'prestador-pdf'}
              disabled={!dataInicioPrestador || !dataFimPrestador}
              onClick={() =>
                void exportar('prestador-pdf', () =>
                  gerarRelatorioPrestadorTfd({
                    dataInicio: dataInicioPrestador,
                    dataFim: dataFimPrestador,
                    ...(prestadorId !== RELATORIO_FILTRO_TODOS ? { prestadorId } : {}),
                  })
                )
              }
            />
          }
          erro={erros['prestador-pdf']}
        />
      </RelatorioSectionCard>
    </div>
  )
}
