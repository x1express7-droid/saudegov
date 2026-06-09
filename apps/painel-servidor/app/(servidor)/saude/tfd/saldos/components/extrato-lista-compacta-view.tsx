'use client'

import {
  TFD_PERMISSIONS,
  formatExtratoOrigemLabel,
  type ExtratoMovimentacaoItem,
} from '@saude/mod-saude-tfd/client'
import type { SaudeMunicSession } from '@saude/core-auth/types/session'
import { Badge, Button, EmptyState, Spinner } from '@saude/ui'
import { PermissionGate } from '@saude/ui/permission-gate'
import Link from 'next/link'
import { useMemo } from 'react'

import {
  ExtratoTipoBadge,
  extratoValorClassName,
  formatExtratoValorComSinal,
} from './extrato-tipo-badge'
import { extratoDiaChave, formatExtratoData, formatExtratoDiaGrupo, formatExtratoHora } from './saldos-ui'

// BLOCO-11-SALDOS
function protocoloHref(protocolo: string): string {
  return `/saude/tfd/solicitacoes?protocolo=${encodeURIComponent(protocolo)}`
}

function ExtratoSituacao({ item }: { item: ExtratoMovimentacaoItem }) {
  if (item.tipo === 'ESTORNO' && item.movimentacaoOrigem) {
    return (
      <span className="text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
        Ref.: {formatExtratoOrigemLabel(item.movimentacaoOrigem)}
      </span>
    )
  }

  if (item.jaEstornada) {
    return (
      <Badge variant="orange" size="sm">
        Estornado
      </Badge>
    )
  }

  if (item.podeEstornar) {
    return (
      <Badge variant="teal" size="sm">
        Estornável
      </Badge>
    )
  }

  return null
}

function extratoLinhaClassName(item: ExtratoMovimentacaoItem): string {
  if (item.jaEstornada) {
    return 'opacity-60'
  }
  return ''
}

export interface ExtratoListaCompactaViewProps {
  items: ExtratoMovimentacaoItem[]
  session: SaudeMunicSession
  loading?: boolean
  onEstornar: (movimentacao: ExtratoMovimentacaoItem) => void
}

export function ExtratoListaCompactaView({
  items,
  session,
  loading = false,
  onEstornar,
}: ExtratoListaCompactaViewProps) {
  const gruposPorDia = useMemo(() => {
    const grupos = new Map<string, ExtratoMovimentacaoItem[]>()

    for (const item of items) {
      const chave = extratoDiaChave(item.criadoEm)
      const grupo = grupos.get(chave)
      if (grupo) {
        grupo.push(item)
      } else {
        grupos.set(chave, [item])
      }
    }

    return Array.from(grupos.entries())
  }, [items])

  if (items.length === 0) {
    return (
      <EmptyState
        titulo="Nenhuma movimentação registrada neste saldo no período selecionado."
        descricao="Ajuste o filtro de datas ou aguarde novas movimentações."
      />
    )
  }

  return (
    <div
      className="relative flex flex-col gap-[var(--space-4)] rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)]"
      aria-busy={loading}
    >
      {loading ? (
        <div
          className="absolute inset-0 z-10 flex items-center justify-center rounded-[var(--radius-lg)] bg-[color-mix(in_srgb,var(--color-surface)_80%,transparent)]"
          aria-hidden="true"
        >
          <Spinner className="size-6 text-[var(--color-primary)]" />
        </div>
      ) : null}

      {gruposPorDia.map(([chave, movimentacoes]) => (
        <section key={chave} aria-label={formatExtratoDiaGrupo(movimentacoes[0]!.criadoEm)}>
          <div className="sticky top-0 z-[1] border-b border-[var(--color-border)] bg-[var(--color-bg)] px-[var(--space-4)] py-[var(--space-2)]">
            <h3 className="text-[length:var(--text-xs)] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
              {formatExtratoDiaGrupo(movimentacoes[0]!.criadoEm)}
            </h3>
          </div>

          <ul className="divide-y divide-[var(--color-border)]">
            {movimentacoes.map((item) => (
              <li
                key={item.id}
                className={`px-[var(--space-4)] py-[var(--space-3)] transition-opacity ${extratoLinhaClassName(item)}`}
              >
                <div className="flex flex-col gap-[var(--space-3)] sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex min-w-0 flex-1 gap-[var(--space-3)]">
                    <div className="w-16 shrink-0 sm:w-20">
                      <p className="font-mono text-[length:var(--text-sm)] font-semibold text-[var(--color-text)]">
                        {formatExtratoData(item.criadoEm)}
                      </p>
                      <p className="mt-[var(--space-1)] font-mono text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
                        {formatExtratoHora(item.criadoEm)}
                      </p>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-[var(--space-2)]">
                        <ExtratoTipoBadge tipo={item.tipo} />
                        <ExtratoSituacao item={item} />
                      </div>
                      <p className="mt-[var(--space-1)] text-[length:var(--text-sm)] text-[var(--color-text)]">
                        {item.descricao}
                      </p>
                      <p className="mt-[var(--space-1)] flex flex-wrap items-center gap-x-[var(--space-2)] gap-y-[var(--space-1)] text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
                        {item.protocolo ? (
                          <Link
                            href={protocoloHref(item.protocolo)}
                            className="font-mono text-[var(--color-primary)] hover:underline"
                          >
                            {item.protocolo}
                          </Link>
                        ) : null}
                        {item.protocolo ? (
                          <span aria-hidden="true" className="text-[var(--color-text-subtle)]">
                            ·
                          </span>
                        ) : null}
                        <span>{item.usuarioNome}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-[var(--space-2)] sm:pl-[var(--space-3)]">
                    <p
                      className={`whitespace-nowrap text-[length:var(--text-base)] ${extratoValorClassName(item.tipo)}`}
                    >
                      {formatExtratoValorComSinal(item.tipo, item.valor)}
                    </p>
                    {item.podeEstornar ? (
                      <PermissionGate session={session} permission={TFD_PERMISSIONS.GERENCIAR_SALDO}>
                        <Button
                          type="button"
                          variant="outline"
                          className="min-h-[32px] px-[var(--space-3)] text-[length:var(--text-xs)]"
                          onClick={() => onEstornar(item)}
                        >
                          Estornar
                        </Button>
                      </PermissionGate>
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
