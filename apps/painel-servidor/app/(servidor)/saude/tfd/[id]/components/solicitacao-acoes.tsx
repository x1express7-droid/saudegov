'use client'

import {
  TFD_PERMISSIONS,
  type AgendamentoProcessoListItem,
  type TfdSolicitacaoDetalhe,
  type TfdVeiculoAgendamentoItem,
  type TfdViagemSolicitacaoItem,
} from '@saude/mod-saude-tfd/client'
import { enviarComplementoTfd, iniciarAnaliseTfd, solicitarComplementoTfd } from '@saude/mod-saude-tfd/actions/regulacao'
import { isStatusCancelavelTfd } from '@saude/mod-saude-tfd/utils/cancelamento'
import type { SaudeMunicSession } from '@saude/core-auth/types/session'

import type { ViagemNovaPorAgendamentoItem } from '@/lib/queries/get-viagem-nova-por-agendamento'

import {
  Button,
  Card,
  CardHeader,
  Spinner,
  Textarea,
} from '@saude/ui'
import { PermissionGate } from '@saude/ui/permission-gate'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

import { CancelarSolicitacaoDialog } from './cancelar-solicitacao-dialog'
import { ReclassificarDialog } from './reclassificar-dialog'
import { DecisaoForm } from './decisao-form'
import { DespesaForm } from './despesa-form'
import { PrestacaoAnalisePainel } from './prestacao-analise-painel'
import { RetornoViagemAcao } from './retorno-viagem-acao'

const MIN_TEXTO = 20

export interface SolicitacaoAcoesProps {
  session: SaudeMunicSession
  solicitacao: TfdSolicitacaoDetalhe
  veiculosAgendamento: TfdVeiculoAgendamentoItem[]
  viagens: TfdViagemSolicitacaoItem[]
  agendamentos?: AgendamentoProcessoListItem[]
  viagensNovaPorAgendamento?: ViagemNovaPorAgendamentoItem[]
  /** Abre o dialog de cancelamento ao carregar (ex.: `?cancelar=prazo`). */
  abrirCancelamentoInicial?: boolean
}

function agendamentosDaSolicitacao(
  agendamentos: AgendamentoProcessoListItem[],
  solicitacaoId: string
): AgendamentoProcessoListItem[] {
  return agendamentos.filter((item) => item.solicitacaoId === solicitacaoId)
}

function agendamentoRealizadoMaisRecente(
  agendamentos: AgendamentoProcessoListItem[],
  solicitacaoId: string
): AgendamentoProcessoListItem | null {
  const realizados = agendamentosDaSolicitacao(agendamentos, solicitacaoId).filter(
    (item) => item.status === 'REALIZADO'
  )

  if (realizados.length === 0) {
    return null
  }

  return realizados.reduce((maisRecente, atual) =>
    atual.createdAt > maisRecente.createdAt ? atual : maisRecente
  )
}

function agendamentoMaisRecente(
  agendamentos: AgendamentoProcessoListItem[],
  solicitacaoId: string
): AgendamentoProcessoListItem | null {
  const daSolicitacao = agendamentosDaSolicitacao(agendamentos, solicitacaoId)

  if (daSolicitacao.length === 0) {
    return null
  }

  return daSolicitacao.reduce((maisRecente, atual) =>
    atual.createdAt > maisRecente.createdAt ? atual : maisRecente
  )
}

