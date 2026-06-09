import { assertModuleActive, requireTenantRole } from '@saude/core-auth/server'
import {
  filtrarMunicipiosIbge,
  labelMunicipioIbge,
  loadIbgeMunicipiosResumo,
} from '../../../../../lib/ibge-municipios-cache'
import { NextResponse } from 'next/server'

function jsonError(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status })
}

export async function GET(request: Request): Promise<NextResponse> {
  try {
    await assertModuleActive('saude', 'tfd')
    await requireTenantRole('SERVIDOR')

    const { searchParams } = new URL(request.url)
    const termo = searchParams.get('q')?.trim() ?? ''

    const municipios = await loadIbgeMunicipiosResumo()

    if (!termo) {
      return NextResponse.json({
        items: municipios.map((municipio) => ({
          label: labelMunicipioIbge(municipio),
          value: labelMunicipioIbge(municipio),
        })),
      })
    }

    const filtrados = filtrarMunicipiosIbge(municipios, termo)

    return NextResponse.json({
      items: filtrados.map((municipio) => ({
        label: labelMunicipioIbge(municipio),
        value: labelMunicipioIbge(municipio),
      })),
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Erro ao carregar municípios do IBGE.'
    const status =
      message.includes('não autorizado') || message.includes('Unauthorized')
        ? 401
        : message.includes('permissão') || message.includes('Forbidden')
          ? 403
          : 500
    return jsonError(message, status)
  }
}
