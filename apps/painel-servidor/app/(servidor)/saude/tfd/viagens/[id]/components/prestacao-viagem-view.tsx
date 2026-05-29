'use client'

import type { PrestacaoDetalheViagemNovaOutput, SegmentoViagemItem } from '@saude/mod-saude-tfd'
import { TFD_PERMISSIONS } from '@saude/mod-saude-tfd/client'
import {
  decidirPrestacaoContasViagemNova,
  enviarPrestacaoContasViagemNova,
  registrarVisualizacaoComprovanteViagemNova,
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
  EmptyState,
  Spinner,
  Textarea,
} from '@saude/ui'
import { PermissionGate } from '@saude/ui/permission-gate'
import { Eye, EyeOff, FileCheck, Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useMemo, useState, useTransition } from 'react'

import { DespesaViagemDialog } from './despesa-viagem-dialog'

const TIPOS_DESPESA = ['TRANSPORTE', 'ALIMENTACAO', 'HOSPEDAGEM', 'OUTRO'] as const

const TIPO_DESPESA_LABEL: Record<string, string> = {
  TRANSPORTE: 'Transporte',
  ALIMENTACAO: 'Alimentação',
  HOSPEDAGEM: 'Hospedagem',
  OUTRO: 'Outro',
}

const MIN_OBSERVACAO = 20

