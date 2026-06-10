'use client'

import type { TfdSolicitacaoListItem } from '@saude/mod-saude-tfd/client'
import {
  Button,
  Card,
  EmptyState,
  formatDateTimeBr,
  StatusBadge,
  TFD_STATUS_CONFIG,
  TFD_URGENCIA_CONFIG,
  UrgenciaBadge,
  type TfdStatus,
  type TfdUrgencia,
} from '@saude/ui'
import { ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

// BLOCO-6-REVISADO
const PROCESSO_BASE = '/saude/tfd/processos'

const TIPO_ATENDIMENTO_LABEL: Record<string, string> = {
  CONSULTA: 'Consulta',
  RETORNO: 'Retorno',
  EXAME: 'Exame',
  CIRURGIA: 'Cirurgia',
}


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

export interface SolicitacaoListaCompactaViewProps {
  items: TfdSolicitacaoListItem[]
}

export function SolicitacaoListaCompactaView({ items }: SolicitacaoListaCompactaViewProps) {
  const router = useRouter()

  if (items.length === 0) {
    return (
      <EmptyState
        titulo="Nenhuma solicitação encontrada"
        descricao="Ajuste os filtros ou abra uma nova solicitação para iniciar o fluxo TFD."
        cta={
          <Button variant="primary" asChild>
            <Link href="/saude/tfd/nova">Nova solicitação</Link>
          </Button>
        }
      />
    )
  }

  return (
    <div className="flex flex-col gap-[var(--space-2)]">
      {items.map((item) => {
        const processoHref = `${PROCESSO_BASE}/${item.processoId}`

        return (
          <Card
            key={item.id}
            bodyClassName="py-[var(--space-3)] px-[var(--space-4)]"
            className={muitoUrgenteClassName(item.urgencia)}
          >
            <div className="flex items-center gap-[var(--space-3)]">
              <div className="w-32 shrink-0 md:w-48">
                <p className="truncate font-mono text-[length:var(--text-xs)] font-bold text-[var(--color-text)]">
                  {item.protocolo}
                </p>
                <p className="mt-0.5 truncate text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
                  {item.paciente.nome}
                </p>
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-[length:var(--text-sm)] text-[var(--color-text)]">
                  {item.especialidade}
                </p>
                <p className="truncate text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
                  {labelTipoAtendimento(item.tipoAtendimento)} · {formatDateTimeBr(item.criadoEm)}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-[var(--space-2)]">
                <span className="hidden md:inline-flex">
                  <UrgenciaBadge urgencia={asTfdUrgencia(item.urgencia)} size="sm" />
                </span>
                <StatusBadge status={asTfdStatus(item.status)} size="sm" />
              </div>

              <div className="shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-[36px] px-[var(--space-3)] text-[length:var(--text-xs)]"
                  onClick={() => router.push(processoHref)}
                >
                  Ver
                  <ChevronRight className="size-4" aria-hidden="true" />
                </Button>
              </div>
            </div>
          </Card>
        )
      })}
    </div>
  )
}
