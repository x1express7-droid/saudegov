'use client'

import type { PrestacaoDetalheViagemNovaOutput, SegmentoViagemItem } from '@saude/mod-saude-tfd'
import { TFD_PERMISSIONS } from '@saude/mod-saude-tfd/client'
import {
  decidirPrestacaoContasViagemNova,
  enviarPrestacaoContasViagemNova,
} from '@saude/mod-saude-tfd/actions/financeiro'
import type { SaudeMunicSession } from '@saude/core-auth/types/session'

import {
  PRESTACAO_STATUS_CONFIG,
  currencyFormatter,
} from '@/app/(servidor)/saude/tfd/processos/[id]/agendamentos/[agId]/components/transporte-constants'
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
  Spinner,
  Textarea,
} from '@saude/ui'
import { PermissionGate } from '@saude/ui/permission-gate'
import { Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useMemo, useState, useTransition } from 'react'

import { DespesaViagemDialog } from './despesa-viagem-dialog'

const MIN_OBSERVACAO = 20
const PRAZO_DIAS_APOS_CHEGADA = 10

const TIPO_DESPESA_META: Record<string, { emoji: string; label: string }> = {
  TRANSPORTE: { emoji: '🚌', label: 'Transporte' },
  ALIMENTACAO: { emoji: '🍽', label: 'Alimentação' },
  HOSPEDAGEM: { emoji: '🏨', label: 'Hospedagem' },
  OUTRO: { emoji: '📎', label: 'Outro' },
}

function ServerError({ message }: { message: string }) {
  return (
    <p className="text-[length:var(--text-sm)] text-[var(--color-error)]" role="alert">
      {message}
    </p>
  )
}

function PrestacaoStatusBadge({ status }: { status: string }) {
  const config = PRESTACAO_STATUS_CONFIG[status] ?? {
    label: status,
    color: 'gray' as const,
  }
  return (
    <Badge variant={config.color} size="sm">
      {config.label}
    </Badge>
  )
}

function classificarPrazo(prazoEnvioAt: string): 'ok' | 'vencendo' | 'vencido' {
  const prazo = new Date(prazoEnvioAt)
  const agora = new Date()
  if (prazo.getTime() < agora.getTime()) {
    return 'vencido'
  }
  const diffHoras = (prazo.getTime() - agora.getTime()) / (1000 * 60 * 60)
  if (diffHoras <= 48) {
    return 'vencendo'
  }
  return 'ok'
}

function calcularPrazoEnvio(dataChegada: string): Date {
  const base = new Date(`${dataChegada}T12:00:00`)
  base.setDate(base.getDate() + PRAZO_DIAS_APOS_CHEGADA)
  return base
}

function formatarPrazoRestante(prazo: Date): string {
  const agora = new Date()
  agora.setHours(0, 0, 0, 0)
  const prazoDia = new Date(prazo)
  prazoDia.setHours(0, 0, 0, 0)
  const diffMs = prazoDia.getTime() - agora.getTime()
  const diffDias = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

  if (diffDias < 0) {
    return 'VENCIDO'
  }
  if (diffDias === 0) {
    return 'vence hoje'
  }
  if (diffDias === 1) {
    return '1 dia restante'
  }
  return `${diffDias} dias restantes`
}

