export interface IbgeMunicipioResumo {
  nome: string
  uf: string
}

let municipiosCache: IbgeMunicipioResumo[] | null = null
let municipiosPromise: Promise<IbgeMunicipioResumo[]> | null = null

interface IbgeMunicipioRaw {
  nome: string
  microrregiao?: { mesorregiao?: { UF?: { sigla?: string } } } | null
  'regiao-imediata'?: { 'regiao-intermediaria'?: { UF?: { sigla?: string } } } | null
}

function extrairUf(item: IbgeMunicipioRaw): string | null {
  return (
    item.microrregiao?.mesorregiao?.UF?.sigla ??
    item['regiao-imediata']?.['regiao-intermediaria']?.UF?.sigla ??
    null
  )
}

export async function loadIbgeMunicipiosResumo(): Promise<IbgeMunicipioResumo[]> {
  if (municipiosCache) {
    return municipiosCache
  }
  if (municipiosPromise) {
    return municipiosPromise
  }

  municipiosPromise = fetch(
    'https://servicodados.ibge.gov.br/api/v1/localidades/municipios?orderBy=nome',
    { next: { revalidate: 60 * 60 * 24 } }
  )
    .then(async (response) => {
      if (!response.ok) {
        throw new Error('Falha ao carregar municípios do IBGE.')
      }

      const data = (await response.json()) as IbgeMunicipioRaw[]

      municipiosCache = data
        .map((item) => {
          const uf = extrairUf(item)
          if (!uf) {
            return null
          }
          return { nome: item.nome, uf }
        })
        .filter((item): item is IbgeMunicipioResumo => item !== null)

      return municipiosCache
    })
    .finally(() => {
      municipiosPromise = null
    })

  return municipiosPromise
}

export function labelMunicipioIbge(municipio: IbgeMunicipioResumo): string {
  return `${municipio.nome}/${municipio.uf}`
}

export function normalizeMunicipioSearch(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
}

export function filtrarMunicipiosIbge(
  municipios: IbgeMunicipioResumo[],
  termo: string,
  limite = 25
): IbgeMunicipioResumo[] {
  const normalized = normalizeMunicipioSearch(termo)
  if (!normalized) {
    return []
  }

  const resultados: IbgeMunicipioResumo[] = []

  for (const municipio of municipios) {
    const label = labelMunicipioIbge(municipio)
    if (normalizeMunicipioSearch(label).includes(normalized)) {
      resultados.push(municipio)
      if (resultados.length >= limite) {
        break
      }
    }
  }

  return resultados
}
