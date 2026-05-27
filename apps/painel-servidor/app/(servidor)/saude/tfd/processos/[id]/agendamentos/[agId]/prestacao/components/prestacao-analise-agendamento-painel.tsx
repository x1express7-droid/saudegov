'use client'

import { TFD_PERMISSIONS } from '@saude/mod-saude-tfd/client'
import {
  decidirPrestacaoContas,
  decidirPrestacaoContasAgendamento,
  registrarVisualizacaoComprovante,
  registrarVisualizacaoComprovanteAgendamento,
} from '@saude/mod-saude-tfd/actions/financeiro'
import type { SaudeMunicSession } from '@saude/core-auth/types/session'

import { Alert, Badge, Button, Card, CardHeader, Spinner, Textarea } from '@saude/ui'
import { PermissionGate } from '@saude/ui/permission-gate'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

import { currencyFormatter } from '../../components/transporte-constants'

const MIN_OBSERVACAO = 20

const TIPO_DESPESA_LABEL: Record<string, string> = {
  TRANSPORTE: 'Transporte',
  ALIMENTACAO: 'Alimentação',
  HOSPEDAGEM: 'Hospedagem',
  OUTRO: 'Outro',
}

export interface ItemDespesaPrestacao {
  id: string
  tipo: string
  valor: number
  descricao: string | null
  comprovanteAnexoId: string | null
}

export interface PrestacaoAnaliseAgendamentoPainelProps {
  session: SaudeMunicSession
  solicitacaoStatus: string
  prestacaoId: string
  prestacaoStatus: string
  usaFluxoAgendamento: boolean
  comprovantesVistos: Array<{ comprovanteAnexoId: string }>
  itensDespesa: ItemDespesaPrestacao[]
}

function ServerError({ message }: { message: string }) {
  return (
    <p className="text-[length:var(--text-sm)] text-[var(--color-danger)]" role="alert">
      {message}
    </p>
  )
}

export function PrestacaoAnaliseAgendamentoPainel({
  session,
  solicitacaoStatus,
  prestacaoId,
  prestacaoStatus,
  usaFluxoAgendamento,
  comprovantesVistos,
  itensDespesa,
}: PrestacaoAnaliseAgendamentoPainelProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [serverError, setServerError] = useState<string | null>(null)
  const [comprovanteEmAbertura, setComprovanteEmAbertura] = useState<string | null>(null)
  const [showRejeicao, setShowRejeicao] = useState(false)
  const [observacoesGestor, setObservacoesGestor] = useState('')

  if (prestacaoStatus !== 'ENVIADA' || solicitacaoStatus !== 'PC_EM_ANALISE') {
    return null
  }

  const vistosIds = new Set(comprovantesVistos.map((item) => item.comprovanteAnexoId))

  const itensComComprovante = itensDespesa.filter((item) => item.comprovanteAnexoId)

  const todosVisualizados = itensComComprovante.every((item) =>
    vistosIds.has(item.comprovanteAnexoId!)
  )

  const valorTotal = itensDespesa.reduce((acc, item) => acc + item.valor, 0)

  function runDecisao(aprovado: boolean) {
    if (!aprovado && observacoesGestor.trim().length < MIN_OBSERVACAO) {
      setServerError('A observação do gestor deve ter pelo menos 20 caracteres.')
      return
    }

    setServerError(null)

    startTransition(async () => {
      const result = usaFluxoAgendamento
        ? await decidirPrestacaoContasAgendamento({
            prestacaoId,
            decisao: aprovado ? 'APROVADA' : 'REJEITADA',
            observacoesGestor: aprovado ? undefined : observacoesGestor.trim(),
          })
        : await decidirPrestacaoContas({
            prestacaoId,
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

  function handleVisualizarComprovante(comprovanteAnexoId: string) {
    setServerError(null)
    setComprovanteEmAbertura(comprovanteAnexoId)

    startTransition(async () => {
      const result = usaFluxoAgendamento
        ? await registrarVisualizacaoComprovanteAgendamento({
            prestacaoId,
            comprovanteAnexoId,
          })
        : await registrarVisualizacaoComprovante({
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
      <Card header={<CardHeader>Análise da prestação</CardHeader>}>
        <div className="flex flex-col gap-[var(--space-4)]">
          <p className="text-[length:var(--text-sm)] font-medium text-[var(--color-text)]">
            Total {currencyFormatter.format(valorTotal)}
          </p>

          {itensDespesa.length === 0 ? (
            <p className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
              Nenhum item de despesa lançado.
            </p>
          ) : (
            <ul className="flex flex-col gap-[var(--space-2)]">
              {itensDespesa.map((item) => {
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
                              handleVisualizarComprovante(item.comprovanteAnexoId!)
                            }
                          >
                            {comprovanteEmAbertura === item.comprovanteAnexoId && isPending ? (
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
                disabled={isPending || !todosVisualizados || itensDespesa.length === 0}
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

          {serverError ? <ServerError message={serverError} /> : null}
        </div>
      </Card>
    </PermissionGate>
  )
}
