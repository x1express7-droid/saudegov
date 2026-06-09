'use client'

import type { TfdPacienteVinculadoItem } from '@saude/mod-saude-tfd/client'
import { Button } from '@saude/ui'
import { MoreHorizontal } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'

// BLOCO-7-PACIENTES
const PACIENTE_BASE = '/saude/tfd/pacientes'

type DropdownItem = { label: string; href: string }

function buildDropdownItems(
  item: TfdPacienteVinculadoItem,
  podeEditarPaciente: boolean,
  podeNovaSolicitacao: boolean
): DropdownItem[] {
  const items: DropdownItem[] = []

  if (podeEditarPaciente) {
    items.push({
      label: 'Editar dados',
      href: `${PACIENTE_BASE}/novo?pacienteId=${item.id}`,
    })
  }

  if (podeNovaSolicitacao) {
    items.push({
      label: 'Nova solicitação',
      href: `/saude/tfd/nova?pacienteId=${item.id}`,
    })
  }

  return items
}

export interface PacienteAcoesCelulaProps {
  item: TfdPacienteVinculadoItem
  podeVerPerfilPaciente: boolean
  podeEditarPaciente: boolean
  podeNovaSolicitacao: boolean
}

export function PacienteAcoesCelula({
  item,
  podeVerPerfilPaciente,
  podeEditarPaciente,
  podeNovaSolicitacao,
}: PacienteAcoesCelulaProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const perfilHref = `${PACIENTE_BASE}/${item.id}`
  const dropdownItems = buildDropdownItems(item, podeEditarPaciente, podeNovaSolicitacao)

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

  if (!podeVerPerfilPaciente) {
    return <span className="text-[var(--color-text-muted)]">—</span>
  }

  return (
    <div
      className="flex items-center justify-end gap-[var(--space-1)]"
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      <Button variant="outline" asChild className="min-h-[36px] px-[var(--space-3)] text-[length:var(--text-xs)]">
        <Link href={perfilHref}>Ver</Link>
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
      ) : null}
    </div>
  )
}
