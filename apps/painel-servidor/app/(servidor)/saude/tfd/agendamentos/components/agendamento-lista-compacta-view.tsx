'use client'

import type { TfdAgendamentoConsultaListItem } from '@saude/mod-saude-tfd/client'
import { Button, Card, StatusBadge } from '@saude/ui'
import { ChevronRight } from 'lucide-react'
import { useRouter } from 'next/navigation'

import { AgendamentoStatusBadge } from '../../components/agendamento-status-badge'
import {
  agendamentoDetalheHref,
  asAgendamentoStatusBadge,
  formatDataHoraAgendamento,
  labelPrestadorNome,
  labelTipoAtendimento,
} from './agendamento-lista-utils'

// BLOCO-9-AGENDAMENTOS
function AgendamentoStatusDisplay({ status }: { status: string }) {
  if (status === 'REALIZADO') {
    return <AgendamentoStatusBadge status={status} size="sm" />
  }
  return <StatusBadge status={asAgendamentoStatusBadge(status)} size="sm" />
}

export interface AgendamentoListaCompactaViewProps {
  items: TfdAgendamentoConsultaListItem[]
}

export function AgendamentoListaCompactaView({ items }: AgendamentoListaCompactaViewProps) {
  const router = useRouter()

  return (
    <div className="flex flex-col gap-[var(--space-2)]">
      {items.map((item) => {
        const detalheHref = agendamentoDetalheHref(item)
        const tipoPrestador = [labelTipoAtendimento(item.tipoAtendimento), labelPrestadorNome(item)]
          .filter((part) => part && part !== '—')
          .join(' · ')

        return (
          <Card key={item.id} bodyClassName="py-[var(--space-3)] px-[var(--space-4)]">
            <div className="flex items-center gap-[var(--space-3)]">
              <div className="w-32 shrink-0 md:w-48">
                <p className="truncate font-mono text-[length:var(--text-xs)] font-bold whitespace-nowrap text-[var(--color-text)]">
                  {item.protocolo}
                </p>
                <p className="mt-0.5 truncate text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
                  {item.pacienteNome}
                </p>
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-[length:var(--text-sm)] text-[var(--color-text)]">
                  {formatDataHoraAgendamento(item.dataConsulta, item.horaConsulta)}
                </p>
                {tipoPrestador ? (
                  <p className="mt-0.5 truncate text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
                    {tipoPrestador}
                  </p>
                ) : null}
              </div>

              <div className="shrink-0">
                <AgendamentoStatusDisplay status={item.status} />
              </div>

              <div className="shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-[36px] px-[var(--space-3)] text-[length:var(--text-xs)]"
                  onClick={() => router.push(detalheHref)}
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
