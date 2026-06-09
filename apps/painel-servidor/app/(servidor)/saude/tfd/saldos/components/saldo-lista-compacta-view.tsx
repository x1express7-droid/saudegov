'use client'

import { TFD_PERMISSIONS, type SaldoListItem } from '@saude/mod-saude-tfd/client'
import type { SaudeMunicSession } from '@saude/core-auth/types/session'
import { Badge, Button, Card, EmptyState } from '@saude/ui'
import { PermissionGate } from '@saude/ui/permission-gate'
import { Power } from 'lucide-react'
import Link from 'next/link'

import { SaldoLinhaProgresso } from './saldo-linha-progresso'
import {
  FONTE_LABELS,
  formatBrl,
  formatCompetenciaBr,
  saldoDisponibilidadeNivel,
} from './saldos-ui'

// BLOCO-11-SALDOS
// BLOCO-11.1-SALDOS
const BASE_PATH = '/saude/tfd/saldos'

export interface SaldoListaCompactaViewProps {
  items: SaldoListItem[]
  session: SaudeMunicSession
  onDesativar: (saldo: SaldoListItem) => void
}

function saldoCardClassName(item: SaldoListItem): string {
  if (!item.ativo) {
    return 'opacity-75'
  }
  if (item.alertaBaixo) {
    return 'border-[var(--color-error)] bg-[var(--color-error-light)]'
  }
  return ''
}

export function SaldoListaCompactaView({
  items,
  session,
  onDesativar,
}: SaldoListaCompactaViewProps) {
  if (items.length === 0) {
    return (
      <EmptyState
        titulo="Nenhum saldo encontrado para os filtros selecionados."
        descricao="Ajuste os filtros para visualizar outros saldos."
      />
    )
  }

  return (
    <ul className="flex flex-col gap-[var(--space-2)]" aria-label="Saldos financeiros">
      {items.map((item) => {
        const nivel = item.ativo ? saldoDisponibilidadeNivel(item.percentualDisponivel) : 'ok'
        const extratoHref = `${BASE_PATH}/${item.id}`

        return (
          <li key={item.id}>
            <Card
              bodyClassName="flex flex-col gap-[var(--space-3)] p-[var(--space-4)]"
              className={saldoCardClassName(item)}
            >
              <div className="flex flex-col gap-[var(--space-3)] sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-[var(--space-2)]">
                    <Link
                      href={extratoHref}
                      className="text-[length:var(--text-base)] font-medium text-[var(--color-primary)] hover:underline"
                    >
                      {item.descricao}
                    </Link>
                    <Badge variant={item.ativo ? 'green' : 'gray'} size="sm">
                      {item.ativo ? 'Ativo' : 'Inativo'}
                    </Badge>
                    {nivel === 'critico' ? (
                      <Badge variant="red" size="sm">
                        Crítico
                      </Badge>
                    ) : null}
                    {nivel === 'atencao' ? (
                      <Badge variant="yellow" size="sm">
                        Atenção
                      </Badge>
                    ) : null}
                  </div>
                  <p className="mt-[var(--space-1)] text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
                    {FONTE_LABELS[item.fonte]} ·{' '}
                    {formatCompetenciaBr(item.competenciaInicio, item.competenciaFim)}
                  </p>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-[var(--space-1)]">
                  <Button
                    variant="outline"
                    asChild
                    className="min-h-[32px] px-[var(--space-3)] text-[length:var(--text-xs)]"
                  >
                    <Link href={extratoHref}>Ver extrato</Link>
                  </Button>
                  {item.ativo ? (
                    <PermissionGate session={session} permission={TFD_PERMISSIONS.GERENCIAR_SALDO}>
                      <Button
                        type="button"
                        variant="ghost"
                        className="min-h-[32px] min-w-0 px-[var(--space-2)] py-[var(--space-1)] text-[length:var(--text-xs)]"
                        onClick={() => onDesativar(item)}
                        aria-label={`Desativar saldo ${item.descricao}`}
                      >
                        <Power className="size-4" aria-hidden="true" />
                        Desativar
                      </Button>
                    </PermissionGate>
                  ) : null}
                </div>
              </div>

              <div className="grid gap-[var(--space-3)] sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <p className="text-[length:var(--text-xs)] font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
                    Disponível
                  </p>
                  <p
                    className={
                      !item.ativo
                        ? 'mt-[var(--space-1)] font-mono text-[length:var(--text-sm)] font-semibold text-[var(--color-text-muted)]'
                        : nivel === 'critico'
                          ? 'mt-[var(--space-1)] font-mono text-[length:var(--text-sm)] font-semibold text-[var(--color-error)]'
                          : 'mt-[var(--space-1)] font-mono text-[length:var(--text-sm)] font-semibold text-[var(--color-text)]'
                    }
                  >
                    {formatBrl(item.valorDisponivel)}
                    <span className="ml-1 text-[length:var(--text-xs)] font-normal text-[var(--color-text-muted)]">
                      ({item.percentualDisponivel.toFixed(1)}%)
                    </span>
                  </p>
                </div>
                <div>
                  <p className="text-[length:var(--text-xs)] font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
                    Reservado
                  </p>
                  <p className="mt-[var(--space-1)] font-mono text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
                    {formatBrl(item.valorReservado)}
                  </p>
                </div>
                <div>
                  <p className="text-[length:var(--text-xs)] font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
                    Utilizado
                  </p>
                  <p className="mt-[var(--space-1)] font-mono text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
                    {formatBrl(item.valorUtilizado)}
                  </p>
                </div>
                <div>
                  <p className="text-[length:var(--text-xs)] font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
                    Valor total
                  </p>
                  <p className="mt-[var(--space-1)] font-mono text-[length:var(--text-sm)] font-semibold text-[var(--color-text)]">
                    {formatBrl(item.valorTotal)}
                  </p>
                </div>
              </div>

              <SaldoLinhaProgresso saldo={item} />
            </Card>
          </li>
        )
      })}
    </ul>
  )
}
