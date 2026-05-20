'use client'

import { signOut } from '@saude/core-auth/client'

export function SignOutButton() {
  return (
    <button
      type="button"
      onClick={() => void signOut({ callbackUrl: '/login' })}
      className={cnSignOut()}
    >
      Sair
    </button>
  )
}

function cnSignOut() {
  return [
    'inline-flex min-h-[44px] items-center justify-center rounded-[var(--radius-sm)] px-[var(--space-3)]',
    'text-[length:var(--text-sm)] font-medium text-[var(--color-header-text)] transition-colors',
    'hover:bg-[color-mix(in_srgb,var(--color-header-text)_12%,transparent)]',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-header-text)]',
  ].join(' ')
}
