export interface GooglePlaceSuggestion {
  id: string
  label: string
  value: string
}

const PLACES_AUTOCOMPLETE_NEW_URL = 'https://places.googleapis.com/v1/places:autocomplete'
const PLACES_AUTOCOMPLETE_LEGACY_URL =
  'https://maps.googleapis.com/maps/api/place/autocomplete/json'

function resolveGooglePlacesConfig() {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY?.trim()
  const languageCode = process.env.GOOGLE_PLACES_LANGUAGE?.trim() || 'pt-BR'
  const regionCode = process.env.GOOGLE_PLACES_REGION?.trim().toLowerCase() || 'br'

  return { apiKey, languageCode, regionCode }
}

function mapNewApiSuggestions(payload: unknown): GooglePlaceSuggestion[] {
  if (typeof payload !== 'object' || payload === null) {
    return []
  }

  const suggestions = (payload as { suggestions?: unknown[] }).suggestions
  if (!Array.isArray(suggestions)) {
    return []
  }

  const items: GooglePlaceSuggestion[] = []

  for (const entry of suggestions) {
    if (typeof entry !== 'object' || entry === null) {
      continue
    }

    const prediction = (entry as { placePrediction?: Record<string, unknown> }).placePrediction
    if (!prediction || typeof prediction !== 'object') {
      continue
    }

    const text =
      typeof (prediction.text as { text?: unknown } | undefined)?.text === 'string'
        ? (prediction.text as { text: string }).text
        : null

    const mainText =
      typeof (prediction.structuredFormat as { mainText?: { text?: unknown } } | undefined)
        ?.mainText?.text === 'string'
        ? (prediction.structuredFormat as { mainText: { text: string } }).mainText.text
        : null

    const secondaryText =
      typeof (prediction.structuredFormat as { secondaryText?: { text?: unknown } } | undefined)
        ?.secondaryText?.text === 'string'
        ? (prediction.structuredFormat as { secondaryText: { text: string } }).secondaryText.text
        : null

    const label =
      text ??
      (mainText && secondaryText ? `${mainText}, ${secondaryText}` : mainText) ??
      null

    if (!label?.trim()) {
      continue
    }

    const placeId =
      typeof prediction.placeId === 'string'
        ? prediction.placeId
        : typeof prediction.place === 'string'
          ? prediction.place
          : `place-${items.length}`

    items.push({
      id: placeId,
      label: label.trim(),
      value: label.trim(),
    })
  }

  return items
}

interface LegacyAutocompletePayload {
  status?: string
  error_message?: string
  predictions?: Array<{ description?: string; place_id?: string }>
}

function parseLegacyAutocompletePayload(payload: unknown): LegacyAutocompletePayload {
  if (typeof payload !== 'object' || payload === null) {
    return {}
  }

  return payload as LegacyAutocompletePayload
}

function mapLegacyApiSuggestions(payload: LegacyAutocompletePayload): GooglePlaceSuggestion[] {
  const status = payload.status
  if (status && status !== 'OK' && status !== 'ZERO_RESULTS') {
    return []
  }

  const predictions = payload.predictions
  if (!Array.isArray(predictions)) {
    return []
  }

  return predictions
    .map((prediction, index) => {
      const label = prediction.description?.trim()
      if (!label) {
        return null
      }

      return {
        id: prediction.place_id ?? `legacy-${index}`,
        label,
        value: label,
      }
    })
    .filter((item): item is GooglePlaceSuggestion => item !== null)
}

function resolveLegacyAutocompleteError(payload: LegacyAutocompletePayload): string | null {
  if (!payload.status || payload.status === 'OK' || payload.status === 'ZERO_RESULTS') {
    return null
  }

  return payload.error_message ?? `Google Places retornou status ${payload.status}.`
}

async function autocompletePlacesNew(
  input: string,
  apiKey: string,
  languageCode: string,
  regionCode: string
): Promise<GooglePlaceSuggestion[]> {
  const response = await fetch(PLACES_AUTOCOMPLETE_NEW_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
    },
    body: JSON.stringify({
      input,
      languageCode,
      includedRegionCodes: [regionCode],
    }),
    cache: 'no-store',
  })

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(`Places API (New) falhou (${response.status}): ${body.slice(0, 200)}`)
  }

  const payload = (await response.json()) as unknown
  return mapNewApiSuggestions(payload)
}

async function autocompletePlacesLegacy(
  input: string,
  apiKey: string,
  languageCode: string,
  regionCode: string
): Promise<{ items: GooglePlaceSuggestion[]; error: string | null }> {
  const url = new URL(PLACES_AUTOCOMPLETE_LEGACY_URL)
  url.searchParams.set('input', input)
  url.searchParams.set('key', apiKey)
  url.searchParams.set('language', languageCode)
  url.searchParams.set('components', `country:${regionCode}`)

  const response = await fetch(url, { cache: 'no-store' })
  if (!response.ok) {
    throw new Error(`Places API (legada) falhou (${response.status}).`)
  }

  const payload = parseLegacyAutocompletePayload(await response.json())
  return {
    items: mapLegacyApiSuggestions(payload),
    error: resolveLegacyAutocompleteError(payload),
  }
}

export async function buscarSugestoesGooglePlaces(input: string): Promise<GooglePlaceSuggestion[]> {
  const trimmed = input.trim()
  if (trimmed.length < 2) {
    return []
  }

  const { apiKey, languageCode, regionCode } = resolveGooglePlacesConfig()
  if (!apiKey) {
    throw new Error('GOOGLE_MAPS_API_KEY não configurada no servidor.')
  }

  let lastError: string | null = null

  try {
    const items = await autocompletePlacesNew(trimmed, apiKey, languageCode, regionCode)
    if (items.length > 0) {
      return items
    }
  } catch (error) {
    lastError = error instanceof Error ? error.message : 'Erro desconhecido na Places API (New).'
    console.warn('[google-places] Places API (New) indisponível, tentando legada:', {
      error: lastError,
    })
  }

  const legacy = await autocompletePlacesLegacy(trimmed, apiKey, languageCode, regionCode)
  if (legacy.items.length > 0) {
    return legacy.items
  }

  if (legacy.error) {
    throw new Error(legacy.error)
  }

  if (lastError) {
    throw new Error(lastError)
  }

  return []
}
