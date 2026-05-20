'use client'

import { Menu, X } from 'lucide-react'
import { cn } from '@saude/ui'
import { SignOutButton } from './sign-out-button'

export interface AppHeaderProps {
  municipalityName: string
  systemName?: string
  userName: string
  logoUrl?: string
  showMenuButton?: boolean
  menuOpen?: boolean
  onMenuToggle?: () => void
}

export function AppHeader({
  municipalityName,
  systemName = 'Sistema de Saúde',
  userName,
  logoUrl,
  showMenuButton = false,
  menuOpen = false,
  onMenuToggle,
}: AppHeaderProps) {
  return (
    <header
      className="fixed inset-x-0 top-0 z-50 flex h-16 shrink-0 items-center gap-[var(--space-2)] border-b border-[color-mix(in_srgb,var(--color-header-text)_20%,transparent)] bg-[var(--color-header-bg)] px-[var(--space-3)] sm:px-[var(--space-4)] lg:px-[var(--space-6)]"
      style={{ color: 'var(--color-header-text)' }}
    >
      {showMenuButton ? (
        <button
          type="button"
          className={cn(
            'inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-[var(--radius-sm)] transition-colors lg:hidden',
            'hover:bg-[color-mix(in_srgb,var(--color-header-text)_12%,transparent)]',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-header-text)]'
          )}
          aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
          aria-expanded={menuOpen}
          aria-controls="app-sidebar"
          onClick={onMenuToggle}
        >
          {menuOpen ? <X className="size-5" aria-hidden="true" /> : <Menu className="size-5" aria-hidden="true" />}
        </button>
      ) : null}

      <div className="flex min-w-0 flex-1 items-center gap-[var(--space-3)]">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl}
            alt=""
            className="size-10 shrink-0 rounded-[var(--radius-sm)] object-contain"
          />
        ) : (
          <span
            className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[color-mix(in_srgb,var(--color-header-text)_15%,transparent)] text-[length:var(--text-sm)] font-bold"
            aria-hidden="true"
          >
            {municipalityName.charAt(0).toUpperCase()}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-[length:var(--text-sm)] font-semibold">{municipalityName}</p>
          <p className="truncate text-[length:var(--text-xs)] opacity-90">{systemName}</p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-[var(--space-2)] sm:gap-[var(--space-3)]">
        <span className="hidden max-w-[140px] truncate text-[length:var(--text-sm)] md:inline lg:max-w-[200px]">
          {userName}
        </span>
        <SignOutButton />
      </div>
    </header>
  )
}
