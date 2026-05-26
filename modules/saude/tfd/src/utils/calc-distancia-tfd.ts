/**
 * Distância origem (município gestor) → destino (prestador).
 * Sem API externa — heurística com dados de cadastro (DATABASE_SCHEMA.md settings + prestador).
 */

export interface TenantMunicipioOrigem {
  cidade?: string
  estado?: string
  codigoIbge?: string
}

export interface TfdPrestadorDestinoLocal {
  cidade: string
  estado: string
}

const SETTINGS_CIDADE_KEYS = ['municipio_origem_cidade', 'municipioOrigemCidade'] as const
const SETTINGS_ESTADO_KEYS = ['municipio_origem_estado', 'municipioOrigemEstado'] as const
const SETTINGS_IBGE_KEYS = ['municipio_origem_codigo_ibge', 'municipioOrigemCodigoIbge'] as const

function pickStringFromRecord(record: Record<string, unknown>, keys: readonly string[]): string {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string' && value.trim() !== '') {
      return value.trim()
    }
  }
  return ''
}

function normalizeTextoLocal(value: string): string {
  return value
    .trim()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
}

function normalizeUf(value: string): string {
  return value.trim().toUpperCase().slice(0, 2)
}

/**
 * Lê município de origem do tenant a partir de `settings` (JSONB).
 * Retorna `null` se cidade e estado não estiverem configurados.
 */
export function parseMunicipioOrigemFromSettings(settings: unknown): TenantMunicipioOrigem | null {
  if (typeof settings !== 'object' || settings === null || Array.isArray(settings)) {
    return null
  }

  const record = settings as Record<string, unknown>
  const cidade = pickStringFromRecord(record, SETTINGS_CIDADE_KEYS)
  const estado = pickStringFromRecord(record, SETTINGS_ESTADO_KEYS)
  const codigoIbge = pickStringFromRecord(record, SETTINGS_IBGE_KEYS)

  if (!cidade || !estado) {
    return null
  }

  return {
    cidade,
    estado: normalizeUf(estado),
    ...(codigoIbge ? { codigoIbge } : {}),
  }
}

/**
 * Calcula distância em km quando há correspondência exata município origem = cidade do prestador.
 * Mesmo município (cidade + UF iguais) → `0`.
 * Demais combinações → `null` (gestor informa `distancia_km` manualmente na decisão).
 */
export function calcDistanciaTfdKm(input: {
  origem: TenantMunicipioOrigem | null
  destino: TfdPrestadorDestinoLocal
}): number | null {
  const { origem, destino } = input

  if (!origem?.cidade || !origem.estado) {
    return null
  }

  const origemCidade = normalizeTextoLocal(origem.cidade)
  const origemUf = normalizeUf(origem.estado)
  const destinoCidade = normalizeTextoLocal(destino.cidade)
  const destinoUf = normalizeUf(destino.estado)

  if (origemUf !== destinoUf) {
    return null
  }

  if (origemCidade === destinoCidade) {
    return 0
  }

  return null
}
