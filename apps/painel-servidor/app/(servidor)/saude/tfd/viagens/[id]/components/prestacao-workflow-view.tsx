'use client'

import type { PrestacaoDetalheViagemNovaOutput } from '@saude/mod-saude-tfd'
import { TFD_PERMISSIONS } from '@saude/mod-saude-tfd/client'
import {
  atualizarAdiantamentoViagemPc,
  decidirPrestacaoContasViagemNova,
  enviarPrestacaoContasViagemNova,
} from '@saude/mod-saude-tfd/actions/financeiro'
import type { SaudeMunicSession } from '@saude/core-auth/types/session'

import { currencyFormatter } from '@/app/(servidor)/saude/tfd/processos/[id]/agendamentos/[agId]/components/transporte-constants'
import {
  Alert,
  Badge,
  Button,
  Card,
  CardHeader,
  cn,
  Dialog,
  DialogContent,
  DialogFooter,
  EmptyState,
  Input,
  Spinner,
  Textarea,
} from '@saude/ui'
import { PermissionGate } from '@saude/ui/permission-gate'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

const MIN_OBSERVACAO = 20

const PRESTACAO_STATUS_CONFIG: Record<string, { label: string; color: 'gray' | 'blue' | 'green' | 'red' | 'yellow' }> = {
  PENDENTE: { label: 'Pendente', color: 'yellow' },
  ENVIADA: { label: 'Enviada', color: 'blue' },
  APROVADA: { label: 'Aprovada', color: 'green' },
  REJEITADA: { label: 'Rejeitada', color: 'red' },
}

function PrestacaoStatusBadge({ status }: { status: string }) {
  const config = PRESTACAO_STATUS_CONFIG[status] ?? { label: status, color: 'gray' as const }
  return (
    <Badge variant={config.color} size="sm">
      {config.label}
    </Badge>
  )
}

function diasRestantesPrazo(prazoEnvioAt: string): number {
  const prazo = new Date(prazoEnvioAt)
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  prazo.setHours(0, 0, 0, 0)
  return Math.ceil((prazo.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24))
}

function labelDiasRestantes(dias: number): string {
  if (dias < 0) return 'prazo vencido'
  if (dias === 0) return 'vence hoje'
  if (dias === 1) return '1 dia restante'
  return `${dias} dias restantes`
}

function corPrazo(dias: number): 'success' | 'warning' | 'error' {
  if (dias < 0) return 'error'
  if (dias <= 5) return 'warning'
  return 'success'
}

export interface PrestacaoWorkflowViewProps {
  session: SaudeMunicSession
  viagemNovaId: string
  viagemStatus: string
  prestacao: PrestacaoDetalheViagemNovaOutput | null
}

