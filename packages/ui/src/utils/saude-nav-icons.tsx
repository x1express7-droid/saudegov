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

import type { SaudeNavIconName } from '../config/saude-modules-nav'

const SAUDE_NAV_ICONS: Record<SaudeNavIconName, LucideIcon> = {
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

export function resolveSaudeNavIcon(name: SaudeNavIconName): LucideIcon {
  return SAUDE_NAV_ICONS[name]
}
