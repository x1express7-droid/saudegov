'use client'

import { Sidebar, cn, type SaudeNavChildConfig } from '@saude/ui'
import { useEffect, useState, type ReactNode } from 'react'
import { useSidebarMode } from '../lib/use-sidebar-mode'
import { AppHeader } from './app-header'

export interface AppShellProps {
  pathname: string
  modules: Record<string, Record<string, boolean>>
  municipalityName: string
  userName: string
  logoUrl?: string
  showConfigNav?: boolean
  configHref?: string
  tfdConfigNavChild?: SaudeNavChildConfig
  tfdFinanceiroNav?: SaudeNavChildConfig[]
  children: ReactNode
}

export function AppShell({
  pathname,
  modules,
  municipalityName,
  userName,
  logoUrl,
  showConfigNav = false,
  configHref,
  tfdConfigNavChild,
  tfdFinanceiroNav = [],
  children,
}: AppShellProps) {
  const sidebarMode = useSidebarMode()
  const [drawerOpen, setDrawerOpen] = useState(false)

  const isDrawer = sidebarMode === 'drawer'
  const sidebarCollapsed = sidebarMode === 'collapsed'

  useEffect(() => {
    if (!isDrawer) {
      setDrawerOpen(false)
    }
  }, [isDrawer])

  useEffect(() => {
    setDrawerOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!isDrawer || !drawerOpen) {
      document.body.style.overflow = ''
      return
    }
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [isDrawer, drawerOpen])

  const closeDrawer = () => setDrawerOpen(false)

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <AppHeader
        municipalityName={municipalityName}
        userName={userName}
        logoUrl={logoUrl}
        showMenuButton={isDrawer}
        menuOpen={drawerOpen}
        onMenuToggle={() => setDrawerOpen((open) => !open)}
      />

      {isDrawer && drawerOpen ? (
        <button
          type="button"
          className="fixed inset-0 top-16 z-40 bg-[color-mix(in_srgb,var(--color-text)_40%,transparent)] lg:hidden"
          aria-label="Fechar menu"
          onClick={closeDrawer}
        />
      ) : null}

      <div className="flex min-h-screen pt-16">
        <aside
          id="app-sidebar"
          aria-hidden={isDrawer && !drawerOpen ? true : undefined}
          className={cn(
            'shrink-0 transition-transform duration-200 ease-out',
            isDrawer
              ? cn(
                  'fixed bottom-0 left-0 top-16 z-50',
                  drawerOpen ? 'translate-x-0' : '-translate-x-full'
                )
              : 'static translate-x-0'
          )}
        >
          <Sidebar
            modules={modules}
            pathname={pathname}
            collapsed={sidebarCollapsed}
            onNavigate={closeDrawer}
            showConfigNav={showConfigNav}
            configHref={configHref}
            tfdConfigNavChild={tfdConfigNavChild}
            tfdFinanceiroNav={tfdFinanceiroNav}
            className="h-[calc(100vh-4rem)] min-h-0"
          />
        </aside>

        <main className="min-w-0 flex-1 overflow-x-auto p-[var(--space-4)] md:p-[var(--space-6)]">
          <div className="mx-auto w-full max-w-full min-w-0">{children}</div>
        </main>
      </div>
    </div>
  )
}
