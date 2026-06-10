'use client'

import {
  TFD_PERMISSIONS,
  type TfdProjecaoFinanceiraOutput,
} from '@saude/mod-saude-tfd/client'
import { excluirCustoPlanejadoSolicitacaoTfd } from '@saude/mod-saude-tfd/actions/projecao-financeira'
import type { SaudeMunicSession } from '@saude/core-auth/types/session'

import { labelTipoDespesa } from '@/app/(servidor)/saude/tfd/components/despesa-tipo-utils'
import {
  Alert,
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  EmptyState,
  cn,
  type TfdTipoDespesaConfigKey,
} from '@saude/ui'
import { PermissionGate } from '@saude/ui/permission-gate'
import { Plus, Receipt, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useMemo, useState, useTransition } from 'react'

import { DespesaSolicitacaoDialog } from './despesa-solicitacao-dialog'
import { SolicitacaoSecaoAccordion } from './solicitacao-secao-accordion'

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

const SECTION_SURFACE =
  'border-[color-mix(in_srgb,var(--color-success)_35%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-success)_10%,var(--color-surface))]'
const ITEM_SURFACE =
  'border-[color-mix(in_srgb,var(--color-success)_22%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-surface)_88%,var(--color-success))]'

interface DespesaDialogState {
  open: boolean
  tipoInicial: TfdTipoDespesaConfigKey
  valorInicial?: string
  quantidadeDiasInicial?: number
}

export interface SolicitacaoDespesasLancadasSectionProps {
  session: SaudeMunicSession
  projecao: TfdProjecaoFinanceiraOutput
}

