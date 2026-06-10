'use client'

import type {
  PrestacaoDetalheViagemNovaOutput,
  SegmentoViagemItem,
  ViagemDetalheOutput,
} from '@saude/mod-saude-tfd'
import { TFD_PERMISSIONS } from '@saude/mod-saude-tfd/client'
import {
  atualizarAdiantamentoViagemPc,
  decidirPrestacaoContasViagemNova,
  enviarPrestacaoContasViagemNova,
  excluirItemDespesaViagemNova,
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
  Input,
  Spinner,
  Textarea,
  TFD_TIPO_DESPESA_CONFIG,
  type TfdTipoDespesaConfigKey,
} from '@saude/ui'
import { PermissionGate } from '@saude/ui/permission-gate'
import {
  AlertCircle,
  Anchor,
  ArrowLeftRight,
  Bed,
  Bus,
  Car,
  FileCheck,
  Hotel,
  MoreHorizontal,
  Plane,
  Plus,
  Trash2,
  UserCheck,
  Utensils,
  type LucideIcon,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useMemo, useState, useTransition } from 'react'

import { DespesaViagemDialog } from './despesa-viagem-dialog'
import { calcularSugestoesPcViagem } from './pc-sugestoes'

const MIN_OBSERVACAO = 20

interface DespesaDialogState {
  open: boolean
  tipoInicial: TfdTipoDespesaConfigKey
  valorInicial?: string
  quantidadeDiasInicial?: number
}

