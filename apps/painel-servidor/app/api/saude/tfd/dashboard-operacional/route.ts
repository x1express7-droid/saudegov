import { assertModuleActive, requireTenantRole } from '@saude/core-auth/server'
import { getDashboardTfdOperacional } from '@saude/mod-saude-tfd'
import { NextResponse } from 'next/server'

function jsonError(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status })
}

export async function GET(): Promise<NextResponse> {
  try {
    await assertModuleActive('saude', 'tfd')
    await requireTenantRole('SERVIDOR')
    const data = await getDashboardTfdOperacional()
    return NextResponse.json(data)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao carregar o dashboard.'
    const status =
      message.includes('não autorizado') || message.includes('Unauthorized')
        ? 401
        : message.includes('permissão') || message.includes('Forbidden')
          ? 403
          : 500
    return jsonError(message, status)
  }
}