function viagemNovaDoAgendamento(
  agendamentoId: string,
  mappings: ViagemNovaPorAgendamentoItem[]
): ViagemNovaPorAgendamentoItem | null {
  return mappings.find((item) => item.agendamentoId === agendamentoId) ?? null
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
  viagens,
  agendamentos = [],
  viagensNovaPorAgendamento = [],
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

  const showAgendamentoLink =
    solicitacao.status === 'APROVADO' || solicitacao.status === 'AGENDADO'

  const showReclassificar =
    solicitacao.status === 'ENVIADO' ||
    solicitacao.status === 'EM_ANALISE' ||
    solicitacao.status === 'PENDENTE' ||
    solicitacao.status === 'APROVADO'

  const showRetorno = solicitacao.status === 'EM_VIAGEM'
  const showDespesaLegacy =
    (solicitacao.status === 'AGUARDANDO_PC' && viagens.length > 0) ||
    viagens.some(
      (viagem) =>
        viagem.prestacao?.status === 'PENDENTE' || viagem.prestacao?.status === 'REJEITADA'
    )
  const agendamentoRealizado = agendamentoRealizadoMaisRecente(agendamentos, solicitacao.id)
  const agendamentoFluxoNovo = agendamentoMaisRecente(agendamentos, solicitacao.id)
  const fluxoViagemNova = viagens.length === 0
  const viagemNovaAguardandoPc =
    agendamentoRealizado !== null
      ? viagemNovaDoAgendamento(agendamentoRealizado.id, viagensNovaPorAgendamento)
      : null
  const viagemNovaEmAnalise =
    agendamentoFluxoNovo !== null
      ? viagemNovaDoAgendamento(agendamentoFluxoNovo.id, viagensNovaPorAgendamento)
      : null
  const showPrestacaoAgendamentoAguardandoPc =
    solicitacao.status === 'AGUARDANDO_PC' &&
    !fluxoViagemNova &&
    agendamentoRealizado !== null
  const showPrestacaoViagemNovaAguardandoPc =
    solicitacao.status === 'AGUARDANDO_PC' &&
    fluxoViagemNova &&
    viagemNovaAguardandoPc !== null
  const showPrestacaoAgendamentoEmAnalise =
    solicitacao.status === 'PC_EM_ANALISE' &&
    !fluxoViagemNova &&
    agendamentoFluxoNovo !== null
  const showPrestacaoViagemNovaEmAnalise =
    solicitacao.status === 'PC_EM_ANALISE' &&
    fluxoViagemNova &&
    viagemNovaEmAnalise !== null
  const showAnalisePrestacaoLegacy =
    solicitacao.status === 'PC_EM_ANALISE' && viagens.length > 0
  const showPcViagemInfoCard =
    fluxoViagemNova &&
    (solicitacao.status === 'AGUARDANDO_PC' ||
      solicitacao.status === 'PC_EM_ANALISE' ||
      solicitacao.status === 'EM_VIAGEM' ||
      solicitacao.status === 'AGENDADO')
  const modoCancelamentoPrazo =
    solicitacao.status === 'PENDENTE' && solicitacao.elegivelCancelamentoPrazoEsgotado
  const showCancelar =
    (solicitacao.status !== 'PENDENTE' && isStatusCancelavelTfd(solicitacao.status)) ||
    modoCancelamentoPrazo

  const hasAnyAction =
    hasRegulacaoAction ||
    showReclassificar ||
    showAgendamentoLink ||
    showRetorno ||
    showDespesaLegacy ||
    showPrestacaoAgendamentoAguardandoPc ||
    showPrestacaoViagemNovaAguardandoPc ||
    showPrestacaoAgendamentoEmAnalise ||
    showPrestacaoViagemNovaEmAnalise ||
    showAnalisePrestacaoLegacy ||
    showPcViagemInfoCard ||
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

        {showReclassificar ? (
          <div className="border-t border-[var(--color-border)] pt-[var(--space-4)]">
            <ReclassificarDialog
              session={session}
              solicitacaoId={solicitacao.id}
              urgenciaAtual={solicitacao.urgencia}
            />
          </div>
        ) : null}

        {showAgendamentoLink ? (
          <PermissionGate session={session} permission={TFD_PERMISSIONS.CRIAR_AGENDAMENTO}>
            <div className="border-t border-[var(--color-border)] pt-[var(--space-4)]">
              <Button type="button" variant="primary" asChild>
                <Link
                  href={`/saude/tfd/processos/${solicitacao.processoId}/agendamentos/novo?solicitacaoId=${solicitacao.id}`}
                >
                  {/* BLOCO-1: label alinhado à etapa de agendamento (não viagem) */}
                  {solicitacao.status === 'APROVADO' ? 'Criar agendamento' : 'Novo agendamento'}
                </Link>
              </Button>
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

        {showPcViagemInfoCard ? (
          <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-subtle)] p-[var(--space-4)]">
            <p className="text-[length:var(--text-sm)] text-[var(--color-text)]">
              A prestação de contas é gerenciada pela Viagem TFD vinculada ao agendamento.
            </p>
            <Link
              href={`/saude/tfd/viagens?processoId=${encodeURIComponent(solicitacao.processoId)}`}
              className="mt-[var(--space-3)] inline-block text-[length:var(--text-sm)] font-medium text-[var(--color-primary)] hover:underline"
            >
              Ver viagens do processo →
            </Link>
          </div>
        ) : null}

        {showDespesaLegacy ? (
          <DespesaForm
            session={session}
            processoId={solicitacao.processoId}
            viagens={viagens}
          />
        ) : null}

        {showPrestacaoViagemNovaAguardandoPc && viagemNovaAguardandoPc ? (
          <div className="border-t border-[var(--color-border)] pt-[var(--space-4)]">
            <Button type="button" variant="primary" asChild>
              <Link
                href={`/saude/tfd/viagens/${viagemNovaAguardandoPc.viagemId}?tab=prestacao`}
              >
                Ver prestação de contas → {viagemNovaAguardandoPc.viagemProtocolo}
              </Link>
            </Button>
          </div>
        ) : null}

        {showPrestacaoAgendamentoAguardandoPc && agendamentoRealizado ? (
          <div className="border-t border-[var(--color-border)] pt-[var(--space-4)]">
            <Button type="button" variant="primary" asChild>
              <Link
                href={`/saude/tfd/processos/${solicitacao.processoId}/agendamentos/${agendamentoRealizado.id}/prestacao`}
              >
                Ir para Prestação de Contas
              </Link>
            </Button>
          </div>
        ) : null}

        {showPrestacaoViagemNovaEmAnalise && viagemNovaEmAnalise ? (
          <div className="border-t border-[var(--color-border)] pt-[var(--space-4)]">
            <Button type="button" variant="primary" asChild>
              <Link
                href={`/saude/tfd/viagens/${viagemNovaEmAnalise.viagemId}?tab=prestacao`}
              >
                Ver prestação de contas → {viagemNovaEmAnalise.viagemProtocolo}
              </Link>
            </Button>
          </div>
        ) : null}

        {showPrestacaoAgendamentoEmAnalise && agendamentoFluxoNovo ? (
          <div className="border-t border-[var(--color-border)] pt-[var(--space-4)]">
            <Button type="button" variant="primary" asChild>
              <Link
                href={`/saude/tfd/processos/${solicitacao.processoId}/agendamentos/${agendamentoFluxoNovo.id}/prestacao`}
              >
                Ver análise da Prestação
              </Link>
            </Button>
          </div>
        ) : null}

        {showAnalisePrestacaoLegacy ? (
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
