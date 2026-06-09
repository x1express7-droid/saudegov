'use client'

import { Card } from '@saude/ui'
import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

// BLOCO-12-RELATORIOS
export interface RelatorioSectionCardProps {
  titulo: string
  icon: LucideIcon
  children: ReactNode
}

export function RelatorioSectionCard({ titulo, icon: Icon, children }: RelatorioSectionCardProps) {
  return (
    <Card
      header={
        <div className="flex items-center gap-[var(--space-2)]">
          <Icon className="size-5 shrink-0 text-[var(--color-primary)]" aria-hidden="true" />
          <h2 className="text-[length:var(--text-base)] font-semibold text-[var(--color-text)]">
            {titulo}
          </h2>
        </div>
      }
      bodyClassName="flex flex-col gap-[var(--space-4)] p-[var(--space-4)]"
    >
      {children}
    </Card>
  )
}
