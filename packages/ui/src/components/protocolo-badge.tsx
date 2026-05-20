'use client'

import { Check, Copy } from 'lucide-react'
import { useState } from 'react'
import { cn } from '../utils/cn'
import { focusRingClassName } from '../utils/field-control'

export interface ProtocoloBadgeProps {
  protocolo: string
  className?: string
}

export function ProtocoloBadge({ protocolo, className }: ProtocoloBadgeProps) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(protocolo)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-[var(--space-2)] rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] px-[var(--space-2)] py-[var(--space-1)]',
        className
      )}
    >
      <span className="protocolo text-[length:var(--text-sm)] text-[var(--color-text)]">
        {protocolo}
      </span>
      <button
        type="button"
        onClick={() => void handleCopy()}
        aria-label={copied ? 'Protocolo copiado' : 'Copiar protocolo'}
        className={cn(
          'inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-[var(--radius-sm)] text-[var(--color-text-muted)] transition-colors',
          'hover:bg-[var(--color-bg)] hover:text-[var(--color-text)]',
          focusRingClassName
        )}
      >
        {copied ? (
          <Check className="size-4 text-[var(--color-success)]" aria-hidden="true" />
        ) : (
          <Copy className="size-4" aria-hidden="true" />
        )}
      </button>
    </span>
  )
}
