'use client'

import {
  gerarRelatorioCompetenciaTfd,
  gerarRelatorioProducaoMensalTfd,
} from '@saude/mod-saude-tfd/actions/relatorio'
import {
  labelTipoMovimentacao,
  type SaldoListItem,
  type TfdDashboardFinanceiroOutput,
  type TfdDashboardOutput,
} from '@saude/mod-saude-tfd/client'
import { Badge, Card, EmptyState, Input } from '@saude/ui'
import { ArrowRight, DollarSign, Wallet } from 'lucide-react'
import Link from 'next/link'
import { useMemo, useState } from 'react'

import { SaldoLinhaProgresso } from '../../../saldos/components/saldo-linha-progresso'
import { formatBrl } from '../../../saldos/components/saldos-ui'
import { RelatorioExportPdfButton } from '../../components/relatorio-export-buttons'
import { RelatorioItemRow } from '../../components/relatorio-item-row'
import { RelatorioSectionCard } from '../../components/relatorio-section-card'
import { RelatorioVoltarLink } from '../../components/relatorio-voltar-link'
import {
  defaultMonthInputValue,
  parseMesAnoFromMonthInput,
} from '../../components/relatorio-helpers'
import {
  compactDateInputClassName,
  useRelatorioExport,
} from '../../components/use-relatorio-export'

// BLOCO-13-RELATORIOS
interface RelatorioFinanceiroViewProps {
  saldos: SaldoListItem[]
  financeiro: TfdDashboardFinanceiroOutput
  dashboard: Pick<TfdDashboardOutput, 'prestacoesPendentes'>
}

