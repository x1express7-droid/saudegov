'use client'

import { createContext, useContext, type ReactNode } from 'react'

const OverlayPortalContext = createContext<HTMLElement | null>(null)

export function OverlayPortalProvider({
  container,
  children,
}: {
  container: HTMLElement | null
  children: ReactNode
}) {
  return <OverlayPortalContext.Provider value={container}>{children}</OverlayPortalContext.Provider>
}

/** Destino do portal de Select/Dropdown quando renderizado dentro de um Dialog. */
export function useOverlayPortalContainer(): HTMLElement | null {
  return useContext(OverlayPortalContext)
}
