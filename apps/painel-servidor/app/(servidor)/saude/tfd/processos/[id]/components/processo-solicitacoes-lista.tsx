'use client'

import type { ProcessoTfdDetalheOutput } from '@saude/mod-saude-tfd/client'
import {
  Badge,
  Button,
  Card,
  EmptyState,
  formatDateTimeBr,
  ProtocoloBadge,
  StatusBadge,
  TFD_STATUS_CONFIG,
  TFD_URGENCIA_CONFIG,
  UrgenciaBadge,
  type TfdStatus,
  type TfdUrgencia,
} from '@saude/ui'
import { Building2, ChevronRight, Stethoscope } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo } from 'react'

type SolicitacaoItem = ProcessoTfdDetalheOutput['solicitacoes'][number]

const TIPO_ATENDIMENTO_LABEL: Record<string, string> = {
  CONSULTA: 'Consulta',
  RETORNO: 'Retorno',
  EXAME: 'Exame',
  CIRURGIA: 'Cirurgia',
}

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

function labelTipoAtendimento(tipo: string): string {
  return TIPO_ATENDIMENTO_LABEL[tipo] ?? tipo
}

function asTfdUrgencia(value: string): TfdUrgencia {
  return value in TFD_URGENCIA_CONFIG ? (value as TfdUrgencia) : 'NAO_AGUDA'
}

function asTfdStatus(value: string): TfdStatus {
  return value in TFD_STATUS_CONFIG ? (value as TfdStatus) : 'RASCUNHO'
}

function muitoUrgenteClassName(urgencia: string): string {
  return urgencia === 'MUITO_URGENTE' ? 'border-l-4 border-l-[var(--color-error)]' : ''
}

export interface ProcessoSolicitacoesListaProps {
  solicitacoes: SolicitacaoItem[]
  valoresPorSolicitacao?: Record<string, number>
}

export function ProcessoSolicitacoesLista({
  solicitacoes,
  valoresPorSolicitacao,
}: ProcessoSolicitacoesListaProps) {
  const router = useRouter()

  const itensOrdenados = useMemo(
    () => [...solicitacoes].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [solicitacoes]
  )

  if (itensOrdenados.length === 0) {
    return (
      <EmptyState
        titulo="Nenhuma solicitação neste processo"
        descricao="Abra uma nova solicitação vinculada a este processo quando estiver em andamento."
      />
    )
  }

  return (
    <ul className="flex flex-col gap-[var(--space-3)]">
      {itensOrdenados.map((item) => {
        const valorEstimado = valoresPorSolicitacao?.[item.id]
        const href = `/saude/tfd/${item.id}`

        return (
          <li key={item.id}>
            <Card
              bodyClassName="p-[var(--space-4)]"
              className={muitoUrgenteClassName(item.urgencia)}
            >
              <div className="flex flex-col gap-[var(--space-3)]">
                <div className="flex flex-wrap items-start justify-between gap-[var(--space-3)]">
                  <div className="flex min-w-0 flex-1 flex-wrap items-center gap-[var(--space-2)]">
                    <ProtocoloBadge protocolo={item.protocolo} />
                    <StatusBadge status={asTfdStatus(item.status)} size="sm" />
                    <UrgenciaBadge urgencia={asTfdUrgencia(item.urgencia)} size="sm" />
                    <Badge variant="blue" size="sm">
                      {labelTipoAtendimento(item.tipoAtendimento)}
                    </Badge>
                  </div>
                  {valorEstimado != null && valorEstimado > 0 ? (
                    <span className="font-mono text-[length:var(--text-sm)] font-semibold tabular-nums text-[var(--color-success)]">
                      {currencyFormatter.format(valorEstimado)}
                    </span>
                  ) : null}
                </div>

                <div className="grid gap-[var(--space-2)] sm:grid-cols-2">
                  <div className="flex items-start gap-[var(--space-2)]">
                    <Stethoscope
                      className="mt-0.5 size-4 shrink-0 text-[var(--color-text-muted)]"
                      aria-hidden="true"
                    />
                    <div className="min-w-0">
                      <p className="text-[length:var(--text-xs)] font-medium text-[var(--color-text-muted)]">
                        Especialidade
                      </p>
                      <p className="truncate text-[length:var(--text-sm)] text-[var(--color-text)]">
                        {item.especialidade ?? '—'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-[var(--space-2)]">
                    <Building2
                      className="mt-0.5 size-4 shrink-0 text-[var(--color-text-muted)]"
                      aria-hidden="true"
                    />
                    <div className="min-w-0">
                      <p className="text-[length:var(--text-xs)] font-medium text-[var(--color-text-muted)]">
                        Prestador
                      </p>
                      <p className="truncate text-[length:var(--text-sm)] text-[var(--color-text)]">
                        {item.prestador ?? '—'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-[var(--space-3)] border-t border-[var(--color-border)] pt-[var(--space-3)]">
                  <p className="text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
                    Abertura:{' '}
                    <time dateTime={item.createdAt} className="text-[var(--color-text)]">
                      {formatDateTimeBr(item.createdAt, item.createdAt)}
                    </time>
                  </p>
                  <div className="flex items-center gap-[var(--space-2)]">
                    <Link
                      href={href}
                      className="text-[length:var(--text-sm)] font-medium text-[var(--color-primary)] hover:underline"
                    >
                      Ver solicitação
                    </Link>
                    <Button
                      type="button"
                      variant="outline"
                      className="min-h-[32px] px-[var(--space-3)] text-[length:var(--text-xs)]"
                      onClick={() => router.push(href)}
                    >
                      Abrir
                      <ChevronRight className="size-4" aria-hidden="true" />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </li>
        )
      })}
    </ul>
  )
}