function formatDataRegistro(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function labelSegmento(segmentos: SegmentoViagemItem[], transporteId: string | null): string | null {
  if (!transporteId) {
    return null
  }
  const segmento = segmentos.find((item) => item.id === transporteId)
  if (!segmento) {
    return null
  }
  return `${segmento.origemDescricao} → ${segmento.destinoDescricao}`
}

export interface PrestacaoViagemViewProps {
  session: SaudeMunicSession
  viagemNovaId: string
  viagemProtocolo: string
  viagemStatus: string
  dataChegadaViagem: string | null
  valorReservaSaldo: number | null
  segmentos: SegmentoViagemItem[]
  prestacao: PrestacaoDetalheViagemNovaOutput | null
}

export function PrestacaoViagemView({
  session,
  viagemNovaId,
  viagemProtocolo,
  viagemStatus,
  dataChegadaViagem,
  valorReservaSaldo,
  segmentos,
  prestacao,
}: PrestacaoViagemViewProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [serverError, setServerError] = useState<string | null>(null)
  const [despesaDialogTipo, setDespesaDialogTipo] = useState<string | null>(null)
  const [enviarConfirmOpen, setEnviarConfirmOpen] = useState(false)
  const [rejeitarOpen, setRejeitarOpen] = useState(false)
  const [observacoesGestor, setObservacoesGestor] = useState('')

  const viagemConcluida = viagemStatus === 'CONCLUIDA'

  const podeLancarDespesa =
    viagemConcluida &&
    prestacao !== null &&
    (prestacao.status === 'PENDENTE' || prestacao.status === 'REJEITADA')

  const valorTotalDespesas = prestacao?.valorTotal ?? 0

  const diferencaReserva =
    valorReservaSaldo !== null ? valorTotalDespesas - valorReservaSaldo : null

  const dentroDoOrcamento =
    diferencaReserva !== null ? diferencaReserva <= 0 : null

  const itensOrdenados = useMemo(() => {
    if (!prestacao) {
      return []
    }
    return [...prestacao.itensDespesa].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    )
  }, [prestacao])

  const prazoClassificacao = prestacao ? classificarPrazo(prestacao.prazoEnvioAt) : null
  const prazoLabel = prestacao
    ? new Date(prestacao.prazoEnvioAt).toLocaleDateString('pt-BR')
    : null

  const prazoCalculado = dataChegadaViagem ? calcularPrazoEnvio(dataChegadaViagem) : null
  const prazoCalculadoLabel = prazoCalculado
    ? prazoCalculado.toLocaleDateString('pt-BR')
    : null
  const prazoRestanteLabel = prazoCalculado ? formatarPrazoRestante(prazoCalculado) : null

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

  const lancarDespesaDesabilitado = !podeLancarDespesa
  const lancarDespesaTooltip = lancarDespesaDesabilitado
    ? 'Prestação já enviada para análise.'
    : undefined

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

  const temDespesas = prestacao.itensDespesa.length > 0
  const podeEnviar =
    (prestacao.status === 'PENDENTE' || prestacao.status === 'REJEITADA') && temDespesas

  return (
    <>
      <div className="flex flex-col gap-[var(--space-6)]">
        {serverError ? <ServerError message={serverError} /> : null}

        <Card header={<CardHeader>Como registrar a prestação</CardHeader>}>
          <p className="text-[length:var(--text-sm)] text-[var(--color-text)]">
            Registre aqui todas as despesas realizadas durante a viagem. Após lançar todos os
            itens, clique em Enviar prestação para análise do gestor.
          </p>
          <p className="mt-[var(--space-2)] text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
            {prazoCalculadoLabel ? (
              <>
                Prazo: {prazoCalculadoLabel} — {prazoRestanteLabel}
              </>
            ) : (
              <>Prazo: até 10 dias corridos após a chegada.</>
            )}
          </p>
        </Card>

        {prestacao.status === 'ENVIADA' ? (
          // BLOCO-5: painel do gestor — prestação aguardando análise
          <Alert variant="info" titulo="Prestação aguardando sua análise" role="status">
            Revise todas as despesas antes de aprovar ou rejeitar.
          </Alert>
        ) : null}

        <Card
          header={
            <div className="flex flex-wrap items-center justify-between gap-[var(--space-2)]">
              <CardHeader className="border-0 p-0">Status da prestação</CardHeader>
              <PrestacaoStatusBadge status={prestacao.status} />
            </div>
          }
        >
          <div className="flex flex-col gap-[var(--space-3)]">
            <p className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
              Prazo de envio até {prazoLabel}
            </p>

            {prazoClassificacao === 'vencido' ? (
              <Alert variant="warning" role="status">
                Prazo de envio vencido. Regularize a prestação o quanto antes.
              </Alert>
            ) : prazoClassificacao === 'vencendo' ? (
              <Alert variant="warning" role="status">
                Prazo de envio em até 48 horas.
              </Alert>
            ) : null}

            {prestacao.status === 'REJEITADA' && prestacao.observacoesGestor ? (
              <Alert variant="warning" role="status">
                Prestação rejeitada: {prestacao.observacoesGestor}
              </Alert>
            ) : null}

            {prestacao.status === 'APROVADA' ? (
              <div className="flex flex-wrap items-center gap-[var(--space-2)]">
                <Badge variant="green">Aprovada</Badge>
                {prestacao.aprovadoAt ? (
                  <span className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
                    em {new Date(prestacao.aprovadoAt).toLocaleDateString('pt-BR')}
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>
        </Card>

        {/* BLOCO-5: resumo financeiro reorganizado */}
        <Card header={<CardHeader>Resumo financeiro</CardHeader>}>
          <dl
            className={cn(
              'grid gap-[var(--space-4)]',
              valorReservaSaldo !== null ? 'sm:grid-cols-3' : 'sm:grid-cols-1'
            )}
          >
            {valorReservaSaldo !== null ? (
              <div>
                <dt className="text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
                  Reserva de saldo
                </dt>
                <dd className="text-[length:var(--text-lg)] font-semibold text-[var(--color-text)]">
                  {currencyFormatter.format(valorReservaSaldo)}
                </dd>
              </div>
            ) : null}
            <div>
              <dt className="text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
                Total lançado
              </dt>
              <dd className="text-[length:var(--text-lg)] font-semibold text-[var(--color-text)]">
                {currencyFormatter.format(valorTotalDespesas)}
              </dd>
            </div>
            {valorReservaSaldo !== null && diferencaReserva !== null ? (
              <div>
                <dt className="text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
                  Situação
                </dt>
                <dd className="flex flex-col gap-[var(--space-1)]">
                  <span
                    className={cn(
                      'text-[length:var(--text-lg)] font-semibold',
                      dentroDoOrcamento
                        ? 'text-[var(--color-success)]'
                        : 'text-[var(--color-error)]'
                    )}
                  >
                    {dentroDoOrcamento ? 'Dentro do orçamento' : 'Acima da reserva'}
                  </span>
                  <span className="text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
                    {diferencaReserva > 0 ? '+' : ''}
                    {currencyFormatter.format(diferencaReserva)} em relação à reserva
                  </span>
                </dd>
              </div>
            ) : null}
          </dl>
        </Card>

        {/* BLOCO-5: botão lançar despesa sempre visível */}
        <PermissionGate session={session} permission={TFD_PERMISSIONS.REGISTRAR_DESPESA}>
          <div className="flex flex-wrap gap-[var(--space-2)]">
            <Button
              type="button"
              variant="primary"
              disabled={lancarDespesaDesabilitado || isPending}
              title={lancarDespesaTooltip}
              onClick={() => setDespesaDialogTipo('TRANSPORTE')}
            >
              <Plus className="size-4" aria-hidden="true" />
              Lançar despesa
            </Button>
          </div>
        </PermissionGate>

        <Card header={<CardHeader>Despesas lançadas</CardHeader>}>
          {itensOrdenados.length === 0 ? (
            <EmptyState
              titulo="Nenhuma despesa lançada ainda"
              descricao="Registre as despesas da viagem para compor a prestação de contas."
            />
          ) : (
            <ul className="flex flex-col gap-[var(--space-3)]">
              {itensOrdenados.map((item) => {
                const meta = TIPO_DESPESA_META[item.tipo] ?? TIPO_DESPESA_META.OUTRO!
                const trecho = labelSegmento(segmentos, item.transporteId)

                return (
                  <li
                    key={item.id}
                    className="rounded-[var(--radius-md)] border border-[var(--color-border)] p-[var(--space-4)]"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-[var(--space-3)]">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-[var(--space-2)]">
                          <Badge variant="blue" size="sm">
                            <span aria-hidden="true">{meta.emoji}</span> {meta.label}
                          </Badge>
                          <span className="text-[length:var(--text-sm)] font-semibold tabular-nums text-[var(--color-text)]">
                            {currencyFormatter.format(item.valor)}
                          </span>
                        </div>
                        {item.descricao ? (
                          <p className="mt-[var(--space-2)] text-[length:var(--text-sm)] text-[var(--color-text)]">
                            {item.descricao}
                          </p>
                        ) : null}
                        {trecho ? (
                          <p className="mt-[var(--space-1)] text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
                            Trecho: {trecho}
                          </p>
                        ) : null}
                        <p className="mt-[var(--space-1)] text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
                          Registrado em {formatDataRegistro(item.createdAt)}
                        </p>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </Card>

        {(prestacao.status === 'PENDENTE' || prestacao.status === 'REJEITADA') ? (
          <PermissionGate session={session} permission={TFD_PERMISSIONS.ENVIAR_PRESTACAO}>
            <Card header={<CardHeader>Enviar prestação</CardHeader>}>
              <div className="flex flex-col gap-[var(--space-3)]">
                {temDespesas ? (
                  <p className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
                    {prestacao.itensDespesa.length} item(ns) de despesa lançado(s). Ao enviar, a
                    prestação segue para análise do gestor.
                  </p>
                ) : null}
                <Button
                  type="button"
                  variant="primary"
                  disabled={isPending || !podeEnviar}
                  title={!podeEnviar ? 'Lance ao menos uma despesa antes de enviar.' : undefined}
                  onClick={() => setEnviarConfirmOpen(true)}
                >
                  Enviar prestação
                </Button>
              </div>
            </Card>
          </PermissionGate>
        ) : null}

        {prestacao.status === 'ENVIADA' ? (
          <PermissionGate session={session} permission={TFD_PERMISSIONS.APROVAR_PRESTACAO}>
            <Card header={<CardHeader>Decisão do gestor</CardHeader>}>
              <div className="flex flex-wrap gap-[var(--space-2)]">
                <Button
                  type="button"
                  className="bg-[var(--color-success)] text-[var(--color-header-text)] hover:bg-[color-mix(in_srgb,var(--color-success)_88%,var(--color-text))]"
                  disabled={isPending || !temDespesas}
                  onClick={() => runDecisao(true)}
                >
                  {isPending ? 'Processando…' : 'Aprovar'}
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  disabled={isPending}
                  onClick={() => {
                    setServerError(null)
                    setRejeitarOpen(true)
                  }}
                >
                  Rejeitar
                </Button>
              </div>
            </Card>
          </PermissionGate>
        ) : null}

        {prestacao.status === 'APROVADA' ? (
          <Card header={<CardHeader>Prestação concluída</CardHeader>}>
            <dl className="grid gap-[var(--space-3)] sm:grid-cols-3">
              <div>
                <dt className="text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
                  Valor total aprovado
                </dt>
                <dd className="text-[length:var(--text-lg)] font-semibold text-[var(--color-success)]">
                  {currencyFormatter.format(valorTotalDespesas)}
                </dd>
              </div>
              <div>
                <dt className="text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
                  Data de aprovação
                </dt>
                <dd className="text-[length:var(--text-sm)] text-[var(--color-text)]">
                  {prestacao.aprovadoAt
                    ? new Date(prestacao.aprovadoAt).toLocaleDateString('pt-BR')
                    : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
                  Aprovado por
                </dt>
                <dd className="text-[length:var(--text-sm)] text-[var(--color-text)]">
                  {prestacao.aprovadoPor?.nome ?? '—'}
                </dd>
              </div>
            </dl>
          </Card>
        ) : null}
      </div>

      <DespesaViagemDialog
        open={despesaDialogTipo !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDespesaDialogTipo(null)
          }
        }}
        session={session}
        viagemNovaId={viagemNovaId}
        segmentos={segmentos}
        tipoInicial={despesaDialogTipo ?? 'TRANSPORTE'}
      />

      {/* BLOCO-5: confirmação antes de enviar a prestação */}
      <Dialog open={enviarConfirmOpen} onOpenChange={setEnviarConfirmOpen}>
        <DialogContent titulo="Confirmar envio">
          <p className="text-[length:var(--text-sm)] text-[var(--color-text)]">
            Você está enviando a prestação de contas da viagem {viagemProtocolo}. Após o envio,
            não será possível adicionar ou editar despesas. Confirmar?
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

      {/* BLOCO-5: dialog de rejeição com observação obrigatória */}
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
              {isPending ? 'Processando…' : 'Confirmar rejeição'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
