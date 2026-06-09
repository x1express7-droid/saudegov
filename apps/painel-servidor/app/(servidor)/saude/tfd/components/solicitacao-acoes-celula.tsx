'use client'

import { hasPermission } from '@saude/core-auth/permissions'
import type { SaudeMunicSession } from '@saude/core-auth/types/session'
import { TFD_PERMISSIONS } from '@saude/mod-saude-tfd/permissions'
import type { TfdSolicitacaoListItem } from '@saude/mod-saude-tfd/client'
import { Button } from '@saude/ui'
import { MoreHorizontal } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'

import { MoverFilaDialog } from './mover-fila-dialog'

// BLOCO-6-REVISADO
const TFD_DETAIL_BASE = '/saude/tfd'

type DropdownItem =
  | { kind: 'link'; label: string; href: string }
  | { kind: 'mover-fila' }

function buildDropdownItems(item: TfdSolicitacaoListItem, session: SaudeMunicSession): DropdownItem[] {
  const detailHref = `${TFD_DETAIL_BASE}/${item.id}`
  const processoHref = `/saude/tfd/processos/${item.processoId}`
  const agendamentoNovoHref = `/saude/tfd/processos/${item.processoId}/agendamentos/novo?solicitacaoId=${item.id}`
  const podeMoverFila =
    item.posicaoFila != null && hasPermission(session, TFD_PERMISSIONS.MOVER_FILA)
  const podeCriarAgendamento = hasPermission(session, TFD_PERMISSIONS.CRIAR_AGENDAMENTO)

  switch (item.status) {
    case 'RASCUNHO':
      return [
        { kind: 'link', label: 'Editar', href: detailHref },
        { kind: 'link', label: 'Enviar solicitação', href: detailHref },
      ]
    case 'ENVIADO':
    case 'EM_ANALISE':
    case 'PENDENTE': {
      const items: DropdownItem[] = [{ kind: 'link', label: 'Ver detalhes', href: detailHref }]
      if (podeMoverFila) {
        items.push({ kind: 'mover-fila' })
      }
      return items
    }
    case 'APROVADO': {
      const items: DropdownItem[] = [{ kind: 'link', label: 'Ver detalhes', href: detailHref }]
      if (podeCriarAgendamento) {
        items.push({ kind: 'link', label: 'Criar agendamento', href: agendamentoNovoHref })
      }
      return items
    }
    case 'AGENDADO':
    case 'EM_VIAGEM':
      return [
        { kind: 'link', label: 'Ver detalhes', href: detailHref },
        { kind: 'link', label: 'Ver agendamento', href: processoHref },
      ]
    case 'AGUARDANDO_PC':
    case 'PC_EM_ANALISE':
      return [
        { kind: 'link', label: 'Ver detalhes', href: detailHref },
        { kind: 'link', label: 'Ver prestação', href: detailHref },
      ]
    case 'CONCLUIDO':
    case 'NEGADO':
    case 'CANCELADO':
      return [{ kind: 'link', label: 'Ver detalhes', href: detailHref }]
    default:
      return [{ kind: 'link', label: 'Ver detalhes', href: detailHref }]
  }
}

export interface SolicitacaoAcoesCelulaProps {
  item: TfdSolicitacaoListItem
  session: SaudeMunicSession
}

export function SolicitacaoAcoesCelula({ item, session }: SolicitacaoAcoesCelulaProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [moverFilaOpen, setMoverFilaOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const detailHref = `${TFD_DETAIL_BASE}/${item.id}`
  const dropdownItems = buildDropdownItems(item, session)

  useEffect(() => {
    if (!menuOpen) {
      return
    }

    function handlePointerDown(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [menuOpen])

  return (
    <div
      className="flex items-center justify-end gap-[var(--space-1)]"
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      <Button variant="outline" asChild className="min-h-[36px] px-[var(--space-3)] text-[length:var(--text-xs)]">
        <Link href={detailHref}>Ver</Link>
      </Button>

      {dropdownItems.length > 0 ? (
        <div className="relative" ref={menuRef}>
          <Button
            type="button"
            variant="ghost"
            className="min-h-[36px] min-w-[36px] px-[var(--space-2)]"
            aria-label="Mais ações"
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            onClick={() => setMenuOpen((current) => !current)}
          >
            <MoreHorizontal className="size-4" aria-hidden="true" />
          </Button>

          {menuOpen ? (
            <div
              role="menu"
              className="absolute right-0 z-20 mt-[var(--space-1)] min-w-[12rem] rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] py-[var(--space-1)] shadow-lg"
            >
              {dropdownItems.map((dropdownItem) => {
                if (dropdownItem.kind === 'link') {
                  return (
                    <Link
                      key={dropdownItem.label}
                      href={dropdownItem.href}
                      role="menuitem"
                      className="block px-[var(--space-3)] py-[var(--space-2)] text-[length:var(--text-sm)] text-[var(--color-text)] hover:bg-[var(--color-bg)]"
                      onClick={() => setMenuOpen(false)}
                    >
                      {dropdownItem.label}
                    </Link>
                  )
                }

                return (
                  <button
                    key="mover-fila"
                    type="button"
                    role="menuitem"
                    className="block w-full px-[var(--space-3)] py-[var(--space-2)] text-left text-[length:var(--text-sm)] text-[var(--color-text)] hover:bg-[var(--color-bg)]"
                    onClick={() => {
                      setMenuOpen(false)
                      setMoverFilaOpen(true)
                    }}
                  >
                    Mover na fila
                  </button>
                )
              })}
            </div>
          ) : null}
        </div>
      ) : null}

      {item.posicaoFila != null ? (
        <MoverFilaDialog
          session={session}
          solicitacaoId={item.id}
          protocolo={item.protocolo}
          posicaoAtual={item.posicaoFila}
          open={moverFilaOpen}
          onOpenChange={setMoverFilaOpen}
          hideTrigger
        />
      ) : null}
    </div>
  )
}
