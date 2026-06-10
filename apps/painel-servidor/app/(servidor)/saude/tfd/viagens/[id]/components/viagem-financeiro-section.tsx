'use client'

import type { PrestacaoDetalheViagemNovaOutput } from '@saude/mod-saude-tfd'
import {
  TFD_PERMISSIONS,
  resolverTipoDespesaParaPc,
  type SegmentoViagemItem,
  type ViagemFinanceiroPcOutput,
} from '@saude/mod-saude-tfd/client'
import {
  atualizarAdiantamentoViagemPc,
  excluirItemDespesaViagemNova,
  importarCustosPlanejadosViagemPc,
} from '@saude/mod-saude-tfd/actions/financeiro'
import type { SaudeMunicSession } from '@saude/core-auth/types/session'

import { labelTipoDespesa } from '@/app/(servidor)/saude/tfd/components/despesa-tipo-utils'
import {
  Alert,
  Badge,
  Button,
  Card,
  CardHeader,
  Dialog,
  DialogContent,
  DialogFooter,
  EmptyState,
  ProtocoloBadge,
  cn,
  type TfdTipoDespesaConfigKey,
} from '@saude/ui'
import { PermissionGate } from '@saude/ui/permission-gate'
import { CheckCircle2, ChevronDown, Download, Plus, Trash2, Wallet } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState, useTransition } from 'react'

import { DespesaViagemDialog } from './despesa-viagem-dialog'

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

interface DespesaDialogState {
  open: boolean
  agendamentoId?: string
  tipoInicial: TfdTipoDespesaConfigKey
  valorInicial?: string
  quantidadeDiasInicial?: number
}

export interface ViagemFinanceiroSectionProps {
  session: SaudeMunicSession
  viagemNovaId: string
  viagemStatus: string
  processoId: string | null
  segmentos: SegmentoViagemItem[]
  financeiro: ViagemFinanceiroPcOutput
  prestacao: PrestacaoDetalheViagemNovaOutput | null
}

function KpiCard({
  label,
  value,
  accent = 'neutral',
}: {
  label: string
  value: string
  accent?: 'success' | 'warning' | 'neutral'
}) {
  const styles = {
    success:
      'border-[color-mix(in_srgb,var(--color-success)_28%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-success)_7%,var(--color-surface))]',
    warning:
      'border-[color-mix(in_srgb,var(--color-warning)_30%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-warning)_6%,var(--color-surface))]',
    neutral: 'border-[var(--color-border)] bg-[var(--color-surface)]',
  }
  const valueStyles = {
    success: 'text-[var(--color-success)]',
    warning: 'text-[var(--color-text)]',
    neutral: 'text-[var(--color-text)]',
  }

  return (
    <div className={cn('rounded-[var(--radius-md)] border p-[var(--space-4)]', styles[accent])}>
      <p className="text-[length:var(--text-xs)] font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
        {label}
      </p>
      <p
        className={cn(
          'mt-[var(--space-2)] font-mono text-[length:var(--text-lg)] font-bold tabular-nums',
          valueStyles[accent]
        )}
      >
        {value}
      </p>
    </div>
  )
}

