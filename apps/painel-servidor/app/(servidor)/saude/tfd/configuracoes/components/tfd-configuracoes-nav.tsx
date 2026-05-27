'use client'

import { TabNav, type TabNavItem } from '@saude/ui'

export type TfdConfiguracoesNavItem = TabNavItem

export interface TfdConfiguracoesNavProps {
  items: TfdConfiguracoesNavItem[]
}

export function TfdConfiguracoesNav({ items }: TfdConfiguracoesNavProps) {
  return <TabNav items={items} ariaLabel="Configurações TFD" />
}