export function PrestacaoWorkflowView({
  session,
  viagemNovaId,
  viagemStatus,
  prestacao,
}: PrestacaoWorkflowViewProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [serverError, setServerError] = useState<string | null>(null)
  const [enviarConfirmOpen, setEnviarConfirmOpen] = useState(false)
  const [rejeitarOpen, setRejeitarOpen] = useState(false)
  const [observacoesGestor, setObservacoesGestor] = useState('')
  const [editandoAdiantamento, setEditandoAdiantamento] = useState(false)
  const [valorAdiantamentoInput, setValorAdiantamentoInput] = useState('')

  const viagemConcluida = viagemStatus === 'CONCLUIDA'

  if (!viagemConcluida) {
    return (
      <Alert variant="info" role="status">
        A prestação de contas será disponível após o registro de chegada da viagem.
      </Alert>
    )
  }

  if (!prestacao) {
    return (
      <EmptyState
        titulo="Prestação de contas"
        descricao="A prestação de contas está sendo aberta para esta viagem."
      />
    )
  }

  const podeEditarPc = prestacao.status === 'PENDENTE' || prestacao.status === 'REJEITADA'
  const temDespesas = prestacao.itensDespesa.length > 0
  const podeEnviar = podeEditarPc && temDespesas
  const diasPrazo = diasRestantesPrazo(prestacao.prazoEnvioAt)
  const prazoDataLabel = new Date(prestacao.prazoEnvioAt).toLocaleDateString('pt-BR')
  const valorAdiantamento = prestacao.valorAdiantamento
  const diferencaAdiantamento =
    valorAdiantamento !== null ? prestacao.valorTotal - valorAdiantamento : null

  function handleSalvarAdiantamento() {
    const valor = Number.parseFloat(valorAdiantamentoInput.replace(',', '.'))
    if (!Number.isFinite(valor) || valor < 0) {
      setServerError('Informe um valor válido para o adiantamento.')
      return
    }
    setServerError(null)
    startTransition(async () => {
      const result = await atualizarAdiantamentoViagemPc({ viagemNovaId, valorAdiantamento: valor })
      if (!result.success) {
        setServerError(result.error ?? 'Não foi possível salvar o adiantamento.')
        return
      }
      setEditandoAdiantamento(false)
      router.refresh()
    })
  }

  function handleEnviarPrestacao() {
    setServerError(null)
    startTransition(async () => {
      const result = await enviarPrestacaoContasViagemNova({ viagemNovaId })
      if (!result.success) {
        setServerError(result.error ?? 'Não foi possível enviar a prestação de contas.')
        return
      }
      setEnviarConfirmOpen(false)
      router.refresh()
    })
  }

  function runDecisao(aprovada: boolean) {
    if (!aprovada && observacoesGestor.trim().length < MIN_OBSERVACAO) {
      setServerError('A observação do gestor deve ter pelo menos 20 caracteres.')
      return
    }
    setServerError(null)
    startTransition(async () => {
      const result = await decidirPrestacaoContasViagemNova({
        viagemNovaId,
        decisao: aprovada ? 'APROVADA' : 'REJEITADA',
        observacoesGestor: aprovada ? undefined : observacoesGestor.trim(),
      })
      if (!result.success) {
        setServerError(result.error ?? 'Não foi possível registrar a decisão.')
        return
      }
      setRejeitarOpen(false)
      setObservacoesGestor('')
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

        <Alert variant="info" role="status">
          Lance e revise as despesas na aba <strong>Financeiro</strong>. Esta aba concentra o envio
          e a análise da prestação de contas.
        </Alert>

        <Card
          header={
            <div className="flex flex-wrap items-center justify-between gap-[var(--space-2)]">
              <CardHeader className="border-0 p-0">Status e prazo</CardHeader>
              <PrestacaoStatusBadge status={prestacao.status} />
            </div>
          }
        >
          <p
            className={cn(
              'text-[length:var(--text-sm)] font-medium',
              corPrazo(diasPrazo) === 'error' && 'text-[var(--color-error)]',
              corPrazo(diasPrazo) === 'warning' && 'text-[var(--color-warning)]',
              corPrazo(diasPrazo) === 'success' && 'text-[var(--color-success)]'
            )}
          >
            Enviar até {prazoDataLabel} — {labelDiasRestantes(diasPrazo)}
          </p>
          {prestacao.observacoesGestor && prestacao.status === 'REJEITADA' ? (
            <p className="mt-[var(--space-2)] text-[length:var(--text-sm)] text-[var(--color-text)]">
              Motivo da rejeição: {prestacao.observacoesGestor}
            </p>
          ) : null}
        </Card>

        <Card header={<CardHeader>Resumo para envio</CardHeader>}>
          <dl className="grid gap-[var(--space-3)] sm:grid-cols-2">
            <div>
              <dt className="text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
                Total lançado
              </dt>
              <dd className="font-mono text-[length:var(--text-lg)] font-bold tabular-nums text-[var(--color-success)]">
                {currencyFormatter.format(prestacao.valorTotal)}
              </dd>
            </div>
            <div>
              <dt className="text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
                Itens de despesa
              </dt>
              <dd className="text-[length:var(--text-lg)] font-bold text-[var(--color-text)]">
                {prestacao.itensDespesa.length}
              </dd>
            </div>
          </dl>

          {valorAdiantamento !== null && diferencaAdiantamento !== null ? (
            <div className="mt-[var(--space-4)] border-t border-[var(--color-border)] pt-[var(--space-4)]">
              <p className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
                Adiantamento:{' '}
                <span className="font-mono text-[var(--color-text)]">
                  {currencyFormatter.format(valorAdiantamento)}
                </span>
              </p>
              {diferencaAdiantamento > 0 ? (
                <p className="mt-1 text-[length:var(--text-sm)] font-medium text-[var(--color-error)]">
                  Diferença a mais: {currencyFormatter.format(diferencaAdiantamento)}
                </p>
              ) : diferencaAdiantamento < 0 ? (
                <p className="mt-1 text-[length:var(--text-sm)] font-medium text-[var(--color-warning)]">
                  Devolução ao erário: {currencyFormatter.format(Math.abs(diferencaAdiantamento))}
                </p>
              ) : (
                <p className="mt-1 text-[length:var(--text-sm)] font-medium text-[var(--color-success)]">
                  Valores conferem
                </p>
              )}
            </div>
          ) : null}
        </Card>

        {podeEditarPc && (valorAdiantamento === null || editandoAdiantamento) ? (
          <PermissionGate session={session} permission={TFD_PERMISSIONS.REGISTRAR_DESPESA}>
            <Card header={<CardHeader>Adiantamento total da viagem</CardHeader>}>
              <p className="mb-[var(--space-3)] text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
                Valor entregue antecipadamente para custear a viagem (comparado com as despesas
                lançadas na aba Financeiro).
              </p>
              <Input
                label="Valor do adiantamento (R$)"
                type="text"
                inputMode="decimal"
                value={valorAdiantamentoInput}
                onChange={(event) => setValorAdiantamentoInput(event.target.value)}
                disabled={isPending}
                placeholder="0,00"
              />
              <div className="mt-[var(--space-3)] flex flex-wrap gap-[var(--space-2)]">
                <Button type="button" variant="primary" disabled={isPending} onClick={handleSalvarAdiantamento}>
                  Salvar
                </Button>
                {valorAdiantamento !== null && editandoAdiantamento ? (
                  <Button type="button" variant="ghost" disabled={isPending} onClick={() => setEditandoAdiantamento(false)}>
                    Cancelar
                  </Button>
                ) : null}
              </div>
            </Card>
          </PermissionGate>
        ) : valorAdiantamento !== null ? (
          <Card header={<CardHeader>Adiantamento total da viagem</CardHeader>}>
            <div className="flex flex-wrap items-center justify-between gap-[var(--space-3)]">
              <p className="font-mono text-[length:var(--text-sm)] font-semibold tabular-nums text-[var(--color-text)]">
                {currencyFormatter.format(valorAdiantamento)}
              </p>
              {podeEditarPc ? (
                <PermissionGate session={session} permission={TFD_PERMISSIONS.REGISTRAR_DESPESA}>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={isPending}
                    onClick={() => {
                      setValorAdiantamentoInput(valorAdiantamento.toFixed(2).replace('.', ','))
                      setEditandoAdiantamento(true)
                    }}
                  >
                    Editar
                  </Button>
                </PermissionGate>
              ) : null}
            </div>
          </Card>
        ) : null}

        {podeEditarPc ? (
          <PermissionGate session={session} permission={TFD_PERMISSIONS.ENVIAR_PRESTACAO}>
            <Card header={<CardHeader>Enviar para análise</CardHeader>}>
              <Button
                type="button"
                variant="primary"
                disabled={isPending || !podeEnviar}
                title={!podeEnviar ? 'Lance ao menos uma despesa na aba Financeiro antes de enviar.' : undefined}
                onClick={() => setEnviarConfirmOpen(true)}
              >
                Enviar para análise
              </Button>
            </Card>
          </PermissionGate>
        ) : null}

        {prestacao.status === 'ENVIADA' ? (
          <PermissionGate session={session} permission={TFD_PERMISSIONS.APROVAR_PRESTACAO}>
            <Alert variant="info" titulo="Prestação aguardando análise" role="status">
              Revise as despesas na aba Financeiro antes de aprovar ou rejeitar.
            </Alert>
            <Card header={<CardHeader>Decisão do gestor</CardHeader>}>
              <div className="flex flex-wrap gap-[var(--space-2)]">
                <Button
                  type="button"
                  className="bg-[var(--color-success)] text-[var(--color-header-text)]"
                  disabled={isPending || !temDespesas}
                  onClick={() => runDecisao(true)}
                >
                  Aprovar
                </Button>
                <Button type="button" variant="danger" disabled={isPending} onClick={() => setRejeitarOpen(true)}>
                  Rejeitar
                </Button>
              </div>
            </Card>
          </PermissionGate>
        ) : null}
      </div>

      <Dialog open={enviarConfirmOpen} onOpenChange={setEnviarConfirmOpen}>
        <DialogContent titulo="Confirmar envio">
          <p className="text-[length:var(--text-sm)] text-[var(--color-text)]">
            Após o envio não será possível adicionar ou editar despesas. Confirmar envio?
          </p>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setEnviarConfirmOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" variant="primary" disabled={isPending} onClick={handleEnviarPrestacao}>
              {isPending ? <Spinner className="size-4" /> : 'Confirmar envio'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={rejeitarOpen} onOpenChange={setRejeitarOpen}>
        <DialogContent titulo="Rejeitar prestação">
          <Textarea
            label="Observação do gestor"
            value={observacoesGestor}
            onChange={(event) => setObservacoesGestor(event.target.value)}
            rows={4}
            disabled={isPending}
            hint={`Mínimo de ${MIN_OBSERVACAO} caracteres.`}
          />
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setRejeitarOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              variant="danger"
              disabled={isPending || observacoesGestor.trim().length < MIN_OBSERVACAO}
              onClick={() => runDecisao(false)}
            >
              Confirmar rejeição
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
