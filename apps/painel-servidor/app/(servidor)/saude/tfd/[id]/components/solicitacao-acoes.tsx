'use client'

import {
  TFD_PERMISSIONS,
  type ContextoDecisaoTfd,
  type SaldoListItem,
  type TfdSolicitacaoDetalhe,
  type TfdVeiculoAgendamentoItem,
  type TfdViagemSolicitacaoItem,
} from '@saude/mod-saude-tfd/client'
import { enviarComplementoTfd, iniciarAnaliseTfd, solicitarComplementoTfd } from '@saude/mod-saude-tfd/actions/regulacao'
import { isStatusCancelavelTfd } from '@saude/mod-saude-tfd/utils/cancelamento'
import type { SaudeMunicSession } from '@saude/core-auth/types/session'

import {
  Button,
  Card,
  CardHeader,
  Input,
  Select,
  Spinner,
  Textarea,
} from '@saude/ui'
import { PermissionGate } from '@saude/ui/permission-gate'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

import { AgendamentoForm } from './agendamento-form'
import { CancelarSolicitacaoDialog } from './cancelar-solicitacao-dialog'
import { DecisaoForm } from './decisao-form'
import { DespesaForm } from './despesa-form'
import { PrestacaoAnalisePainel } from './prestacao-analise-painel'
import { RetornoViagemAcao } from './retorno-viagem-acao'

const MIN_TEXTO = 20

export interface SolicitacaoAcoesProps {
  session: SaudeMunicSession
  solicitacao: TfdSolicitacaoDetalhe
  saldosAtivos: SaldoListItem[]
  canLoadSaldos: boolean
  contextoDecisao: ContextoDecisaoTfd | null
  veiculosAgendamento: TfdVeiculoAgendamentoItem[]
  viagens: TfdViagemSolicitacaoItem[]
  /** Abre o dialog de cancelamento ao carregar (ex.: `?cancelar=prazo`). */
  abrirCancelamentoInicial?: boolean
}

function ServerError({ message }: { message: string }) {
  return (
    <p className="text-[length:var(--text-sm)] text-[var(--color-danger)]" role="alert">
      {message}
    </p>
  )
}