function ServerError({ message }: { message: string }) {
  return (
    <p className="text-[length:var(--text-sm)] text-[var(--color-danger)]" role="alert">
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

export interface PrestacaoViagemViewProps {
  session: SaudeMunicSession
  viagemNovaId: string
  processoId: string
  viagemStatus: string
  custoEstimado: string | null
  segmentos: SegmentoViagemItem[]
  prestacao: PrestacaoDetalheViagemNovaOutput | null
}

export function PrestacaoViagemView({
  session,
  viagemNovaId,
  processoId,
  viagemStatus,
  custoEstimado,
  segmentos,
  prestacao,
}: PrestacaoViagemViewProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [serverError, setServerError] = useState<string | null>(null)
  const [despesaDialogTipo, setDespesaDialogTipo] = useState<string | null>(null)
  const [comprovanteEmAbertura, setComprovanteEmAbertura] = useState<string | null>(null)
  const [showRejeicao, setShowRejeicao] = useState(false)
  const [observacoesGestor, setObservacoesGestor] = useState('')

  const viagemConcluida = viagemStatus === 'CONCLUIDA'

  const podeLancarDespesa =
    viagemConcluida &&
    prestacao !== null &&
    (prestacao.status === 'PENDENTE' || prestacao.status === 'REJEITADA')

  const custoEstimadoNumero = custoEstimado ? Number.parseFloat(custoEstimado) : null
  const valorTotalDespesas = prestacao?.valorTotal ?? 0

  const diferencaDespesas =
    custoEstimadoNumero !== null && Number.isFinite(custoEstimadoNumero)
      ? valorTotalDespesas - custoEstimadoNumero
      : null

  const itensPorTipo = useMemo(() => {
    const map = new Map<string, PrestacaoDetalheViagemNovaOutput['itensDespesa']>()
    for (const tipo of TIPOS_DESPESA) {
      map.set(tipo, [])
    }
    if (!prestacao) {
      return map
    }
    for (const item of prestacao.itensDespesa) {
      const lista = map.get(item.tipo) ?? []
      lista.push(item)
      map.set(item.tipo, lista)
    }
    return map
  }, [prestacao])

  const vistosIds = useMemo(
    () => new Set(prestacao?.comprovantesVistos.map((item) => item.comprovanteAnexoId) ?? []),
    [prestacao?.comprovantesVistos]
  )

  const itensComComprovante =
    prestacao?.itensDespesa.filter((item) => item.comprovanteAnexoId) ?? []

  const todosComprovantesVisualizados =
    itensComComprovante.length === 0 ||
    itensComComprovante.every((item) => vistosIds.has(item.comprovanteAnexoId!))

  const prazoClassificacao = prestacao ? classificarPrazo(prestacao.prazoEnvioAt) : null
  const prazoLabel = prestacao
    ? new Date(prestacao.prazoEnvioAt).toLocaleDateString('pt-BR')
    : null

  function handleEnviarPrestacao() {
    setServerError(null)
    startTransition(async () => {
      const result = await enviarPrestacaoContasViagemNova({ viagemNovaId })
      if (!result.success) {
        setServerError(result.error ?? 'Não foi possível enviar a prestação de contas.')
        return
      }
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

      setShowRejeicao(false)
      setObservacoesGestor('')
      router.refresh()
    })
  }

  function handleVisualizarComprovante(comprovanteAnexoId: string) {
    setServerError(null)
    setComprovanteEmAbertura(comprovanteAnexoId)

    startTransition(async () => {
      const result = await registrarVisualizacaoComprovanteViagemNova({
        viagemNovaId,
        comprovanteAnexoId,
      })

      setComprovanteEmAbertura(null)

      if (!result.success) {
        setServerError(result.error ?? 'Não foi possível abrir o comprovante.')
        return
      }

      window.open(result.data.url, '_blank', 'noopener,noreferrer')
      router.refresh()
    })
  }

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
          </div>
        </Card>

        {!temDespesas ? (
          <EmptyState
            titulo="Nenhuma despesa lançada ainda"
            descricao="Registre as despesas da viagem para compor a prestação de contas."
            cta={
              podeLancarDespesa ? (
                <PermissionGate session={session} permission={TFD_PERMISSIONS.REGISTRAR_DESPESA}>
                  <Button
                    type="button"
                    variant="primary"
                    onClick={() => setDespesaDialogTipo('TRANSPORTE')}
                  >
                    <Plus className="mr-1 size-3.5" aria-hidden="true" />
                    Lançar despesa
                  </Button>
                </PermissionGate>
              ) : undefined
            }
          />
        ) : (
          <>
            <Card header={<CardHeader>Resumo financeiro</CardHeader>}>
              <dl className="grid gap-[var(--space-3)] sm:grid-cols-3">
                <div>
                  <dt className="text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
                    Custo estimado da viagem
                  </dt>
                  <dd className="text-[length:var(--text-lg)] font-semibold text-[var(--color-text)]">
                    {custoEstimadoNumero !== null && Number.isFinite(custoEstimadoNumero)
                      ? currencyFormatter.format(custoEstimadoNumero)
                      : '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
                    Total de despesas registradas
                  </dt>
                  <dd className="text-[length:var(--text-lg)] font-semibold text-[var(--color-text)]">
                    {currencyFormatter.format(valorTotalDespesas)}
                  </dd>
                </div>
                <div>
                  <dt className="text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
                    Diferença
                  </dt>
                  <dd
                    className={cn(
                      'text-[length:var(--text-lg)] font-semibold',
                      diferencaDespesas === null
                        ? 'text-[var(--color-text-muted)]'
                        : diferencaDespesas > 0
                          ? 'text-[var(--color-danger)]'
                          : diferencaDespesas < 0
                            ? 'text-[var(--color-success)]'
                            : 'text-[var(--color-text)]'
                    )}
                  >
                    {diferencaDespesas !== null
                      ? `${diferencaDespesas > 0 ? '+' : ''}${currencyFormatter.format(diferencaDespesas)}`
                      : '—'}
                  </dd>
                </div>
              </dl>
            </Card>

            {TIPOS_DESPESA.map((tipo) => {
              const itens = itensPorTipo.get(tipo) ?? []
              return (
                <Card
                  key={tipo}
                  header={
                    <div className="flex flex-wrap items-center justify-between gap-[var(--space-2)]">
                      <CardHeader className="border-0 p-0">
                        {TIPO_DESPESA_LABEL[tipo] ?? tipo}
                      </CardHeader>
                      {podeLancarDespesa ? (
                        <PermissionGate
                          session={session}
                          permission={TFD_PERMISSIONS.REGISTRAR_DESPESA}
                        >
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setDespesaDialogTipo(tipo)}
                          >
                            <Plus className="mr-1 size-3.5" aria-hidden="true" />
                            Lançar despesa
                          </Button>
                        </PermissionGate>
                      ) : null}
                    </div>
                  }
                >
                  {itens.length === 0 ? (
                    <p className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
                      Nenhuma despesa nesta categoria.
                    </p>
                  ) : (
                    <ul className="flex flex-col gap-[var(--space-2)]">
                      {itens.map((item) => {
                        const temComprovante = Boolean(item.comprovanteAnexoId)
                        const visualizado =
                          temComprovante && vistosIds.has(item.comprovanteAnexoId!)

                        return (
                          <li
                            key={item.id}
                            className="flex flex-wrap items-center justify-between gap-[var(--space-2)] rounded-[var(--radius)] border border-[var(--color-border)] px-[var(--space-3)] py-[var(--space-2)]"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="text-[length:var(--text-sm)] font-medium text-[var(--color-text)]">
                                {item.descricao ?? TIPO_DESPESA_LABEL[item.tipo] ?? item.tipo}
                              </p>
                              <p className="text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
                                {currencyFormatter.format(item.valor)}
                                {' · '}
                                {item.responsavelPagamento === 'PACIENTE_REEMBOLSO'
                                  ? 'Paciente (reembolso)'
                                  : 'Município'}
                              </p>
                            </div>
                            <div className="flex items-center gap-[var(--space-2)]">
                              {temComprovante ? (
                                <>
                                  {visualizado ? (
                                    <Eye
                                      className="size-4 text-[var(--color-success)]"
                                      aria-label="Comprovante visualizado"
                                    />
                                  ) : (
                                    <EyeOff
                                      className="size-4 text-[var(--color-text-muted)]"
                                      aria-label="Comprovante não visualizado"
                                    />
                                  )}
                                  <FileCheck
                                    className="size-4 text-[var(--color-success)]"
                                    aria-hidden="true"
                                  />
                                </>
                              ) : (
                                <span className="text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
                                  Sem comprovante
                                </span>
                              )}
                            </div>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </Card>
              )
            })}

            {(prestacao.status === 'PENDENTE' || prestacao.status === 'REJEITADA') ? (
              <PermissionGate session={session} permission={TFD_PERMISSIONS.ENVIAR_PRESTACAO}>
                <Card header={<CardHeader>Enviar prestação</CardHeader>}>
                  <div className="flex flex-col gap-[var(--space-3)]">
                    {!podeEnviar ? (
                      <Alert variant="info" role="status">
                        Lance pelo menos um item de despesa antes de enviar a prestação para
                        análise.
                      </Alert>
                    ) : (
                      <p className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
                        {prestacao.itensDespesa.length} item(ns) de despesa lançado(s). Ao enviar,
                        a prestação segue para análise do gestor.
                      </p>
                    )}
                    <Button
                      type="button"
                      variant="primary"
                      onClick={handleEnviarPrestacao}
                      disabled={isPending || !podeEnviar}
                    >
                      {isPending ? (
                        <>
                          <Spinner className="mr-[var(--space-2)] size-4" />
                          Enviando…
                        </>
                      ) : (
                        'Enviar prestação'
                      )}
                    </Button>
                  </div>
                </Card>
              </PermissionGate>
            ) : null}
          </>
        )}

        {prestacao.status === 'ENVIADA' ? (
          <PermissionGate session={session} permission={TFD_PERMISSIONS.APROVAR_PRESTACAO}>
            <Card header={<CardHeader>Análise da prestação</CardHeader>}>
              <div className="flex flex-col gap-[var(--space-4)]">
                <p className="text-[length:var(--text-sm)] font-medium text-[var(--color-text)]">
                  Total {currencyFormatter.format(valorTotalDespesas)}
                </p>

                <ul className="flex flex-col gap-[var(--space-2)]">
                  {prestacao.itensDespesa.map((item) => {
                    const temComprovante = Boolean(item.comprovanteAnexoId)
                    const visualizado =
                      temComprovante && vistosIds.has(item.comprovanteAnexoId!)

                    return (
                      <li
                        key={item.id}
                        className="flex flex-wrap items-center justify-between gap-[var(--space-2)] rounded-[var(--radius)] border border-[var(--color-border)] px-[var(--space-3)] py-[var(--space-2)]"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-[length:var(--text-sm)] font-medium text-[var(--color-text)]">
                            {TIPO_DESPESA_LABEL[item.tipo] ?? item.tipo} —{' '}
                            {currencyFormatter.format(item.valor)}
                          </p>
                          {item.descricao ? (
                            <p className="text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
                              {item.descricao}
                            </p>
                          ) : null}
                        </div>

                        <div className="flex flex-wrap items-center gap-[var(--space-2)]">
                          {temComprovante ? (
                            <>
                              <Badge variant={visualizado ? 'green' : 'orange'} size="sm">
                                {visualizado ? 'Visualizado' : 'Não visualizado'}
                              </Badge>
                              <Button
                                type="button"
                                variant="secondary"
                                disabled={isPending}
                                onClick={() =>
                                  handleVisualizarComprovante(item.comprovanteAnexoId!)
                                }
                              >
                                {comprovanteEmAbertura === item.comprovanteAnexoId && isPending ? (
                                  <>
                                    <Spinner className="mr-[var(--space-1)] size-3" />
                                    Abrindo…
                                  </>
                                ) : (
                                  'Visualizar'
                                )}
                              </Button>
                            </>
                          ) : (
                            <Badge variant="gray" size="sm">
                              Sem comprovante
                            </Badge>
                          )}
                        </div>
                      </li>
                    )
                  })}
                </ul>

                {!todosComprovantesVisualizados && itensComComprovante.length > 0 ? (
                  <Alert variant="warning" role="status">
                    Visualize todos os comprovantes antes de aprovar a prestação.
                  </Alert>
                ) : null}

                {!showRejeicao ? (
                  <div className="flex flex-wrap gap-[var(--space-2)]">
                    <Button
                      type="button"
                      variant="primary"
                      disabled={
                        isPending || !todosComprovantesVisualizados || !temDespesas
                      }
                      onClick={() => runDecisao(true)}
                    >
                      {isPending ? 'Processando…' : 'Aprovar'}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={isPending}
                      onClick={() => {
                        setServerError(null)
                        setShowRejeicao(true)
                      }}
                    >
                      Rejeitar
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-[var(--space-3)]">
                    <Textarea
                      label="Observação do gestor"
                      value={observacoesGestor}
                      onChange={(event) => setObservacoesGestor(event.target.value)}
                      rows={4}
                      disabled={isPending}
                      hint={`Mínimo de ${MIN_OBSERVACAO} caracteres.`}
                    />
                    <div className="flex flex-wrap gap-[var(--space-2)]">
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={isPending}
                        onClick={() => runDecisao(false)}
                      >
                        {isPending ? 'Processando…' : 'Confirmar rejeição'}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        disabled={isPending}
                        onClick={() => setShowRejeicao(false)}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                )}
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
        processoId={processoId}
        viagemNovaId={viagemNovaId}
        segmentos={segmentos}
        tipoInicial={despesaDialogTipo ?? 'TRANSPORTE'}
      />
    </>
  )
}