export function SolicitacaoDespesasLancadasSection({
  session,
  projecao,
}: SolicitacaoDespesasLancadasSectionProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [itemExcluirId, setItemExcluirId] = useState<string | null>(null)
  const [despesaDialog, setDespesaDialog] = useState<DespesaDialogState>({
    open: false,
    tipoInicial: 'TRANSPORTE_TERRESTRE',
  })

  const podeEditar = projecao.podeRegistrarComposicao
  const itensOrdenados = useMemo(
    () => [...projecao.custos].sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [projecao.custos]
  )

  function abrirDespesaDialog(options?: Partial<Omit<DespesaDialogState, 'open'>>) {
    setDespesaDialog({
      open: true,
      tipoInicial: options?.tipoInicial ?? 'TRANSPORTE_TERRESTRE',
      valorInicial: options?.valorInicial,
      quantidadeDiasInicial: options?.quantidadeDiasInicial,
    })
  }

  function handleExcluirItem() {
    if (!itemExcluirId) {
      return
    }

    startTransition(async () => {
      const result = await excluirCustoPlanejadoSolicitacaoTfd({ custoId: itemExcluirId })
      if (!result.success) {
        return
      }
      setItemExcluirId(null)
      router.refresh()
    })
  }

  return (
    <>
      <SolicitacaoSecaoAccordion
        titulo="Despesas lançadas"
        subtitulo="Composição estimada dos custos da viagem"
        icon={
          <span className="flex size-9 items-center justify-center rounded-[var(--radius-md)] bg-[color-mix(in_srgb,var(--color-success)_18%,var(--color-surface))] text-[var(--color-success)]">
            <Receipt className="size-5" aria-hidden="true" />
          </span>
        }
        badge={
          itensOrdenados.length > 0 ? (
            <Badge variant="green" size="sm">
              {currencyFormatter.format(projecao.valorTotal)}
            </Badge>
          ) : undefined
        }
        acoesResumo={
          podeEditar ? (
            <PermissionGate session={session} permission={TFD_PERMISSIONS.REGISTRAR_DESPESA}>
              <Button
                type="button"
                variant="primary"
                disabled={isPending}
                className="bg-[var(--color-success)] hover:bg-[color-mix(in_srgb,var(--color-success)_88%,var(--color-text))]"
                onClick={() => abrirDespesaDialog()}
              >
                <Plus className="size-4" aria-hidden="true" />
                Lançar despesa
              </Button>
            </PermissionGate>
          ) : undefined
        }
        className={cn(
          'rounded-[var(--radius-lg)] border-l-4 border-l-[var(--color-success)]',
          SECTION_SURFACE
        )}
        summaryClassName="bg-[color-mix(in_srgb,var(--color-success)_6%,var(--color-surface))] hover:bg-[color-mix(in_srgb,var(--color-success)_10%,var(--color-surface))]"
        bodyClassName="border-[color-mix(in_srgb,var(--color-success)_20%,var(--color-border))]"
      >
        {projecao.projecaoConfirmada ? (
          <Alert variant="info" titulo="Composição de custos bloqueada" role="status">
            A projeção financeira já foi confirmada com reserva de saldo. Os custos abaixo são apenas
            para consulta.
          </Alert>
        ) : null}

        <div className={projecao.projecaoConfirmada ? 'mt-[var(--space-4)]' : undefined}>
        {itensOrdenados.length === 0 ? (
          <EmptyState
            titulo="Nenhuma despesa lançada ainda"
            descricao="Registre os custos estimados da viagem (passagens, transporte, diárias etc.) para compor a projeção financeira."
          />
        ) : (
          <ul className="flex flex-col gap-[var(--space-3)]">
            {itensOrdenados.map((item) => {
              const tipoDespesa = labelTipoDespesa(item.tipo)
              const Icon = tipoDespesa.Icon
              const labelComDias =
                item.quantidadeDias !== null && item.quantidadeDias > 0
                  ? `${tipoDespesa.label} (${item.quantidadeDias} dia${item.quantidadeDias === 1 ? '' : 's'})`
                  : tipoDespesa.label

              return (
                <li
                  key={item.id}
                  className={cn(
                    'rounded-[var(--radius-md)] border p-[var(--space-4)] shadow-sm',
                    ITEM_SURFACE
                  )}
                >
                  <div className="flex flex-wrap items-start justify-between gap-[var(--space-3)]">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-[var(--space-2)]">
                        <span className="flex size-7 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[color-mix(in_srgb,var(--color-success)_14%,var(--color-surface))]">
                          <Icon
                            className="size-4 text-[var(--color-success)]"
                            aria-hidden="true"
                          />
                        </span>
                        <Badge variant="green" size="sm">
                          {labelComDias}
                        </Badge>
                        {tipoDespesa.isLegado ? (
                          <Badge variant="gray" size="sm">
                            Histórico
                          </Badge>
                        ) : null}
                        {!item.tipo ? (
                          <Badge variant="gray" size="sm">
                            Legado
                          </Badge>
                        ) : null}
                      </div>
                      {item.descricao ? (
                        <p className="mt-[var(--space-2)] text-[length:var(--text-sm)] text-[var(--color-text)]">
                          {item.descricao}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex flex-col items-end gap-[var(--space-2)]">
                      <span className="font-mono text-[length:var(--text-sm)] font-bold tabular-nums text-[var(--color-success)]">
                        {currencyFormatter.format(item.valor)}
                      </span>
                      {podeEditar ? (
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
                  </div>
                </li>
              )
            })}
          </ul>
        )}

        <div
          className={cn(
            'mt-[var(--space-4)] rounded-[var(--radius-md)] border px-[var(--space-4)] py-[var(--space-3)]',
            'border-[color-mix(in_srgb,var(--color-success)_30%,var(--color-border))]',
            'bg-[color-mix(in_srgb,var(--color-success)_16%,var(--color-surface))]'
          )}
        >
          <p className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
            Total estimado
          </p>
          <p className="mt-[var(--space-1)] font-mono text-[length:var(--text-lg)] font-bold tabular-nums text-[var(--color-success)]">
            {currencyFormatter.format(projecao.valorTotal)}
          </p>
        </div>
        </div>
      </SolicitacaoSecaoAccordion>

      <DespesaSolicitacaoDialog
        open={despesaDialog.open}
        onOpenChange={(open) => setDespesaDialog((prev) => ({ ...prev, open }))}
        session={session}
        solicitacaoId={projecao.solicitacaoId}
        tipoInicial={despesaDialog.tipoInicial}
        valorInicial={despesaDialog.valorInicial}
        quantidadeDiasInicial={despesaDialog.quantidadeDiasInicial}
      />

      <Dialog open={itemExcluirId !== null} onOpenChange={(open) => !open && setItemExcluirId(null)}>
        <DialogContent titulo="Excluir despesa">
          <p className="text-[length:var(--text-sm)] text-[var(--color-text)]">
            Deseja excluir este item de despesa? Esta ação não pode ser desfeita.
          </p>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setItemExcluirId(null)}>
              Cancelar
            </Button>
            <Button type="button" variant="danger" disabled={isPending} onClick={handleExcluirItem}>
              {isPending ? 'Excluindo…' : 'Excluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
