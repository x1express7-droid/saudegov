'use client'

import { TFD_PERMISSIONS, type TfdViagemSolicitacaoItem } from '@saude/mod-saude-tfd/client'
import { decidirPrestacaoContas, registrarVisualizacaoComprovante } from '@saude/mod-saude-tfd/actions/financeiro'
import type { SaudeMunicSession } from '@saude/core-auth/types/session'

import { Alert, Badge, Button, Spinner, Textarea } from '@saude/ui'
import { PermissionGate } from '@saude/ui/permission-gate'
import { useRouter } from 'next/navigation'
import { useMemo, useState, useTransition } from 'react'

const MIN_OBSERVACAO = 20

const TIPO_DESPESA_LABEL: Record<string, string> = {
  TRANSPORTE: 'Transporte',
  ALIMENTACAO: 'Alimentação',
  HOSPEDAGEM: 'Hospedagem',
  OUTRO: 'Outro',
}

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

function ServerError({ message }: { message: string }) {
  return (
    <p className="text-[length:var(--text-sm)] text-[var(--color-danger)]" role="alert">
      {message}
    </p>
  )
}

export interface PrestacaoAnalisePainelProps {
  session: SaudeMunicSession
  solicitacaoStatus: string
  viagens: TfdViagemSolicitacaoItem[]
}

export function PrestacaoAnalisePainel({
  session,
  solicitacaoStatus,
  viagens,
}: PrestacaoAnalisePainelProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [serverError, setServerError] = useState<string | null>(null)
  const [comprovanteEmAbertura, setComprovanteEmAbertura] = useState<string | null>(null)
  const [showRejeicao, setShowRejeicao] = useState(false)
  const [observacoesGestor, setObservacoesGestor] = useState('')

  const prestacoesEmAnalise = useMemo(
    () =>
      viagens.filter(
        (viagem) =>
          viagem.prestacao !== null &&
          viagem.prestacao.status === 'ENVIADA' &&
          solicitacaoStatus === 'PC_EM_ANALISE'
      ),
    [viagens, solicitacaoStatus]
  )

  if (prestacoesEmAnalise.length === 0) {
    return null
  }

  function runDecisao(aprovado: boolean) {
    const prestacao = prestacoesEmAnalise[0]?.prestacao
    if (!prestacao) {
      return
    }

    if (!aprovado && observacoesGestor.trim().length < MIN_OBSERVACAO) {
      setServerError('A observação do gestor deve ter pelo menos 20 caracteres.')
      return
    }

    setServerError(null)

    startTransition(async () => {
      const result = await decidirPrestacaoContas({
        prestacaoId: prestacao.id,
        aprovado,
        observacoesGestor: aprovado ? undefined : observacoesGestor.trim(),
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

  function handleVisualizarComprovante(
    prestacaoId: string,
    comprovanteAnexoId: string
  ) {
    setServerError(null)
    setComprovanteEmAbertura(comprovanteAnexoId)

    startTransition(async () => {
      const result = await registrarVisualizacaoComprovante({
        prestacaoId,
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

  return (
    <PermissionGate session={session} permission={TFD_PERMISSIONS.APROVAR_PRESTACAO}>
      <div className="flex flex-col gap-[var(--space-4)] border-t border-[var(--color-border)] pt-[var(--space-4)]">
        <h3 className="text-[length:var(--text-sm)] font-semibold text-[var(--color-text)]">
          Análise da prestação de contas
        </h3>

        {prestacoesEmAnalise.map((viagem) => {
          const prestacao = viagem.prestacao!
          const vistosIds = new Set(
            prestacao.comprovantesVistos.map((item) => item.comprovanteAnexoId)
          )

          const itensComComprovante = viagem.itensDespesa.filter(
            (item) => item.comprovanteAnexoId
          )

          const todosVisualizados = itensComComprovante.every((item) =>
            vistosIds.has(item.comprovanteAnexoId!)
          )

          const valorTotal = viagem.itensDespesa.reduce((acc, item) => acc + item.valor, 0)

          return (
            <div
              key={viagem.id}
              className="flex flex-col gap-[var(--space-3)] rounded-[var(--radius-md)] border border-[var(--color-border)] p-[var(--space-3)]"
            >
              <p className="text-[length:var(--text-sm)] font-medium text-[var(--color-text)]">
                Viagem {viagem.sequencia} — total {currencyFormatter.format(valorTotal)}
              </p>

              {viagem.itensDespesa.length === 0 ? (
                <p className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
                  Nenhum item de despesa lançado.
                </p>
              ) : (
                <ul className="flex flex-col gap-[var(--space-2)]">
                  {viagem.itensDespesa.map((item) => {
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
                                {visualizado ? 'Comprovante visto' : 'Não visualizado'}
                              </Badge>
                              <Button
                                type="button"
                                variant="secondary"
                                disabled={isPending}
                                onClick={() =>
                                  handleVisualizarComprovante(
                                    prestacao.id,
                                    item.comprovanteAnexoId!
                                  )
                                }
                              >
                                {comprovanteEmAbertura === item.comprovanteAnexoId &&
                                isPending ? (
                                  <>
                                    <Spinner className="mr-[var(--space-1)] size-3" />
                                    Abrindo…
                                  </>
                                ) : (
                                  'Ver comprovante'
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
              )}

              {!todosVisualizados && itensComComprovante.length > 0 ? (
                <Alert variant="warning" role="status">
                  Visualize todos os comprovantes antes de aprovar a prestação.
                </Alert>
              ) : null}

              {!showRejeicao ? (
                <div className="flex flex-wrap gap-[var(--space-2)]">
                  <Button
                    type="button"
                    variant="primary"
                    disabled={isPending || !todosVisualizados || viagem.itensDespesa.length === 0}
                    onClick={() => runDecisao(true)}
                  >
                    {isPending ? 'Processando…' : 'Aprovar prestação'}
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
                    Rejeitar prestação
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
          )
        })}

        {serverError ? <ServerError message={serverError} /> : null}
      </div>
    </PermissionGate>
  )
}
