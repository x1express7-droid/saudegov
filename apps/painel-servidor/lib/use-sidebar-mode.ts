'use client'

import { useEffect, useState } from 'react'

/**
 * Modos da sidebar conforme DESIGN_SYSTEM.md §11:
 * - expanded: ≥1280px — 240px com labels
 * - collapsed: ≥1024px e <1280px — 64px, só ícones
 * - drawer: <1024px — oculta; abre via hambúrguer (≥768 tablet, <768 mobile)
 */
export type SidebarMode = 'drawer' | 'collapsed' | 'expanded'

export function useSidebarMode(): SidebarMode {
  const [mode, setMode] = useState<SidebarMode>('expanded')

  useEffect(() => {
    const queryXl = window.matchMedia('(min-width: 1280px)')
    const queryLg = window.matchMedia('(min-width: 1024px)')

    const update = () => {
      if (!queryLg.matches) {
        setMode('drawer')
        return
      }
      if (!queryXl.matches) {
        setMode('collapsed')
        return
      }
      setMode('expanded')
    }

    update()
    queryXl.addEventListener('change', update)
    queryLg.addEventListener('change', update)
    return () => {
      queryXl.removeEventListener('change', update)
      queryLg.removeEventListener('change', update)
    }
  }, [])

  return mode
}
