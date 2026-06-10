'use client'

import type { TransporteAgendamentoItem } from '@saude/mod-saude-tfd/client'

import {
  Alert,
  Badge,
  Card,
  CardHeader,
  cn,
} from '@saude/ui'
import { ArrowRight, FileCheck } from 'lucide-react'
import { useMemo } from 'react'

import {
  currencyFormatter,
  labelTipoSegmento,
  PRESTACAO_STATUS_CONFIG,
} from '../../components/transporte-constants'

// PC-PARTE-1: página de PC do agendamento — somente leitura (modelo anterior)

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
    <div className="flex flex-wrap items-center gap-[var(--space-2)]">
      <Badge variant="gray" size="sm">
        Histórico
      </Badge>
      <Badge variant={config.color} size="sm">
        {config.label}
      </Badge>
    </div>
  )
}

function tituloSegmento(transporte: TransporteAgendamentoItem): string {
  return `${labelTipoSegmento(transporte.tipoSegmento)} — ${transporte.origemDescricao} → ${transporte.destinoDescricao}`
}

function ListaItensDespesa({ itens }: { itens: ItemDespesaAgendamento[] }) {
  if (itens.length === 0) {
    return (
      <p className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
        Nenhuma despesa registrada nesta seção.
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
  prestacao,
  extrato,
  transportes,
}: PrestacaoAgendamentoConteudoProps) {
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

  return (
    <div className="flex flex-col gap-[var(--space-6)]">
      <Alert variant="warning" role="status">
        Esta prestação pertence ao modelo anterior. Novas despesas são registradas na Viagem.
      </Alert>

      <div className="flex min-w-0 flex-col gap-[var(--space-6)]">
        <Card
          header={
            <div className="flex flex-wrap items-center justify-between gap-[var(--space-2)]">
              <div className="flex flex-wrap items-center gap-[var(--space-2)]">
                <CardHeader className="border-0 p-0">Resumo financeiro</CardHeader>
                <Badge variant="gray" size="sm">
                  Histórico
                </Badge>
              </div>
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

            {prestacao.status === 'APROVADA' ? (
              <p className="text-[length:var(--text-sm)] text-[var(--color-text)]">
                Prestação aprovada
                {prestacao.aprovadoPor ? ` por ${prestacao.aprovadoPor.nome}` : ''}
                {prestacao.aprovadoAt
                  ? ` em ${new Date(prestacao.aprovadoAt).toLocaleDateString('pt-BR')}`
                  : ''}
                .
              </p>
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
                    <Badge variant="gray" size="sm">
                      Histórico
                    </Badge>
                    Segmento {transporte.sequencia}
                    <ArrowRight className="size-3.5 text-[var(--color-text-muted)]" aria-hidden />
                    {tituloSegmento(transporte)}
                  </span>
                </CardHeader>
              </div>
            }
          >
            <ListaItensDespesa itens={itens} />
          </Card>
        ))}

        <Card
          header={
            <div className="flex flex-wrap items-center gap-[var(--space-2)]">
              <CardHeader className="border-0 p-0">Despesas avulsas</CardHeader>
              <Badge variant="gray" size="sm">
                Histórico
              </Badge>
            </div>
          }
        >
          <p className="mb-[var(--space-3)] text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
            Alimentação, hospedagem e outros custos sem vínculo a um segmento de transporte.
          </p>
          <ListaItensDespesa itens={avulsas} />
        </Card>
      </div>
    </div>
  )
}
