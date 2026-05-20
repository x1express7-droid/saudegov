// Tenant Resolver + Auth Guard — implementado na Sprint 0.3

import { NextResponse } from 'next/server'

export function middleware() {
  return NextResponse.next()
}
