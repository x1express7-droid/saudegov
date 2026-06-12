import { assertModuleActive, requireTenantRole } from '@saude/core-auth/server'
import {
  filtrarMunicipiosIbge,
  labelMunicipioIbge,
  loadIbgeMunicipiosResumo,
} from '../../../../../lib/ibge-municipios-cache'
import { buscarSugestoesGooglePlaces } from '../../../../../lib/google-places'
import { NextResponse } from 'next/server'

function jsonError(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status })
}

async function buscarSugestoesIbge(termo: string) {
  const municipios = await loadIbgeMunicipiosResumo()
  const filtrados = filtrarMunicipiosIbge(municipios, termo)

  return filtrados.map((municipio) => {
    const label = labelMunicipioIbge(municipio)
    return {
      id: `${municipio.nome}-${municipio.uf}`,
      label,
      value: label,
    }
  })
}

export async function GET(request: Request): Promise<NextResponse> {
  try {
    await assertModuleActive('saude', 'tfd')
    await requireTenantRole('SERVIDOR')

    const { searchParams } = new URL(request.url)
    const termo = searchParams.get('q')?.trim() ?? ''

    if (termo.length < 2) {
      return NextResponse.json({ items: [] })
    }

    try {
      const googleItems = await buscarSugestoesGooglePlaces(termo)
      if (googleItems.length > 0) {
        return NextResponse.json({ items: googleItems, source: 'google' })
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Google Places indisponível.'
      console.warn('[places/autocomplete] Google indisponível, usando IBGE:', message)
    }

    const ibgeItems = await buscarSugestoesIbge(termo)
    return NextResponse.json({
      items: ibgeItems,
      source: ibgeItems.length > 0 ? 'ibge' : 'none',
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Erro ao buscar endereços no Google Places.'

    const status =
      message.includes('não configurada')
        ? 503
        : message.includes('não autorizado') || message.includes('Unauthorized')
          ? 401
          : message.includes('permissão') || message.includes('Forbidden')
            ? 403
            : 500

    console.error('[places/autocomplete] Erro:', message)
    return jsonError(message, status)
  }
}