function formatDataHora(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function tipoMovimentacaoBadgeVariant(tipo: string): 'green' | 'yellow' | 'red' | 'blue' | 'gray' {
  switch (tipo) {
    case 'CREDITO':
      return 'green'
    case 'RESERVA':
      return 'yellow'
    case 'CONSUMO':
      return 'red'
    case 'LIBERACAO':
      return 'blue'
    default:
      return 'gray'
  }
}

export function RelatorioFinanceiroView({
  saldos,
  financeiro,
  dashboard,
}: RelatorioFinanceiroViewProps) {
  const { extratoResumido } = financeiro
  const { loadingKey, erros, exportar, setErro } = useRelatorioExport()

  const mesAtualInput = useMemo(() => defaultMonthInputValue(), [])
  const [mesProducao, setMesProducao] = useState(mesAtualInput)
  const [mesCompetencia, setMesCompetencia] = useState(mesAtualInput)

  const saldosAtivos = useMemo(() => saldos.filter((saldo) => saldo.ativo), [saldos])

  const consolidado = useMemo(() => {
    const disponivel = saldosAtivos.reduce((acc, saldo) => acc + saldo.valorDisponivel, 0)
    const reservado = saldosAtivos.reduce((acc, saldo) => acc + saldo.valorReservado, 0)
    const utilizado = saldosAtivos.reduce((acc, saldo) => acc + saldo.valorUtilizado, 0)
    const temAlerta = saldosAtivos.some((saldo) => saldo.alertaBaixo)

    return { disponivel, reservado, utilizado, temAlerta }
  }, [saldosAtivos])

  return (
    <div className="flex flex-col gap-[var(--space-6)]">
      <RelatorioVoltarLink />

      <section className="flex flex-col gap-[var(--space-4)]">
        <h2 className="text-[length:var(--text-base)] font-semibold text-[var(--color-text)]">
          Visão consolidada
        </h2>
        <div className="grid gap-[var(--space-4)] sm:grid-cols-2 xl:grid-cols-4">
          <Card>
            <p className="text-[length:var(--text-sm)] font-medium text-[var(--color-text-muted)]">
              Disponível consolidado
            </p>
            <p
              className={`mt-[var(--space-2)] font-mono text-[length:var(--text-2xl)] font-bold tabular-nums ${
                consolidado.temAlerta
                  ? 'text-[var(--color-error)]'
                  : 'text-[var(--color-success)]'
              }`}
            >
              {formatBrl(consolidado.disponivel)}
            </p>
          </Card>
          <Card>
            <p className="text-[length:var(--text-sm)] font-medium text-[var(--color-text-muted)]">
              Total reservado
            </p>
            <p className="mt-[var(--space-2)] font-mono text-[length:var(--text-2xl)] font-bold tabular-nums text-[var(--color-warning)]">
              {formatBrl(consolidado.reservado)}
            </p>
          </Card>
          <Card>
            <p className="text-[length:var(--text-sm)] font-medium text-[var(--color-text-muted)]">
              Total utilizado
            </p>
            <p className="mt-[var(--space-2)] font-mono text-[length:var(--text-2xl)] font-bold tabular-nums text-[var(--color-text)]">
              {formatBrl(consolidado.utilizado)}
            </p>
          </Card>
          <Card>
            <p className="text-[length:var(--text-sm)] font-medium text-[var(--color-text-muted)]">
              PCs pendentes
            </p>
            <p className="mt-[var(--space-2)] text-[length:var(--text-2xl)] font-bold tabular-nums text-[var(--color-text)]">
              {dashboard.prestacoesPendentes.toLocaleString('pt-BR')}
            </p>
          </Card>
        </div>
      </section>

      <section className="flex flex-col gap-[var(--space-4)]">
        <h2 className="text-[length:var(--text-base)] font-semibold text-[var(--color-text)]">
          Situação dos saldos
        </h2>
        {saldos.length === 0 ? (
          <EmptyState
            icon={<DollarSign className="size-6" />}
            titulo="Nenhum saldo cadastrado"
            descricao="Os saldos financeiros aparecerão aqui quando forem cadastrados."
          />
        ) : (
          <div className="flex flex-col gap-[var(--space-3)]">
            {saldos.map((saldo) => {
              const nivel =
                saldo.percentualDisponivel <= 20
                  ? 'critico'
                  : saldo.percentualDisponivel <= 50
                    ? 'atencao'
                    : null

              return (
                <Card key={saldo.id}>
                  <div className="flex flex-wrap items-start justify-between gap-[var(--space-2)]">
                    <div className="flex flex-wrap items-center gap-[var(--space-2)]">
                      <h3 className="text-[length:var(--text-sm)] font-semibold text-[var(--color-text)]">
                        {saldo.descricao}
                      </h3>
                      <Badge variant={saldo.ativo ? 'green' : 'gray'}>
                        {saldo.ativo ? 'Ativo' : 'Inativo'}
                      </Badge>
                      {nivel === 'critico' ? (
                        <Badge variant="red">Crítico</Badge>
                      ) : nivel === 'atencao' ? (
                        <Badge variant="yellow">Atenção</Badge>
                      ) : null}
                    </div>
                    <Link
                      href={`/saude/tfd/saldos/${saldo.id}`}
                      className="inline-flex items-center gap-1 text-[length:var(--text-xs)] font-medium text-[var(--color-primary)] underline-offset-2 hover:underline"
                    >
                      Ver extrato
                      <ArrowRight className="size-3" aria-hidden="true" />
                    </Link>
                  </div>

                  <SaldoLinhaProgresso saldo={saldo} />

                  <div className="mt-[var(--space-3)] flex flex-wrap gap-x-[var(--space-4)] gap-y-[var(--space-1)] text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
                    <span>
                      Total: <strong className="text-[var(--color-text)]">{formatBrl(saldo.valorTotal)}</strong>
                    </span>
                    <span>
                      Reservado:{' '}
                      <strong className="text-[var(--color-warning)]">
                        {formatBrl(saldo.valorReservado)}
                      </strong>
                    </span>
                    <span>
                      Utilizado:{' '}
                      <strong className="text-[var(--color-error)]">
                        {formatBrl(saldo.valorUtilizado)}
                      </strong>
                    </span>
                    <span>
                      Disponível:{' '}
                      <strong className="text-[var(--color-success)]">
                        {formatBrl(saldo.valorDisponivel)}
                      </strong>{' '}
                      ({saldo.percentualDisponivel.toFixed(1)}%)
                    </span>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </section>

      <Card
        header={
          <div className="flex flex-wrap items-center justify-between gap-[var(--space-2)]">
            <h2 className="text-[length:var(--text-base)] font-semibold text-[var(--color-text)]">
              Últimas movimentações
            </h2>
            <Link
              href="/saude/tfd/saldos"
              className="inline-flex items-center gap-1 text-[length:var(--text-sm)] font-medium text-[var(--color-primary)] underline-offset-2 hover:underline"
            >
              Ver extrato completo
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        }
      >
        {extratoResumido.length === 0 ? (
          <EmptyState
            icon={<Wallet className="size-6" />}
            titulo="Sem movimentações recentes"
            descricao="As movimentações dos saldos ativos aparecerão aqui."
          />
        ) : (
          <ul className="flex flex-col gap-[var(--space-2)]" role="list">
            {extratoResumido.map((mov) => (
              <li
                key={mov.id}
                className="flex flex-wrap items-center gap-[var(--space-2)] border-b border-[var(--color-border)] py-[var(--space-2)] last:border-b-0"
              >
                <span className="w-[8.5rem] shrink-0 text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
                  {formatDataHora(mov.criadoEm)}
                </span>
                <Badge variant={tipoMovimentacaoBadgeVariant(mov.tipo)} size="sm">
                  {labelTipoMovimentacao(mov.tipo)}
                </Badge>
                <span className="min-w-0 flex-1 truncate text-[length:var(--text-sm)] text-[var(--color-text)]">
                  {mov.descricao}
                </span>
                <span className="shrink-0 font-mono text-[length:var(--text-sm)] tabular-nums text-[var(--color-text)]">
                  {formatBrl(mov.valor)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <RelatorioSectionCard titulo="Relatórios por período" icon={DollarSign}>
        <RelatorioItemRow
          showDivider={false}
          titulo="Relatório por competência (PDF)"
          descricao="Totais por status, valores reservado e consumido, protocolos do período."
          filtros={
            <Input
              id="painel-competencia-mes"
              type="month"
              value={mesCompetencia}
              onChange={(event) => setMesCompetencia(event.target.value)}
              disabled={loadingKey === 'competencia-pdf'}
              className={compactDateInputClassName()}
              aria-label="Competência (mês/ano)"
            />
          }
          acao={
            <RelatorioExportPdfButton
              loading={loadingKey === 'competencia-pdf'}
              disabled={!parseMesAnoFromMonthInput(mesCompetencia)}
              onClick={() => {
                const parsed = parseMesAnoFromMonthInput(mesCompetencia)
                if (!parsed) {
                  setErro('competencia-pdf', 'Competência inválida.')
                  return
                }
                void exportar('competencia-pdf', () => gerarRelatorioCompetenciaTfd(parsed))
              }}
            />
          }
          erro={erros['competencia-pdf']}
        />

        <RelatorioItemRow
          titulo="Produção mensal (PDF)"
          descricao="Contagem e valores por status no período: aprovados, negados, concluídos, cancelados."
          filtros={
            <Input
              id="painel-producao-mes"
              type="month"
              value={mesProducao}
              onChange={(event) => setMesProducao(event.target.value)}
              disabled={loadingKey === 'producao-pdf'}
              className={compactDateInputClassName()}
              aria-label="Mês de referência"
            />
          }
          acao={
            <RelatorioExportPdfButton
              loading={loadingKey === 'producao-pdf'}
              disabled={!parseMesAnoFromMonthInput(mesProducao)}
              onClick={() => {
                const parsed = parseMesAnoFromMonthInput(mesProducao)
                if (!parsed) {
                  setErro('producao-pdf', 'Competência inválida.')
                  return
                }
                void exportar('producao-pdf', () => gerarRelatorioProducaoMensalTfd(parsed))
              }}
            />
          }
          erro={erros['producao-pdf']}
        />
      </RelatorioSectionCard>
    </div>
  )
}