export function ViagemFinanceiroSection({
  session,
  viagemNovaId,
  viagemStatus,
  processoId,
  segmentos,
  financeiro,
  prestacao,
}: ViagemFinanceiroSectionProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [serverError, setServerError] = useState<string | null>(null)
  const [itemExcluirId, setItemExcluirId] = useState<string | null>(null)
  const [despesaDialog, setDespesaDialog] = useState<DespesaDialogState>({
    open: false,
    tipoInicial: 'TRANSPORTE_TERRESTRE',
  })

  const viagemConcluida = viagemStatus === 'CONCLUIDA'
  const podeEditarPc =
    prestacao !== null &&
    (prestacao.status === 'PENDENTE' || prestacao.status === 'REJEITADA')

  const totalPendentesImportacao = useMemo(
    () =>
      financeiro.passageiros.reduce(
        (acc, passageiro) => acc + passageiro.custosPendentesImportacao,
        0
      ),
    [financeiro.passageiros]
  )

  function abrirDespesaDialog(config: Partial<DespesaDialogState> = {}) {
    setDespesaDialog({
      open: true,
      agendamentoId: config.agendamentoId,
      tipoInicial: config.tipoInicial ?? 'TRANSPORTE_TERRESTRE',
      valorInicial: config.valorInicial,
      quantidadeDiasInicial: config.quantidadeDiasInicial,
    })
  }

  function handleImportar(agendamentoId?: string) {
    setServerError(null)
    startTransition(async () => {
      const result = await importarCustosPlanejadosViagemPc({
        viagemNovaId,
        agendamentoId,
      })
      if (!result.success) {
        setServerError(result.error)
        return
      }
      router.refresh()
    })
  }

  function handleUsarReservaComoAdiantamento() {
    if (financeiro.adiantamentoSugerido <= 0) {
      return
    }
    setServerError(null)
    startTransition(async () => {
      const result = await atualizarAdiantamentoViagemPc({
        viagemNovaId,
        valorAdiantamento: financeiro.adiantamentoSugerido,
      })
      if (!result.success) {
        setServerError(result.error)
        return
      }
      router.refresh()
    })
  }

  function handleExcluirItem() {
    if (!itemExcluirId) {
      return
    }
    setServerError(null)
    startTransition(async () => {
      const result = await excluirItemDespesaViagemNova({
        viagemNovaId,
        itemDespesaId: itemExcluirId,
      })
      if (!result.success) {
        setServerError(result.error)
        return
      }
      setItemExcluirId(null)
      router.refresh()
    })
  }

  return (
    <>
      <div className="flex flex-col gap-[var(--space-6)]">
        {serverError ? (
          <p className="text-[length:var(--text-sm)] text-[var(--color-error)]" role="alert">
            {serverError}
          </p>
        ) : null}

        {!viagemConcluida ? (
          <Alert variant="info" role="status">
            Os custos das solicitações vinculadas aparecem abaixo como referência. O lançamento na
            prestação de contas fica disponível após registrar a chegada da viagem.
          </Alert>
        ) : null}

        <Card className="border-l-4 border-l-[var(--color-success)]">
          <div className="flex flex-wrap items-center justify-between gap-[var(--space-3)] border-b border-[var(--color-border)] px-[var(--space-4)] py-[var(--space-3)]">
            <div className="flex items-center gap-[var(--space-2)]">
              <Wallet className="size-4 text-[var(--color-success)]" aria-hidden="true" />
              <span className="font-medium text-[var(--color-text)]">Resumo financeiro da viagem</span>
            </div>
            {viagemConcluida && podeEditarPc && totalPendentesImportacao > 0 ? (
              <PermissionGate session={session} permission={TFD_PERMISSIONS.REGISTRAR_DESPESA}>
                <Button
                  type="button"
                  variant="primary"
                  disabled={isPending}
                  className="bg-[var(--color-success)] hover:bg-[color-mix(in_srgb,var(--color-success)_88%,var(--color-text))]"
                  onClick={() => handleImportar()}
                >
                  <Download className="size-4" aria-hidden="true" />
                  Importar estimativas ({totalPendentesImportacao})
                </Button>
              </PermissionGate>
            ) : null}
          </div>
          <div className="grid gap-[var(--space-4)] p-[var(--space-4)] sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              label="Estimado (solicitações)"
              value={currencyFormatter.format(financeiro.totais.estimadoSolicitacoes)}
              accent="success"
            />
            <KpiCard
              label="Lançado na PC"
              value={currencyFormatter.format(financeiro.totais.lancadoPc)}
              accent="neutral"
            />
            <KpiCard
              label="Pendente de lançar"
              value={currencyFormatter.format(financeiro.totais.pendenteEstimado)}
              accent="warning"
            />
            <KpiCard
              label="Reservado (solicitações)"
              value={currencyFormatter.format(financeiro.totais.reservadoSolicitacoes)}
              accent="neutral"
            />
          </div>
        </Card>

        {viagemConcluida &&
        podeEditarPc &&
        financeiro.adiantamentoSugerido > 0 &&
        (prestacao?.valorAdiantamento == null || prestacao.valorAdiantamento === 0) ? (
          <Alert variant="info" titulo="Adiantamento sugerido" role="status">
            <p className="text-[length:var(--text-sm)] text-[var(--color-text)]">
              Com base nas reservas ativas das solicitações:{' '}
              <span className="font-mono font-semibold text-[var(--color-success)]">
                {currencyFormatter.format(financeiro.adiantamentoSugerido)}
              </span>
            </p>
            <PermissionGate session={session} permission={TFD_PERMISSIONS.REGISTRAR_DESPESA}>
              <Button
                type="button"
                variant="secondary"
                className="mt-[var(--space-3)]"
                disabled={isPending}
                onClick={handleUsarReservaComoAdiantamento}
              >
                Usar reserva como adiantamento
              </Button>
            </PermissionGate>
          </Alert>
        ) : null}

        {financeiro.passageiros.length === 0 ? (
          <EmptyState
            titulo="Nenhum passageiro vinculado"
            descricao="Vincule agendamentos à viagem para carregar os custos das solicitações."
          />
        ) : (
          <ul className="flex flex-col gap-[var(--space-4)]">
            {financeiro.passageiros.map((passageiro) => (
              <li key={passageiro.passageiroId}>
                <details
                  className={cn(
                    'group overflow-hidden rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]'
                  )}
                >
                  <summary className="flex cursor-pointer list-none items-center gap-[var(--space-3)] px-[var(--space-4)] py-[var(--space-4)] text-left transition-colors hover:bg-[var(--color-bg)] [&::-webkit-details-marker]:hidden">
                    <div className="flex min-w-0 flex-1 flex-wrap items-start justify-between gap-[var(--space-3)]">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-[var(--color-text)]">{passageiro.pacienteNome}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-[var(--space-2)]">
                          <ProtocoloBadge protocolo={passageiro.protocoloSolicitacao} />
                          <span
                            onClick={(event) => event.stopPropagation()}
                            onKeyDown={(event) => event.stopPropagation()}
                          >
                            <Link
                              href={`/saude/tfd/${passageiro.solicitacaoId}`}
                              className="text-[length:var(--text-xs)] font-medium text-[var(--color-primary)] hover:underline"
                            >
                              Ver solicitação
                            </Link>
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
                          Estimado / Lançado
                        </p>
                        <p className="font-mono text-[length:var(--text-sm)] font-semibold tabular-nums">
                          <span className="text-[var(--color-success)]">
                            {currencyFormatter.format(passageiro.valorEstimado)}
                          </span>
                          <span className="text-[var(--color-text-muted)]"> / </span>
                          <span className="text-[var(--color-text)]">
                            {currencyFormatter.format(passageiro.valorLancadoPc)}
                          </span>
                        </p>
                      </div>
                    </div>
                    <ChevronDown
                      className="size-5 shrink-0 text-[var(--color-text-muted)] transition-transform duration-200 group-open:rotate-180"
                      aria-hidden="true"
                    />
                  </summary>

                  <div className="border-t border-[var(--color-border)]">
                    {passageiro.custosPlanejados.length > 0 ? (
                      <div className="bg-[var(--color-bg)] px-[var(--space-4)] py-[var(--space-4)]">
                        <h4 className="mb-[var(--space-3)] text-[length:var(--text-xs)] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                          Custos planejados na solicitação
                        </h4>
                        <ul className="flex flex-col gap-[var(--space-2)]">
                          {passageiro.custosPlanejados.map((custo) => {
                            const tipoDespesa = labelTipoDespesa(custo.tipo)
                            const jaImportado = passageiro.itensPc.some(
                              (item) => item.custoPlanejadoId === custo.id
                            )
                            const tipoPc = resolverTipoDespesaParaPc(custo.tipo)

                            return (
                              <li
                                key={custo.id}
                                className="flex flex-wrap items-center justify-between gap-[var(--space-2)] rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] px-[var(--space-3)] py-[var(--space-2)]"
                              >
                                <div className="min-w-0 flex-1">
                                  <span className="text-[length:var(--text-sm)] font-medium text-[var(--color-text)]">
                                    {tipoDespesa.label}
                                  </span>
                                  {custo.descricao ? (
                                    <p className="text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
                                      {custo.descricao}
                                    </p>
                                  ) : null}
                                </div>
                                <div className="flex items-center gap-[var(--space-2)]">
                                  <span className="font-mono text-[length:var(--text-sm)] font-semibold tabular-nums text-[var(--color-success)]">
                                    {currencyFormatter.format(custo.valor)}
                                  </span>
                                  {jaImportado ? (
                                    <Badge variant="green" size="sm">
                                      <CheckCircle2 className="size-3" aria-hidden="true" />
                                      Na PC
                                    </Badge>
                                  ) : viagemConcluida && podeEditarPc && tipoPc ? (
                                    <PermissionGate
                                      session={session}
                                      permission={TFD_PERMISSIONS.REGISTRAR_DESPESA}
                                    >
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        className="text-[length:var(--text-xs)]"
                                        disabled={isPending}
                                        onClick={() =>
                                          abrirDespesaDialog({
                                            agendamentoId: passageiro.agendamentoId,
                                            tipoInicial: tipoPc,
                                            valorInicial: custo.valor.toFixed(2).replace('.', ','),
                                            quantidadeDiasInicial: custo.quantidadeDias ?? undefined,
                                          })
                                        }
                                      >
                                        Lançar
                                      </Button>
                                    </PermissionGate>
                                  ) : null}
                                </div>
                              </li>
                            )
                          })}
                        </ul>
                        {viagemConcluida &&
                        podeEditarPc &&
                        passageiro.custosPendentesImportacao > 0 ? (
                          <PermissionGate session={session} permission={TFD_PERMISSIONS.REGISTRAR_DESPESA}>
                            <Button
                              type="button"
                              variant="secondary"
                              className="mt-[var(--space-3)] text-[length:var(--text-xs)]"
                              disabled={isPending}
                              onClick={() => handleImportar(passageiro.agendamentoId)}
                            >
                              Importar deste paciente ({passageiro.custosPendentesImportacao})
                            </Button>
                          </PermissionGate>
                        ) : null}
                      </div>
                    ) : (
                      <p className="bg-[var(--color-bg)] px-[var(--space-4)] py-[var(--space-3)] text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
                        Nenhum custo planejado na solicitação.
                      </p>
                    )}

                    {passageiro.itensPc.length > 0 ? (
                      <div className="px-[var(--space-4)] py-[var(--space-4)]">
                        <h4 className="mb-[var(--space-3)] text-[length:var(--text-xs)] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                          Lançado na prestação de contas
                        </h4>
                        <ul className="divide-y divide-[var(--color-border)] rounded-[var(--radius-md)] border border-[var(--color-border)]">
                          {passageiro.itensPc.map((item) => {
                            const tipoDespesa = labelTipoDespesa(item.tipo)
                            return (
                              <li
                                key={item.id}
                                className="flex flex-wrap items-center justify-between gap-[var(--space-3)] bg-[var(--color-surface)] px-[var(--space-3)] py-[var(--space-3)]"
                              >
                                <div className="min-w-0">
                                  <span className="text-[length:var(--text-sm)] font-medium text-[var(--color-text)]">
                                    {tipoDespesa.label}
                                  </span>
                                  {item.descricao ? (
                                    <p className="text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
                                      {item.descricao}
                                    </p>
                                  ) : null}
                                </div>
                                <div className="flex items-center gap-[var(--space-2)]">
                                  <span className="font-mono text-[length:var(--text-sm)] font-semibold tabular-nums text-[var(--color-text)]">
                                    {currencyFormatter.format(item.valor)}
                                  </span>
                                  {podeEditarPc ? (
                                    <PermissionGate
                                      session={session}
                                      permission={TFD_PERMISSIONS.REGISTRAR_DESPESA}
                                    >
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        disabled={isPending}
                                        onClick={() => setItemExcluirId(item.id)}
                                        aria-label="Excluir despesa"
                                      >
                                        <Trash2 className="size-4 text-[var(--color-error)]" />
                                      </Button>
                                    </PermissionGate>
                                  ) : null}
                                </div>
                              </li>
                            )
                          })}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                </details>
              </li>
            ))}
          </ul>
        )}

        {financeiro.itensPcSemPassageiro.length > 0 ? (
          <Card header={<CardHeader>Despesas gerais da viagem</CardHeader>}>
            <ul className="divide-y divide-[var(--color-border)]">
              {financeiro.itensPcSemPassageiro.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-[var(--space-3)] py-[var(--space-3)] first:pt-0 last:pb-0"
                >
                  <span className="text-[length:var(--text-sm)] text-[var(--color-text)]">
                    {labelTipoDespesa(item.tipo).label}
                  </span>
                  <span className="font-mono text-[length:var(--text-sm)] font-semibold tabular-nums">
                    {currencyFormatter.format(item.valor)}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        ) : null}

        {viagemConcluida && podeEditarPc ? (
          <PermissionGate session={session} permission={TFD_PERMISSIONS.REGISTRAR_DESPESA}>
            <div className="flex justify-end">
              <Button
                type="button"
                variant="primary"
                disabled={isPending}
                onClick={() => abrirDespesaDialog()}
              >
                <Plus className="size-4" aria-hidden="true" />
                Lançar despesa avulsa
              </Button>
            </div>
          </PermissionGate>
        ) : null}
      </div>

      <DespesaViagemDialog
        open={despesaDialog.open}
        onOpenChange={(open) => setDespesaDialog((prev) => ({ ...prev, open }))}
        session={session}
        viagemNovaId={viagemNovaId}
        processoId={processoId}
        segmentos={segmentos}
        agendamentoId={despesaDialog.agendamentoId}
        tipoInicial={despesaDialog.tipoInicial}
        valorInicial={despesaDialog.valorInicial}
        quantidadeDiasInicial={despesaDialog.quantidadeDiasInicial}
      />

      <Dialog open={itemExcluirId !== null} onOpenChange={(open) => !open && setItemExcluirId(null)}>
        <DialogContent titulo="Excluir despesa">
          <p className="text-[length:var(--text-sm)] text-[var(--color-text)]">
            Deseja excluir este item de despesa?
          </p>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setItemExcluirId(null)}>
              Cancelar
            </Button>
            <Button type="button" variant="danger" disabled={isPending} onClick={handleExcluirItem}>
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
