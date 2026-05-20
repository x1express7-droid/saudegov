const CLOUDFLARE_API_BASE = 'https://api.cloudflare.com/client/v4'
const SAUDEMUNIC_BASE_DOMAIN = 'saudemunic.com.br'

export type CloudflareDnsResult =
  | { success: true; recordId: string; domain: string }
  | { success: false; error: string }

interface CloudflareApiError {
  code: number
  message: string
}

interface CloudflareDnsRecord {
  id: string
  type: string
  name: string
  content: string
  proxied: boolean
}

interface CloudflareApiResponse<TResult> {
  success: boolean
  errors: CloudflareApiError[]
  messages: unknown[]
  result: TResult | null
}

interface CloudflareConfig {
  zoneId: string
  apiToken: string
  vercelTarget: string
}

function getCloudflareConfig(): CloudflareConfig {
  const zoneId = process.env.CF_ZONE_ID?.trim()
  if (!zoneId) {
    throw new Error('Variável de ambiente obrigatória ausente: CF_ZONE_ID')
  }

  const apiToken = process.env.CF_API_TOKEN?.trim()
  if (!apiToken) {
    throw new Error('Variável de ambiente obrigatória ausente: CF_API_TOKEN')
  }

  const vercelTarget = process.env.CF_VERCEL_TARGET?.trim()
  if (!vercelTarget) {
    throw new Error('Variável de ambiente obrigatória ausente: CF_VERCEL_TARGET')
  }

  return { zoneId, apiToken, vercelTarget }
}

function formatCloudflareErrors(errors: CloudflareApiError[]): string {
  if (errors.length === 0) {
    return 'A API do Cloudflare retornou uma resposta de erro sem detalhes.'
  }
  return errors.map((e) => e.message).join('; ')
}

async function cloudflareFetch<TResult>(
  config: CloudflareConfig,
  path: string,
  init: RequestInit
): Promise<CloudflareApiResponse<TResult>> {
  const response = await fetch(`${CLOUDFLARE_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${config.apiToken}`,
      'Content-Type': 'application/json',
      ...init.headers,
    },
  })

  const body = (await response.json()) as CloudflareApiResponse<TResult>

  if (!response.ok) {
    throw new Error(
      body.errors?.length
        ? formatCloudflareErrors(body.errors)
        : `Requisição à API do Cloudflare falhou (HTTP ${response.status}).`
    )
  }

  return body
}

async function createCnameRecord(
  config: CloudflareConfig,
  name: string,
  fullDomain: string
): Promise<CloudflareDnsResult> {
  const body = await cloudflareFetch<CloudflareDnsRecord>(
    config,
    `/zones/${config.zoneId}/dns_records`,
    {
      method: 'POST',
      body: JSON.stringify({
        type: 'CNAME',
        name,
        content: config.vercelTarget,
        proxied: true,
      }),
    }
  )

  if (!body.success || !body.result?.id) {
    return {
      success: false,
      error: formatCloudflareErrors(body.errors),
    }
  }

  return {
    success: true,
    recordId: body.result.id,
    domain: fullDomain,
  }
}

export async function criarSubdominio(slug: string): Promise<CloudflareDnsResult> {
  try {
    const config = getCloudflareConfig()
    const normalizedSlug = slug.trim().toLowerCase()

    if (!normalizedSlug) {
      return { success: false, error: 'Slug do município inválido.' }
    }

    const subdomain = normalizedSlug.replace(/-/g, '')
    const domain = `${subdomain}.${SAUDEMUNIC_BASE_DOMAIN}`

    return await createCnameRecord(config, subdomain, domain)
  } catch (error) {
    console.error('[criarSubdominio] Falha ao criar subdomínio:', {
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    })

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Não foi possível criar o subdomínio no Cloudflare.',
    }
  }
}

export async function registrarDominioCustomizado(
  domain: string
): Promise<CloudflareDnsResult> {
  try {
    const config = getCloudflareConfig()
    const normalizedDomain = domain.trim().toLowerCase().replace(/\.$/, '')

    if (!normalizedDomain) {
      return { success: false, error: 'Domínio customizado inválido.' }
    }

    return await createCnameRecord(config, normalizedDomain, normalizedDomain)
  } catch (error) {
    console.error('[registrarDominioCustomizado] Falha ao registrar domínio:', {
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    })

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Não foi possível registrar o domínio customizado no Cloudflare.',
    }
  }
}

export async function removerRegistroDns(
  recordId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const config = getCloudflareConfig()
    const normalizedRecordId = recordId.trim()

    if (!normalizedRecordId) {
      return { success: false, error: 'ID do registro DNS inválido.' }
    }

    const body = await cloudflareFetch<{ id: string }>(
      config,
      `/zones/${config.zoneId}/dns_records/${normalizedRecordId}`,
      { method: 'DELETE' }
    )

    if (!body.success) {
      return { success: false, error: formatCloudflareErrors(body.errors) }
    }

    return { success: true }
  } catch (error) {
    console.error('[removerRegistroDns] Falha ao remover registro DNS:', {
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    })

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Não foi possível remover o registro DNS no Cloudflare.',
    }
  }
}
