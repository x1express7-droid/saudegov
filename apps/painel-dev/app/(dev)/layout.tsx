import Link from 'next/link'
import { requireSuperAdmin } from '@saude/core-auth'

const navItems = [
  { href: '/municipios', label: 'Municípios' },
  { href: '/audit-logs', label: 'Audit logs' },
  { href: '/platform-features', label: 'Platform features' },
] as const

export default async function DevLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  await requireSuperAdmin()

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-56 shrink-0 flex-col border-r border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-950">
        <div className="border-b border-neutral-200 px-4 py-5 dark:border-neutral-800">
          <Link
            href="/dashboard"
            className="text-lg font-semibold text-neutral-900 hover:text-neutral-700 dark:text-neutral-100 dark:hover:text-neutral-300"
          >
            Painel Dev
          </Link>
          <p className="mt-1 text-xs text-neutral-500">SUPERADMIN</p>
        </div>
        <nav className="flex flex-col gap-1 p-3">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-200 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="flex-1 overflow-auto p-8">{children}</main>
    </div>
  )
}