export function SolicitacaoAcoes({
  session,
  solicitacao,
  saldosAtivos,
  canLoadSaldos,
  contextoDecisao,
  veiculosAgendamento,
  viagens,
  abrirCancelamentoInicial = false,
}: SolicitacaoAcoesProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [serverError, setServerError] = useState<string | null>(null)

  const [showComplemento, setShowComplemento] = useState(false)
  const [mensagemComplemento, setMensagemComplemento] = useState('')

  const [showEnviarComplemento, setShowEnviarComplemento] = useState(false)
  const [textoComplemento, setTextoComplemento] = useState('')

  const [showDecidir, setShowDecidir] = useState(false)

  function runAction(action: () => Promise<{ success: boolean; error?: string }>) {
    setServerError(null)
    startTransition(async () => {
      const result = await action()
      if (!result.success) {
        setServerError(result.error ?? 'Não foi possível concluir a ação.')
        return
      }

      setShowComplemento(false)
      setShowEnviarComplemento(false)
      setShowDecidir(false)
      setMensagemComplemento('')
      setTextoComplemento('')
      router.refresh()
    })
  }

  function handleIniciarAnalise() {
    runAction(() => iniciarAnaliseTfd({ solicitacaoId: solicitacao.id }))
  }

  function handleSolicitarComplemento() {
    if (mensagemComplemento.trim().length < MIN_TEXTO) {
      setServerError('A mensagem deve ter pelo menos 20 caracteres.')
      return
    }
    runAction(() =>
      solicitarComplementoTfd({
        solicitacaoId: solicitacao.id,
        mensagem: mensagemComplemento.trim(),
      })
    )
  }

  function handleEnviarComplemento() {
    if (textoComplemento.trim().length < MIN_TEXTO) {
      setServerError('O texto deve ter pelo menos 20 caracteres.')
      return
    }
    runAction(() =>
      enviarComplementoTfd({
        solicitacaoId: solicitacao.id,
        texto: textoComplemento.trim(),
      })
    )
  }

  const hasRegulacaoAction =
    solicitacao.status === 'ENVIADO' ||
    solicitacao.status === 'EM_ANALISE' ||
    solicitacao.status === 'PENDENTE'

  const showAgendamentoForm =
    solicitacao.status === 'APROVADO' || solicitacao.status === 'AGENDADO'

  const showRetorno = solicitacao.status === 'EM_VIAGEM'
  const showDespesa =
    solicitacao.status === 'AGUARDANDO_PC' ||
    viagens.some(
      (viagem) =>
        viagem.prestacao?.status === 'PENDENTE' || viagem.prestacao?.status === 'REJEITADA'
    )
  const showAnalisePrestacao = solicitacao.status === 'PC_EM_ANALISE'
  const modoCancelamentoPrazo =
    solicitacao.status === 'PENDENTE' && solicitacao.elegivelCancelamentoPrazoEsgotado
  const showCancelar =
    (solicitacao.status !== 'PENDENTE' && isStatusCancelavelTfd(solicitacao.status)) ||
    modoCancelamentoPrazo

  const hasAnyAction =
    hasRegulacaoAction ||
    showAgendamentoForm ||
    showRetorno ||
    showDespesa ||
    showAnalisePrestacao ||
    showCancelar

  return (
    <Card header={<CardHeader>Ações</CardHeader>} className="lg:sticky lg:top-[var(--space-4)]">
      {!hasAnyAction ? (
        <p className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
          Nenhuma ação disponível para o status atual.
        </p>
      ) : null}

      <div className="flex flex-col gap-[var(--space-4)]">
        {solicitacao.status === 'ENVIADO' ? (
          <PermissionGate session={session} permission={TFD_PERMISSIONS.ANALISAR_LAUDO}>
            <div className="flex flex-col gap-[var(--space-2)]">
              <Button
                type="button"
                variant="primary"
                onClick={handleIniciarAnalise}
                disabled={isPending}
              >
                {isPending ? (
                  <>
                    <Spinner className="mr-[var(--space-2)] size-4" />
                    Iniciando…
                  </>
                ) : (
                  'Iniciar análise'
                )}
              </Button>
            </div>
          </PermissionGate>
        ) : null}

        {solicitacao.status === 'EM_ANALISE' ? (
          <>
            <PermissionGate session={session} permission={TFD_PERMISSIONS.SOLICITAR_COMPLEMENTO}>
              <div className="flex flex-col gap-[var(--space-2)]">
                {!showComplemento ? (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setServerError(null)
                      setShowComplemento(true)
                    }}
                    disabled={isPending}
                  >
                    Solicitar complemento
                  </Button>
                ) : (
                  <>
                    <Textarea
                      label="Mensagem ao solicitante"
                      value={mensagemComplemento}
                      onChange={(event) => setMensagemComplemento(event.target.value)}
                      rows={4}
                      disabled={isPending}
                      hint={`Mínimo de ${MIN_TEXTO} caracteres.`}
                    />
                    <div className="flex flex-wrap gap-[var(--space-2)]">
                      <Button
                        type="button"
                        variant="primary"
                        onClick={handleSolicitarComplemento}
                        disabled={isPending}
                      >
                        {isPending ? 'Enviando…' : 'Confirmar solicitação'}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setShowComplemento(false)}
                        disabled={isPending}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </PermissionGate>

            <PermissionGate session={session} permission={TFD_PERMISSIONS.DECIDIR_SOLICITACAO}>
              <div className="flex flex-col gap-[var(--space-2)] border-t border-[var(--color-border)] pt-[var(--space-4)]">
                {!showDecidir ? (
                  <Button
                    type="button"
                    variant="primary"
                    onClick={() => {
                      setServerError(null)
                      setShowDecidir(true)
                    }}
                    disabled={isPending}
                  >
                    Decidir solicitação
                  </Button>
                ) : (
                  <DecisaoForm
                    solicitacaoId={solicitacao.id}
                    saldosAtivos={saldosAtivos}
                    canLoadSaldos={canLoadSaldos}
                    contextoVedacoes={contextoDecisao}
                    onSuccess={() => {
                      setServerError(null)
                      setShowDecidir(false)
                      router.refresh()
                    }}
                    onError={setServerError}
                    onCancel={() => setShowDecidir(false)}
                  />
                )}
              </div>
            </PermissionGate>
          </>
        ) : null}

        {solicitacao.status === 'PENDENTE' ? (
          <div className="flex flex-col gap-[var(--space-2)]">
            {!showEnviarComplemento ? (
              <Button
                type="button"
                variant="primary"
                onClick={() => {
                  setServerError(null)
                  setShowEnviarComplemento(true)
                }}
                disabled={isPending}
              >
                Enviar complemento
              </Button>
            ) : (
              <>
                <Textarea
                  label="Texto do complemento"
                  value={textoComplemento}
                  onChange={(event) => setTextoComplemento(event.target.value)}
                  rows={4}
                  disabled={isPending}
                  hint={`Mínimo de ${MIN_TEXTO} caracteres.`}
                />
                <div className="flex flex-wrap gap-[var(--space-2)]">
                  <Button
                    type="button"
                    variant="primary"
                    onClick={handleEnviarComplemento}
                    disabled={isPending}
                  >
                    {isPending ? 'Enviando…' : 'Confirmar envio'}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setShowEnviarComplemento(false)}
                    disabled={isPending}
                  >
                    Cancelar
                  </Button>
                </div>
              </>
            )}
          </div>
        ) : null}

        {showAgendamentoForm ? (
          <PermissionGate session={session} permission={TFD_PERMISSIONS.AGENDAR_VIAGEM}>
            <div className="border-t border-[var(--color-border)] pt-[var(--space-4)]">
              <AgendamentoForm
                solicitacaoId={solicitacao.id}
                veiculos={veiculosAgendamento}
                titulo={
                  solicitacao.status === 'APROVADO'
                    ? 'Agendar viagem'
                    : 'Agendar nova viagem'
                }
              />
            </div>
          </PermissionGate>
        ) : null}

        {showRetorno ? (
          <RetornoViagemAcao
            session={session}
            solicitacaoStatus={solicitacao.status}
            viagens={viagens}
          />
        ) : null}

        {showDespesa ? (
          <DespesaForm
            session={session}
            processoId={solicitacao.processoId}
            viagens={viagens}
          />
        ) : null}

        {showAnalisePrestacao ? (
          <PrestacaoAnalisePainel
            session={session}
            solicitacaoStatus={solicitacao.status}
            viagens={viagens}
          />
        ) : null}

        {showCancelar ? (
          <PermissionGate session={session} permission={TFD_PERMISSIONS.CANCELAR_PROCESSO}>
            <div className="border-t border-[var(--color-border)] pt-[var(--space-4)]">
              <CancelarSolicitacaoDialog
                solicitacaoId={solicitacao.id}
                protocolo={solicitacao.protocolo}
                modoPrazoEsgotado={modoCancelamentoPrazo}
                abrirInicialmente={abrirCancelamentoInicial && modoCancelamentoPrazo}
              />
            </div>
          </PermissionGate>
        ) : null}

        {serverError ? <ServerError message={serverError} /> : null}
      </div>
    </Card>
  )
}
