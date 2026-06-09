'use client'

import type { TfdAgendamentoConsultaListItem } from '@saude/mod-saude-tfd/client'
import { Button } from '@saude/ui'
import { MoreHorizontal } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'

import { agendamentoDetalheHref } from './agendamento-lista-utils'

// BLOCO-9-AGENDAMENTOS
type DropdownItem = { label: string; href: string }

function buildDropdownItems(item: TfdAgendamentoConsultaListItem): DropdownItem[] {
  const detalheHref = agendamentoDetalheHref(item)
  const items: DropdownItem[] = [{ label: 'Ver detalhes', href: detalheHref }]

  if (item.status === 'AGENDADO' || item.status === 'EM_VIAGEM') {
    items.push({ label: 'Registrar retorno', href: detalheHref })
  }

  if (item.status === 'AGENDADO') {
    items.push({ label: 'Cancelar agendamento', href: detalheHref })
  }

  return items
}

export interface AgendamentoAcoesCelulaProps {
  item: TfdAgendamentoConsultaListItem
}

export function AgendamentoAcoesCelula({ item }: AgendamentoAcoesCelulaProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const detalheHref = agendamentoDetalheHref(item)
  const dropdownItems = buildDropdownItems(item)

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
        <Link href={detalheHref}>Ver</Link>
      </Button>

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
            {dropdownItems.map((dropdownItem) => (
              <Link
                key={dropdownItem.label}
                href={dropdownItem.href}
                role="menuitem"
                className="block px-[var(--space-3)] py-[var(--space-2)] text-[length:var(--text-sm)] text-[var(--color-text)] hover:bg-[var(--color-bg)]"
                onClick={() => setMenuOpen(false)}
              >
                {dropdownItem.label}
              </Link>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}
