'use client'

import { cn } from '@saude/ui'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export interface TfdConfiguracoesNavItem {
  label: string
  href: string
}

function isActivePath(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`)
}

export interface TfdConfiguracoesNavProps {
  items: TfdConfiguracoesNavItem[]
}

export function TfdConfiguracoesNav({ items }: TfdConfiguracoesNavProps) {
  const pathname = usePathname()

  if (items.length === 0) {
    return null
  }

  return (
    <nav aria-label="Configurações TFD">
      <ul className="flex flex-wrap gap-1 border-b border-[var(--color-border)]">
        {items.map((item) => {
          const active = isActivePath(pathname, item.href)

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'inline-flex min-h-[44px] items-center border-b-2 px-3 py-2 text-sm transition-colors',
                  active
                    ? 'border-[var(--color-primary)] font-semibold text-[var(--color-primary)]'
                    : 'border-transparent font-medium text-[var(--color-text-muted)] hover:border-[var(--color-border)] hover:text-[var(--color-text)]'
                )}
              >
                {item.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
