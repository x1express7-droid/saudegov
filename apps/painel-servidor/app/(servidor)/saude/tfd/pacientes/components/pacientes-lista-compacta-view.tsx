'use client'

import type { TfdPacienteVinculadoItem } from '@saude/mod-saude-tfd/client'
import { Badge, Button, Card } from '@saude/ui'
import { ChevronRight } from 'lucide-react'
import { useRouter } from 'next/navigation'

// BLOCO-7-PACIENTES
const PACIENTE_BASE = '/saude/tfd/pacientes'

function formatDataVinculo(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function labelCns(cnsMascarado: string | null): string {
  return cnsMascarado ?? 'Sem CNS'
}

export interface PacientesListaCompactaViewProps {
  items: TfdPacienteVinculadoItem[]
  podeVerPerfilPaciente: boolean
}

export function PacientesListaCompactaView({
  items,
  podeVerPerfilPaciente,
}: PacientesListaCompactaViewProps) {
  const router = useRouter()

  return (
    <div className="flex flex-col gap-[var(--space-2)]">
      {items.map((item) => {
        const perfilHref = `${PACIENTE_BASE}/${item.id}`

        return (
          <Card key={item.id} bodyClassName="py-[var(--space-3)] px-[var(--space-4)]">
            <div className="flex items-center gap-[var(--space-3)]">
              <div className="w-32 shrink-0 md:w-48">
                <p className="truncate text-[length:var(--text-sm)] font-medium text-[var(--color-text)]">
                  {item.nome}
                </p>
                <p className="truncate font-mono text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
                  {labelCns(item.cnsMascarado)}
                </p>
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
                  Vinculado em {formatDataVinculo(item.vinculadoEm)}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-[var(--space-2)]">
                {item.ativo ? (
                  <Badge variant="green" size="sm">
                    Ativo
                  </Badge>
                ) : (
                  <Badge variant="gray" size="sm">
                    Inativo
                  </Badge>
                )}
                {podeVerPerfilPaciente ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-[36px] px-[var(--space-3)] text-[length:var(--text-xs)]"
                    onClick={() => router.push(perfilHref)}
                  >
                    Ver
                    <ChevronRight className="size-4" aria-hidden="true" />
                  </Button>
                ) : null}
              </div>
            </div>
          </Card>
        )
      })}
    </div>
  )
}