// PC-PARTE-3/4: aba PC da viagem — sugestões automáticas e instruções de devolução
// PC-PARTE-3: ícones por tipo de despesa (TFD_TIPO_DESPESA_CONFIG.icone)
const ICONE_DESPESA: Record<string, LucideIcon> = {
  Bus,
  Plane,
  Anchor,
  Hotel,
  UserCheck,
  AlertCircle,
  ArrowLeftRight,
  Car,
  Utensils,
  Bed,
  MoreHorizontal,
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

function diasRestantesPrazo(prazoEnvioAt: string): number {
  const prazo = new Date(prazoEnvioAt)
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  prazo.setHours(0, 0, 0, 0)
  return Math.ceil((prazo.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24))
}

function labelDiasRestantes(dias: number): string {
  if (dias < 0) {
    return 'prazo vencido'
  }
  if (dias === 0) {
    return 'vence hoje'
  }
  if (dias === 1) {
    return '1 dia restante'
  }
  return `${dias} dias restantes`
}

function corPrazo(dias: number): 'success' | 'warning' | 'error' {
  if (dias < 0) {
    return 'error'
  }
  if (dias <= 5) {
    return 'warning'
  }
  return 'success'
}

function instrucaoPorStatus(
  status: string,
  observacoesGestor: string | null,
  aprovadoAt: string | null
): string {
  switch (status) {
    case 'PENDENTE':
      return 'Lance todas as despesas realizadas na viagem e envie para análise do gestor em até 10 dias após o retorno. Documentos como passagens e comprovantes de hospedagem devem ser anexados.'
    case 'ENVIADA':
      return 'Prestação enviada. Aguardando análise do gestor financeiro. Nenhuma alteração é permitida.'
    case 'APROVADA':
      return `Prestação aprovada${aprovadoAt ? ` em ${new Date(aprovadoAt).toLocaleDateString('pt-BR')}` : ''}. O saldo foi atualizado automaticamente.`
    case 'REJEITADA':
      return `Prestação rejeitada.${observacoesGestor ? ` Motivo: ${observacoesGestor}` : ''} Corrija os itens indicados e reenvie.`
    default:
      return ''
  }
}

function labelTipoDespesa(tipo: string): { label: string; isLegado: boolean; Icon: LucideIcon } {
  const config = TFD_TIPO_DESPESA_CONFIG[tipo as TfdTipoDespesaConfigKey]
  if (!config) {
    return { label: tipo, isLegado: false, Icon: MoreHorizontal }
  }
  const Icon = ICONE_DESPESA[config.icone] ?? MoreHorizontal
  return { label: config.label, isLegado: config.grupo === 'LEGADO', Icon }
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
  viagemStatus: string
  processoId: string | null
  viagem: Pick<
    ViagemDetalheOutput,
    'veiculo' | 'dataSaida' | 'dataChegada' | 'segmentos' | 'passageiros'
  >
  prestacao: PrestacaoDetalheViagemNovaOutput | null
}

export function PrestacaoViagemView({
  session,
  viagemNovaId,
  viagemStatus,
  processoId,
  viagem,
  prestacao,
}: PrestacaoViagemViewProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [serverError, setServerError] = useState<string | null>(null)
  const [despesaDialog, setDespesaDialog] = useState<DespesaDialogState>({
    open: false,
    tipoInicial: 'TRANSPORTE_TERRESTRE',
  })
  const [enviarConfirmOpen, setEnviarConfirmOpen] = useState(false)
  const [rejeitarOpen, setRejeitarOpen] = useState(false)
  const [observacoesGestor, setObservacoesGestor] = useState('')
  const [editandoAdiantamento, setEditandoAdiantamento] = useState(false)
  const [valorAdiantamentoInput, setValorAdiantamentoInput] = useState('')
  const [itemExcluirId, setItemExcluirId] = useState<string | null>(null)

  const viagemConcluida = viagemStatus === 'CONCLUIDA'

  const podeEditarPc =
    prestacao !== null &&
    (prestacao.status === 'PENDENTE' || prestacao.status === 'REJEITADA')

  const valorTotalDespesas = prestacao?.valorTotal ?? 0
  const valorAdiantamento = prestacao?.valorAdiantamento ?? null

  const itensOrdenados = useMemo(() => {
    if (!prestacao) {
      return []
    }
    return [...prestacao.itensDespesa].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    )
  }, [prestacao])

  const diasPrazo = prestacao ? diasRestantesPrazo(prestacao.prazoEnvioAt) : 0
  const prazoDataLabel = prestacao
    ? new Date(prestacao.prazoEnvioAt).toLocaleDateString('pt-BR')
    : null

  const diferencaAdiantamento =
    valorAdiantamento !== null ? valorTotalDespesas - valorAdiantamento : null

  const segmentos = viagem.segmentos

  const sugestoesDespesa = useMemo(() => calcularSugestoesPcViagem(viagem), [viagem])

  const temItemDevolucao = useMemo(
    () => prestacao?.itensDespesa.some((item) => item.tipo === 'DEVOLUCAO') ?? false,
    [prestacao]
  )

  function abrirDespesaDialog(config: Partial<DespesaDialogState> = {}) {
    setDespesaDialog({
      open: true,
      tipoInicial: config.tipoInicial ?? 'TRANSPORTE_TERRESTRE',
      valorInicial: config.valorInicial,
      quantidadeDiasInicial: config.quantidadeDiasInicial,
    })
  }

  function handleSalvarAdiantamento() {
    const valor = Number.parseFloat(valorAdiantamentoInput.replace(',', '.'))
    if (!Number.isFinite(valor) || valor < 0) {
      setServerError('Informe um valor válido para o adiantamento.')
      return
    }

    setServerError(null)
    startTransition(async () => {
      const result = await atualizarAdiantamentoViagemPc({
        viagemNovaId,
        valorAdiantamento: valor,
      })

      if (!result.success) {
        setServerError(result.error ?? 'Não foi possível salvar o adiantamento.')
        return
      }

      setEditandoAdiantamento(false)
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
        setServerError(result.error ?? 'Não foi possível excluir o item.')
        return
      }

      setItemExcluirId(null)
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
  const podeEnviar = podeEditarPc && temDespesas
  const instrucao = instrucaoPorStatus(
    prestacao.status,
    prestacao.observacoesGestor,
    prestacao.aprovadoAt
  )

  const mostrarFormAdiantamento =
    podeEditarPc && (valorAdiantamento === null || editandoAdiantamento)

  const mostrarSugestoes =
    prestacao.status === 'PENDENTE' && !temDespesas && sugestoesDespesa.length > 0

  const mostrarBannerDevolucao =
    podeEditarPc &&
    valorAdiantamento !== null &&
    diferencaAdiantamento !== null &&
    diferencaAdiantamento < 0 &&
    !temItemDevolucao

  const valorDevolucaoSugerido =
    diferencaAdiantamento !== null && diferencaAdiantamento < 0
      ? Math.abs(diferencaAdiantamento)
      : null

  return (
    <>
      <div className="flex flex-col gap-[var(--space-6)]">
        {serverError ? <ServerError message={serverError} /> : null}

        {/* SEÇÃO 1 — STATUS E PRAZO */}
        <Card
          header={
            <div className="flex flex-wrap items-center justify-between gap-[var(--space-2)]">
              <CardHeader className="border-0 p-0">Status e prazo</CardHeader>
              <PrestacaoStatusBadge status={prestacao.status} />
            </div>
          }
        >
          <div className="flex flex-col gap-[var(--space-3)]">
            {prazoDataLabel ? (
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
            ) : null}

            {instrucao ? (
              <p className="text-[length:var(--text-sm)] text-[var(--color-text)]">{instrucao}</p>
            ) : null}
          </div>
        </Card>

        {/* SEÇÃO 2 — ADIANTAMENTO */}
        {mostrarFormAdiantamento ? (
          <PermissionGate session={session} permission={TFD_PERMISSIONS.REGISTRAR_DESPESA}>
            <Card header={<CardHeader>Adiantamento entregue ao paciente</CardHeader>}>
              <div className="flex flex-col gap-[var(--space-3)]">
                <p className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
                  Informe o valor total entregue ao paciente antes da viagem (passagens, diárias).
                  Este valor será comparado com as despesas reais.
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
                <div className="flex flex-wrap gap-[var(--space-2)]">
                  <Button
                    type="button"
                    variant="primary"
                    disabled={isPending}
                    onClick={handleSalvarAdiantamento}
                  >
                    {isPending ? 'Salvando…' : 'Salvar'}
                  </Button>
                  {valorAdiantamento !== null && editandoAdiantamento ? (
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={isPending}
                      onClick={() => setEditandoAdiantamento(false)}
                    >
                      Cancelar
                    </Button>
                  ) : null}
                </div>
              </div>
            </Card>
          </PermissionGate>
        ) : valorAdiantamento !== null ? (
          <Card header={<CardHeader>Adiantamento entregue ao paciente</CardHeader>}>
            <div className="flex flex-wrap items-center justify-between gap-[var(--space-3)]">
              <p className="text-[length:var(--text-sm)] text-[var(--color-text)]">
                Adiantamento:{' '}
                <span className="font-mono font-semibold">
                  {currencyFormatter.format(valorAdiantamento)}
                </span>
              </p>
              {podeEditarPc ? (
                <PermissionGate session={session} permission={TFD_PERMISSIONS.REGISTRAR_DESPESA}>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={isPending}
                    onClick={() => {
                      setValorAdiantamentoInput(
                        valorAdiantamento.toFixed(2).replace('.', ',')
                      )
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

        {/* PC-PARTE-4: sugestões automáticas ao abrir PC sem itens */}
        {mostrarSugestoes ? (
          <div className="rounded-[var(--radius)] border border-[var(--color-info)] bg-[var(--color-info-light)] p-[var(--space-4)]">
            <p className="text-[length:var(--text-sm)] font-semibold text-[var(--color-text)]">
              💡 Itens sugeridos para esta viagem
            </p>
            <p className="mt-[var(--space-1)] text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
              Com base nos dados da viagem, sugerimos os seguintes tipos de despesa. Clique para
              adicionar.
            </p>
            <div className="mt-[var(--space-3)] flex flex-wrap gap-[var(--space-2)]">
              {sugestoesDespesa.map((sugestao) => {
                const Icon = ICONE_DESPESA[sugestao.icone] ?? MoreHorizontal
                const labelComDias =
                  sugestao.dias !== undefined
                    ? `${sugestao.label} (${sugestao.dias} dia${sugestao.dias === 1 ? '' : 's'})`
                    : sugestao.label

                return (
                  <Button
                    key={sugestao.tipo}
                    type="button"
                    variant="secondary"
                    className="rounded-full"
                    disabled={isPending}
                    onClick={() =>
                      abrirDespesaDialog({
                        tipoInicial: sugestao.tipo,
                        quantidadeDiasInicial: sugestao.dias,
                      })
                    }
                  >
                    <Icon className="size-4" aria-hidden="true" />
                    {labelComDias}
                  </Button>
                )
              })}
            </div>
          </div>
        ) : null}

        {/* SEÇÃO 3 — DESPESAS LANÇADAS */}
        <Card
          header={
            <div className="flex flex-wrap items-center justify-between gap-[var(--space-2)]">
              <CardHeader className="border-0 p-0">Despesas lançadas</CardHeader>
              {podeEditarPc ? (
                <PermissionGate session={session} permission={TFD_PERMISSIONS.REGISTRAR_DESPESA}>
                  <Button
                    type="button"
                    variant="primary"
                    disabled={isPending}
                    onClick={() => abrirDespesaDialog()}
                  >
                    <Plus className="size-4" aria-hidden="true" />
                    Lançar despesa
                  </Button>
                </PermissionGate>
              ) : null}
            </div>
          }
        >
          {itensOrdenados.length === 0 ? (
            <EmptyState
              titulo="Nenhuma despesa lançada ainda"
              descricao="Registre as despesas da viagem para compor a prestação de contas."
            />
          ) : (
            <ul className="flex flex-col gap-[var(--space-3)]">
              {itensOrdenados.map((item) => {
                const tipoDespesa = labelTipoDespesa(item.tipo)
                const trecho = labelSegmento(segmentos, item.transporteId)
                const Icon = tipoDespesa.Icon

                return (
                  <li
                    key={item.id}
                    className="rounded-[var(--radius-md)] border border-[var(--color-border)] p-[var(--space-4)]"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-[var(--space-3)]">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-[var(--space-2)]">
                          <Icon
                            className="size-4 shrink-0 text-[var(--color-primary)]"
                            aria-hidden="true"
                          />
                          <Badge variant="blue" size="sm">
                            {tipoDespesa.label}
                          </Badge>
                          {tipoDespesa.isLegado ? (
                            <Badge variant="gray" size="sm">
                              Histórico
                            </Badge>
                          ) : null}
                          {item.comprovanteAnexoId ? (
                            <FileCheck
                              className="size-4 text-[var(--color-success)]"
                              aria-label="Com comprovante"
                            />
                          ) : null}
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
                      </div>
                      <div className="flex flex-col items-end gap-[var(--space-2)]">
                        <span className="font-mono text-[length:var(--text-sm)] font-bold tabular-nums text-[var(--color-text)]">
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
                    </div>
                  </li>
                )
              })}
            </ul>
          )}

          <div className="mt-[var(--space-4)] border-t border-[var(--color-border)] pt-[var(--space-4)]">
            <p className="text-[length:var(--text-sm)] text-[var(--color-text)]">
              Total lançado:{' '}
              <span className="font-mono font-semibold">
                {currencyFormatter.format(valorTotalDespesas)}
              </span>
            </p>

            {valorAdiantamento !== null && diferencaAdiantamento !== null ? (
              <div className="mt-[var(--space-2)] flex flex-col gap-[var(--space-1)]">
                <p className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
                  Adiantamento:{' '}
                  <span className="font-mono">{currencyFormatter.format(valorAdiantamento)}</span>
                </p>
                {diferencaAdiantamento > 0 ? (
                  <p className="text-[length:var(--text-sm)] font-medium text-[var(--color-error)]">
                    Diferença a mais: {currencyFormatter.format(diferencaAdiantamento)}
                  </p>
                ) : diferencaAdiantamento < 0 ? (
                  <>
                    <p className="text-[length:var(--text-sm)] font-medium text-[var(--color-warning)]">
                      Devolução ao erário:{' '}
                      {currencyFormatter.format(Math.abs(diferencaAdiantamento))}
                    </p>
                    <p className="text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
                      Inclua um item do tipo &quot;Devolução ao erário&quot; com este valor.
                    </p>
                  </>
                ) : (
                  <p className="text-[length:var(--text-sm)] font-medium text-[var(--color-success)]">
                    Valores conferem ✓
                  </p>
                )}
              </div>
            ) : null}
          </div>

          {/* PC-PARTE-4: banner de devolução ao erário */}
          {mostrarBannerDevolucao && valorDevolucaoSugerido !== null ? (
            <div className="mt-[var(--space-4)] rounded-[var(--radius)] border border-[var(--color-warning)] bg-[var(--color-warning-light)] p-[var(--space-4)]">
              <p className="text-[length:var(--text-sm)] text-[var(--color-text)]">
                ⚠ Você recebeu {currencyFormatter.format(valorAdiantamento!)} de adiantamento mas
                lançou apenas {currencyFormatter.format(valorTotalDespesas)}. Adicione um item
                &quot;Devolução ao erário&quot; de{' '}
                {currencyFormatter.format(valorDevolucaoSugerido)} para regularizar a prestação.
              </p>
              <PermissionGate session={session} permission={TFD_PERMISSIONS.REGISTRAR_DESPESA}>
                <Button
                  type="button"
                  variant="primary"
                  className="mt-[var(--space-3)]"
                  disabled={isPending}
                  onClick={() =>
                    abrirDespesaDialog({
                      tipoInicial: 'DEVOLUCAO',
                      valorInicial: valorDevolucaoSugerido.toFixed(2).replace('.', ','),
                    })
                  }
                >
                  <Plus className="size-4" aria-hidden="true" />
                  Adicionar devolução
                </Button>
              </PermissionGate>
            </div>
          ) : null}
        </Card>

        {/* SEÇÃO 4 — AÇÕES */}
        {podeEditarPc ? (
          <PermissionGate session={session} permission={TFD_PERMISSIONS.ENVIAR_PRESTACAO}>
            <Card header={<CardHeader>Enviar para análise</CardHeader>}>
              <Button
                type="button"
                variant="primary"
                disabled={isPending || !podeEnviar}
                title={!podeEnviar ? 'Lance ao menos uma despesa antes de enviar.' : undefined}
                onClick={() => setEnviarConfirmOpen(true)}
              >
                Enviar para análise
              </Button>
            </Card>
          </PermissionGate>
        ) : null}

        {prestacao.status === 'ENVIADA' ? (
          <PermissionGate session={session} permission={TFD_PERMISSIONS.APROVAR_PRESTACAO}>
            <Alert variant="info" titulo="Prestação aguardando sua análise" role="status">
              Revise todas as despesas e comprovantes antes de aprovar. A aprovação é irreversível
              e atualiza o saldo financeiro automaticamente.
            </Alert>
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
      </div>

      <DespesaViagemDialog
        open={despesaDialog.open}
        onOpenChange={(open) => setDespesaDialog((prev) => ({ ...prev, open }))}
        session={session}
        viagemNovaId={viagemNovaId}
        processoId={processoId}
        segmentos={segmentos}
        tipoInicial={despesaDialog.tipoInicial}
        valorInicial={despesaDialog.valorInicial}
        quantidadeDiasInicial={despesaDialog.quantidadeDiasInicial}
      />

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
              {isPending ? 'Processando…' : 'Confirmar rejeição'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
