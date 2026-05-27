'use client'

import { TFD_PERMISSIONS } from '@saude/mod-saude-tfd/permissions'
import type { TransporteAgendamentoItem } from '@saude/mod-saude-tfd/client'
import type { SaudeMunicSession } from '@saude/core-auth/types/session'

import {
  Alert,
  Badge,
  Button,
  Card,
  CardHeader,
  cn,
} from '@saude/ui'
import { PermissionGate } from '@saude/ui/permission-gate'
import { ArrowRight, FileCheck, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'

import {
  currencyFormatter,
  labelTipoSegmento,
  PRESTACAO_STATUS_CONFIG,
} from '../../components/transporte-constants'
import { DespesaLancamentoDialog } from './despesa-lancamento-dialog'
import { EnviarPrestacaoAgendamentoAcao } from './enviar-prestacao-agendamento-acao'
import { PrestacaoAnaliseAgendamentoPainel } from './prestacao-analise-agendamento-painel'

const TIPO_DESPESA_LABEL: Record<string, string> = {
  TRANSPORTE: 'Transporte',
  ALIMENTACAO: 'Alimentação',
  HOSPEDAGEM: 'Hospedagem',
  OUTRO: 'Outro',
}

export interface ItemDespesaAgendamento {
  id: string
  tipo: string
  valor: number
  descricao: string | null
  comprovanteAnexoId: string | null
  responsavelPagamento: string
  transporteId: string | null
  sequenciaTransporte: number | null
}

export interface PrestacaoAgendamentoData {
  id: string
  agendamentoId: string
  viagemId: string | null
  status: string
  prazoEnvioAt: string
  observacoesGestor: string | null
  comprovantesVistos: Array<{ comprovanteAnexoId: string }>
  aprovadoAt: string | null
  aprovadoPor: { id: string; nome: string } | null
  itensDespesa: ItemDespesaAgendamento[]
  valorTotal: number
}

export interface ExtratoAgendamentoData {
  valorEstimado: number | null
  valorRealTotal: number
}

export interface PrestacaoAgendamentoConteudoProps {
  session: SaudeMunicSession
  processoId: string
  agendamentoId: string
  agendamentoStatus: string
  solicitacaoStatus: string
  prestacao: PrestacaoAgendamentoData
  extrato: ExtratoAgendamentoData
  transportes: TransporteAgendamentoItem[]
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

function tituloSegmento(transporte: TransporteAgendamentoItem): string {
  return `${labelTipoSegmento(transporte.tipoSegmento)} — ${transporte.origemDescricao} → ${transporte.destinoDescricao}`
}

function ListaItensDespesa({ itens }: { itens: ItemDespesaAgendamento[] }) {
  if (itens.length === 0) {
    return (
      <p className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
        Nenhuma despesa lançada nesta seção.
      </p>
    )
  }

  return (
    <ul className="flex flex-col gap-[var(--space-2)]">
      {itens.map((item) => (
        <li
          key={item.id}
          className="flex flex-wrap items-center justify-between gap-[var(--space-2)] rounded-[var(--radius)] border border-[var(--color-border)] px-[var(--space-3)] py-[var(--space-2)]"
        >
          <div className="min-w-0 flex-1">
            <p className="text-[length:var(--text-sm)] font-medium text-[var(--color-text)]">
              {TIPO_DESPESA_LABEL[item.tipo] ?? item.tipo}
              {item.descricao ? ` — ${item.descricao}` : ''}
            </p>
            <p className="text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
              {currencyFormatter.format(item.valor)}
            </p>
          </div>
          {item.comprovanteAnexoId ? (
            <FileCheck
              className="size-4 shrink-0 text-[var(--color-success)]"
              aria-label="Com comprovante"
            />
          ) : (
            <span className="text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
              Sem comprovante
            </span>
          )}
        </li>
      ))}
    </ul>
  )
}

export function PrestacaoAgendamentoConteudo({
  session,
  processoId,
  agendamentoId,
  agendamentoStatus,
  solicitacaoStatus,
  prestacao,
  extrato,
  transportes,
}: PrestacaoAgendamentoConteudoProps) {
  const [despesaDialog, setDespesaDialog] = useState<{
    transporteId?: string
    segmentoTitulo?: string
  } | null>(null)

  const podeLancarDespesa =
    agendamentoStatus === 'REALIZADO' &&
    (prestacao.status === 'PENDENTE' || prestacao.status === 'REJEITADA')

  const { segmentos, avulsas } = useMemo(() => {
    const byTransporte = new Map<string, ItemDespesaAgendamento[]>()
    const avulsasItems: ItemDespesaAgendamento[] = []

    for (const item of prestacao.itensDespesa) {
      if (item.transporteId) {
        const list = byTransporte.get(item.transporteId) ?? []
        list.push(item)
        byTransporte.set(item.transporteId, list)
      } else {
        avulsasItems.push(item)
      }
    }

    const segmentosOrdenados = [...transportes]
      .sort((a, b) => a.sequencia - b.sequencia)
      .map((transporte) => ({
        transporte,
        itens: byTransporte.get(transporte.id) ?? [],
      }))

    return { segmentos: segmentosOrdenados, avulsas: avulsasItems }
  }, [prestacao.itensDespesa, transportes])

  const diferenca =
    extrato.valorEstimado !== null ? extrato.valorRealTotal - extrato.valorEstimado : null

  const prazoLabel = new Date(prestacao.prazoEnvioAt).toLocaleDateString('pt-BR')

  const usaFluxoAgendamento =
    Boolean(prestacao.agendamentoId) && prestacao.viagemId === null

  return (
    <>
      <div className="grid gap-[var(--space-6)] lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]">
        <div className="flex min-w-0 flex-col gap-[var(--space-6)]">
          <Card
            header={
              <div className="flex flex-wrap items-center justify-between gap-[var(--space-2)]">
                <CardHeader className="border-0 p-0">Resumo financeiro</CardHeader>
                <PrestacaoStatusBadge status={prestacao.status} />
              </div>
            }
          >
            <div className="flex flex-col gap-[var(--space-4)]">
              <p className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
                Prazo de envio até {prazoLabel}
              </p>

              <dl className="grid gap-[var(--space-3)] sm:grid-cols-3">
                <div>
                  <dt className="text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
                    Valor estimado (reserva)
                  </dt>
                  <dd className="text-[length:var(--text-lg)] font-semibold text-[var(--color-text)]">
                    {extrato.valorEstimado !== null
                      ? currencyFormatter.format(extrato.valorEstimado)
                      : '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
                    Valor real total
                  </dt>
                  <dd className="text-[length:var(--text-lg)] font-semibold text-[var(--color-text)]">
                    {currencyFormatter.format(extrato.valorRealTotal)}
                  </dd>
                </div>
                <div>
                  <dt className="text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
                    Diferença
                  </dt>
                  <dd
                    className={cn(
                      'text-[length:var(--text-lg)] font-semibold',
                      diferenca === null
                        ? 'text-[var(--color-text-muted)]'
                        : diferenca > 0
                          ? 'text-[var(--color-danger)]'
                          : diferenca < 0
                            ? 'text-[var(--color-success)]'
                            : 'text-[var(--color-text)]'
                    )}
                  >
                    {diferenca !== null
                      ? `${diferenca > 0 ? '+' : ''}${currencyFormatter.format(diferenca)}`
                      : '—'}
                  </dd>
                </div>
              </dl>

              {prestacao.status === 'REJEITADA' && prestacao.observacoesGestor ? (
                <Alert variant="warning" role="status">
                  Prestação rejeitada: {prestacao.observacoesGestor}
                </Alert>
              ) : null}

              {!podeLancarDespesa && agendamentoStatus !== 'REALIZADO' ? (
                <Alert variant="info" role="status">
                  Registre o retorno do agendamento para lançar despesas na prestação de contas.
                </Alert>
              ) : null}
            </div>
          </Card>

          {segmentos.map(({ transporte, itens }) => (
            <Card
              key={transporte.id}
              header={
                <div className="flex flex-wrap items-center justify-between gap-[var(--space-2)]">
                  <CardHeader className="border-0 p-0">
                    <span className="flex flex-wrap items-center gap-[var(--space-2)]">
                      Segmento {transporte.sequencia}
                      <ArrowRight className="size-3.5 text-[var(--color-text-muted)]" aria-hidden />
                      {tituloSegmento(transporte)}
                    </span>
                  </CardHeader>
                  {podeLancarDespesa ? (
                    <PermissionGate
                      session={session}
                      permission={TFD_PERMISSIONS.REGISTRAR_DESPESA}
                    >
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() =>
                          setDespesaDialog({
                            transporteId: transporte.id,
                            segmentoTitulo: tituloSegmento(transporte),
                          })
                        }
                      >
                        <Plus className="mr-1 size-3.5" aria-hidden="true" />
                        Lançar despesa
                      </Button>
                    </PermissionGate>
                  ) : null}
                </div>
              }
            >
              <ListaItensDespesa itens={itens} />
            </Card>
          ))}

          <Card
            header={
              <div className="flex flex-wrap items-center justify-between gap-[var(--space-2)]">
                <CardHeader className="border-0 p-0">Despesas avulsas</CardHeader>
                {podeLancarDespesa ? (
                  <PermissionGate
                    session={session}
                    permission={TFD_PERMISSIONS.REGISTRAR_DESPESA}
                  >
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setDespesaDialog({})}
                    >
                      <Plus className="mr-1 size-3.5" aria-hidden="true" />
                      Lançar despesa
                    </Button>
                  </PermissionGate>
                ) : null}
              </div>
            }
          >
            <p className="mb-[var(--space-3)] text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
              Alimentação, hospedagem e outros custos sem vínculo a um segmento de transporte.
            </p>
            <ListaItensDespesa itens={avulsas} />
          </Card>
        </div>

        <aside className="flex min-w-0 flex-col gap-[var(--space-4)]">
          <EnviarPrestacaoAgendamentoAcao
            session={session}
            prestacaoId={prestacao.id}
            prestacaoStatus={prestacao.status}
            quantidadeItens={prestacao.itensDespesa.length}
          />

          <PrestacaoAnaliseAgendamentoPainel
            session={session}
            solicitacaoStatus={solicitacaoStatus}
            prestacaoId={prestacao.id}
            prestacaoStatus={prestacao.status}
            usaFluxoAgendamento={usaFluxoAgendamento}
            comprovantesVistos={prestacao.comprovantesVistos}
            itensDespesa={prestacao.itensDespesa}
          />

          {prestacao.status === 'APROVADA' ? (
            <Card header={<CardHeader>Status</CardHeader>}>
              <p className="text-[length:var(--text-sm)] text-[var(--color-text)]">
                Prestação aprovada
                {prestacao.aprovadoPor
                  ? ` por ${prestacao.aprovadoPor.nome}`
                  : ''}
                {prestacao.aprovadoAt
                  ? ` em ${new Date(prestacao.aprovadoAt).toLocaleDateString('pt-BR')}`
                  : ''}
                .
              </p>
            </Card>
          ) : null}

          {prestacao.status === 'ENVIADA' && solicitacaoStatus !== 'PC_EM_ANALISE' ? (
            <Card header={<CardHeader>Status</CardHeader>}>
              <p className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
                Prestação enviada e aguardando análise do gestor.
              </p>
            </Card>
          ) : null}

          {prestacao.status === 'PENDENTE' && prestacao.itensDespesa.length === 0 ? (
            <Card header={<CardHeader>Próximos passos</CardHeader>}>
              <p className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
                Lance as despesas do agendamento e envie a prestação até o prazo informado.
              </p>
            </Card>
          ) : null}
        </aside>
      </div>

      <DespesaLancamentoDialog
        open={despesaDialog !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDespesaDialog(null)
          }
        }}
        session={session}
        processoId={processoId}
        agendamentoId={agendamentoId}
        transporteId={despesaDialog?.transporteId}
        segmentoTitulo={despesaDialog?.segmentoTitulo}
      />
    </>
  )
}
