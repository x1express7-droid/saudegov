'use client'

import {
  BarChart3,
  CalendarDays,
  ClipboardList,
  FileText,
  LayoutDashboard,
  List,
  PlusCircle,
  Receipt,
  Settings,
  UserSearch,
  Wallet,
  type LucideIcon,
} from 'lucide-react'

const SAUDE_NAV_ICONS: Record<string, LucideIcon> = {
  BarChart3,
  CalendarDays,
  ClipboardList,
  FileText,
  LayoutDashboard,
  List,
  PlusCircle,
  Receipt,
  Settings,
  UserSearch,
  Wallet,
}

export function resolveSaudeNavIcon(name: string): LucideIcon | null {
  return SAUDE_NAV_ICONS[name] ?? null
}
