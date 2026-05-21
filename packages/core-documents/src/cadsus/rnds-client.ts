import type { CadsusResult, CadsusService } from './types'

type FhirBundleEntry = {
  resource?: Record<string, unknown>
}

type FhirBundle = {
  entry?: FhirBundleEntry[]
}

function parseFhirBundle(data: unknown): FhirBundle | null {
  if (typeof data !== 'object' || data === null) {
    return null
  }
  const record = data as Record<string, unknown>
  if (!Array.isArray(record.entry)) {
    return null
  }
  return { entry: record.entry as FhirBundleEntry[] }
}

export class CadsusRnds implements CadsusService {
  constructor(
    private readonly cnes: string,
    private readonly token: string
  ) {}

  async buscarPorCns(cns: string): Promise<CadsusResult> {
    const response = await fetch(
      `https://ehr.saude.gov.br/api/fhir/r4/Patient?identifier=http://rnds.saude.gov.br/fhir/r4/NamingSystem/cns|${cns}`,
      {
        headers: {
          Authorization: `Bearer ${this.token}`,
          'X-Authorization-Server': `Bearer ${this.token}`,
          'Content-Type': 'application/fhir+json',
        },
      }
    )

    if (!response.ok) return { encontrado: false }

    const bundle = parseFhirBundle(await response.json())
    const firstEntry = bundle?.entry?.[0]
    if (!firstEntry?.resource) return { encontrado: false }

    return this.mapFhirToResult(firstEntry.resource)
  }

  private mapFhirToResult(_patient: Record<string, unknown>): CadsusResult {
    return { encontrado: true }
  }
}
