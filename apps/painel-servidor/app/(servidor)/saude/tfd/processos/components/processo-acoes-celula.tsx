'use client'

import type { ProcessoTfdListItem } from '@saude/mod-saude-tfd/client'
import { Button } from '@saude/ui'
import { MoreHorizontal } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'

// BLOCO-8-PROCESSOS
const PROCESSOS_BASE = '/saude/tfd/processos'

type DropdownItem = { label: string; href: string }

function buildDropdownItems(
  item: ProcessoTfdListItem,
  podeNovaSolicitacao: boolean
): DropdownItem[] {
  const items: DropdownItem[] = [
    { label: 'Ver processo', href: `${PROCESSOS_BASE}/${item.processoId}` },
  ]

  if (podeNovaSolicitacao) {
    items.push({
      label: 'Nova solicitação',
      href: `/saude/tfd/nova?processoId=${item.processoId}`,
    })
  }

  return items
}

export interface ProcessoAcoesCelulaProps {
  item: ProcessoTfdListItem
  podeNovaSolicitacao: boolean
}

export function ProcessoAcoesCelula({ item, podeNovaSolicitacao }: ProcessoAcoesCelulaProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const processoHref = `${PROCESSOS_BASE}/${item.processoId}`
  const dropdownItems = buildDropdownItems(item, podeNovaSolicitacao)

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
        <Link href={processoHref}>Ver</Link>
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
