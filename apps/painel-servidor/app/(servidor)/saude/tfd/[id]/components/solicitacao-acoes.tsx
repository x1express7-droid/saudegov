'use client'

import {
  parseAreaComplementoSolicitado,
  TFD_COMPLEMENTO_AREA_CONFIG,
  TFD_COMPLEMENTO_AREA_VALUES,
  TFD_PERMISSIONS,
  type TfdComplementoArea,
  type TfdProjecaoFinanceiraOutput,
  type TfdSolicitacaoDetalhe,
  type TfdViagemSolicitacaoItem,
} from '@saude/mod-saude-tfd/client'
import { enviarComplementoTfd, iniciarAnaliseTfd, solicitarComplementoTfd } from '@saude/mod-saude-tfd/actions/regulacao'
import { isStatusCancelavelTfd } from '@saude/mod-saude-tfd/utils/cancelamento'
import type { SaudeMunicSession } from '@saude/core-auth/types/session'

import {
  Alert,
  Button,
  Card,
  Select,
  Spinner,
  Textarea,
} from '@saude/ui'
import { PermissionGate } from '@saude/ui/permission-gate'
import { Receipt } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState, useTransition } from 'react'

import { CancelarSolicitacaoDialog } from './cancelar-solicitacao-dialog'
import { ReclassificarDialog } from './reclassificar-dialog'
import { DecisaoForm } from './decisao-form'
import { RetornoViagemAcao } from './retorno-viagem-acao'
import { SolicitacaoAcoesResumoFinanceiro } from './solicitacao-acoes-resumo-financeiro'
import { SolicitacaoSecaoAccordion } from './solicitacao-secao-accordion'

const MIN_TEXTO = 20

const complementoAreaOptions = TFD_COMPLEMENTO_AREA_VALUES.map((value) => ({
  value,
  label: TFD_COMPLEMENTO_AREA_CONFIG[value].label,
}))

export interface SolicitacaoAcoesProps {
  session: SaudeMunicSession
  solicitacao: TfdSolicitacaoDetalhe
  viagens: TfdViagemSolicitacaoItem[]
  projecao?: TfdProjecaoFinanceiraOutput | null
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
  viagens,
  projecao = null,
  abrirCancelamentoInicial = false,
}: SolicitacaoAcoesProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [serverError, setServerError] = useState<string | null>(null)

  const [showComplemento, setShowComplemento] = useState(false)
  const [areaComplemento, setAreaComplemento] = useState<TfdComplementoArea>('DADOS_SOLICITACAO')
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
      setAreaComplemento('DADOS_SOLICITACAO')
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
        area: areaComplemento,
        mensagem: mensagemComplemento.trim(),
      })
    )
  }

  const areaComplementoPendente = useMemo(() => {
    if (solicitacao.status !== 'PENDENTE') {
      return null
    }

    const ultimoComplementoSolicitado = [...solicitacao.tramitacoes]
      .reverse()
      .find((item) => item.tipo === 'COMPLEMENTO_SOLICITADO')

    if (!ultimoComplementoSolicitado) {
      return null
    }

    return parseAreaComplementoSolicitado(ultimoComplementoSolicitado.observacao)
  }, [solicitacao.status, solicitacao.tramitacoes])

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

  // PC-PARTE-1: PC canônica na aba da viagem nova — card informativo na solicitação
  const showPcViagemInfoCard =
    solicitacao.status === 'AGUARDANDO_PC' ||
    solicitacao.status === 'PC_EM_ANALISE' ||
    solicitacao.status === 'CONCLUIDO'

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
    showPcViagemInfoCard ||
    showCancelar

  return (
    <SolicitacaoSecaoAccordion titulo="Ações" sticky bodyClassName="flex flex-col gap-[var(--space-4)]">
      {projecao ? (
        <SolicitacaoAcoesResumoFinanceiro session={session} projecao={projecao} />
      ) : null}

      <div
        className={
          projecao
            ? 'flex flex-col gap-[var(--space-4)] border-t border-[var(--color-border)] pt-[var(--space-4)]'
            : 'flex flex-col gap-[var(--space-4)]'
        }
      >
      {!hasAnyAction ? (
        <p className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
          Nenhuma ação disponível para o status atual.
        </p>
      ) : null}

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
                    <Select
                      label="Onde o complemento deve ser feito?"
                      value={areaComplemento}
                      onValueChange={(value) => setAreaComplemento(value as TfdComplementoArea)}
                      options={complementoAreaOptions}
                      disabled={isPending}
                      hint={TFD_COMPLEMENTO_AREA_CONFIG[areaComplemento].descricao}
                    />
                    <Textarea
                      label="Mensagem ao solicitante"
                      value={mensagemComplemento}
                      onChange={(event) => setMensagemComplemento(event.target.value)}
                      rows={4}
                      disabled={isPending}
                      hint={`Mínimo de ${MIN_TEXTO} caracteres. Explique o que precisa ser corrigido ou enviado.`}
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
            {areaComplementoPendente ? (
              <Alert variant="info" role="status">
                Complemento solicitado em: <strong>{areaComplementoPendente}</strong>. Ajuste essa
                parte da solicitação e envie a resposta abaixo.
              </Alert>
            ) : null}
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
          <Card className="border-[var(--color-border)] bg-[var(--color-bg-subtle)]">
            <div className="flex gap-[var(--space-3)] p-[var(--space-4)]">
              <Receipt
                className="mt-0.5 size-5 shrink-0 text-[var(--color-primary)]"
                aria-hidden="true"
              />
              <div className="flex min-w-0 flex-col gap-[var(--space-2)]">
                <p className="text-[length:var(--text-sm)] text-[var(--color-text)]">
                  As despesas e a Prestação de Contas são gerenciadas na Viagem vinculada a este
                  processo.
                </p>
                <Link
                  href={`/saude/tfd/viagens?protocolo=${encodeURIComponent(solicitacao.protocolo)}`}
                  className="text-[length:var(--text-sm)] font-medium text-[var(--color-primary)] hover:underline"
                >
                  Ver viagens do processo →
                </Link>
              </div>
            </div>
          </Card>
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
    </SolicitacaoSecaoAccordion>
  )
}
