import 'server-only'

import { createHmac, randomUUID, timingSafeEqual } from 'crypto'
import { mkdir, writeFile } from 'fs/promises'
import path from 'path'

export const EXPORT_URL_EXPIRES_MINUTES = 24 * 60

export class ExportStorageConfigError extends Error {
  readonly code = 'EXPORT_STORAGE_CONFIG' as const

  constructor(message: string) {
    super(message)
    this.name = 'ExportStorageConfigError'
  }
}

function getSigningSecret(): string {
  const secret = process.env.AUTH_SECRET?.trim() || process.env.NEXTAUTH_SECRET?.trim()
  if (!secret || secret.length < 32) {
    throw new ExportStorageConfigError(
      'Configuração de assinatura de URLs indisponível. Defina AUTH_SECRET com pelo menos 32 caracteres.'
    )
  }
  return secret
}

function getPublicBaseUrl(): string {
  const base =
    process.env.STORAGE_PUBLIC_BASE_URL?.trim() ||
    process.env.NEXTAUTH_URL?.trim() ||
    'http://localhost:3001'
  return base.replace(/\/$/, '')
}

function getLocalStorageRoot(): string {
  const configured = process.env.STORAGE_LOCAL_ROOT?.trim()
  if (configured) {
    return path.isAbsolute(configured) ? configured : path.resolve(process.cwd(), configured)
  }
  return path.resolve(process.cwd(), '.data', 'storage')
}

function signExportPayload(payload: string): string {
  const secret = getSigningSecret()
  return createHmac('sha256', secret).update(payload).digest('base64url')
}

export type ExportArquivoFormato = 'pdf' | 'csv' | 'json'

function buildExportStoragePath(
  tenantId: string,
  exportId: string,
  formato: ExportArquivoFormato = 'pdf'
): string {
  return `${tenantId}/exports/${exportId}.${formato}`
}

function resolveAbsolutePath(storagePath: string): string {
  return path.join(getLocalStorageRoot(), storagePath)
}

export interface SalvarExportTemporarioOutput {
  exportId: string
  storagePath: string
}

/** Persiste PDF de exportação em storage local temporário (path por tenant). */
export async function salvarExportTemporarioPdf(
  tenantId: string,
  buffer: Buffer
): Promise<SalvarExportTemporarioOutput> {
  const provider = process.env.STORAGE_PROVIDER?.trim().toLowerCase() ?? 'local'
  if (provider !== 'local') {
    throw new ExportStorageConfigError(
      'Exportação temporária disponível apenas com STORAGE_PROVIDER=local nesta sprint.'
    )
  }

  const exportId = randomUUID()
  const storagePath = buildExportStoragePath(tenantId, exportId, 'pdf')
  const absolutePath = resolveAbsolutePath(storagePath)

  await mkdir(path.dirname(absolutePath), { recursive: true })
  await writeFile(absolutePath, buffer)

  return { exportId, storagePath }
}

/** Persiste CSV de exportação em storage local temporário (path por tenant). */
export async function salvarExportTemporarioCsv(
  tenantId: string,
  conteudo: string
): Promise<SalvarExportTemporarioOutput> {
  const provider = process.env.STORAGE_PROVIDER?.trim().toLowerCase() ?? 'local'
  if (provider !== 'local') {
    throw new ExportStorageConfigError(
      'Exportação temporária disponível apenas com STORAGE_PROVIDER=local nesta sprint.'
    )
  }

  const exportId = randomUUID()
  const storagePath = buildExportStoragePath(tenantId, exportId, 'csv')
  const absolutePath = resolveAbsolutePath(storagePath)

  await mkdir(path.dirname(absolutePath), { recursive: true })
  await writeFile(absolutePath, Buffer.from(conteudo, 'utf-8'))

  return { exportId, storagePath }
}

/** Persiste JSON de exportação em storage local temporário (path por tenant). */
export async function salvarExportTemporarioJson(
  tenantId: string,
  conteudo: string
): Promise<SalvarExportTemporarioOutput> {
  const provider = process.env.STORAGE_PROVIDER?.trim().toLowerCase() ?? 'local'
  if (provider !== 'local') {
    throw new ExportStorageConfigError(
      'Exportação temporária disponível apenas com STORAGE_PROVIDER=local nesta sprint.'
    )
  }

  const exportId = randomUUID()
  const storagePath = buildExportStoragePath(tenantId, exportId, 'json')
  const absolutePath = resolveAbsolutePath(storagePath)

  await mkdir(path.dirname(absolutePath), { recursive: true })
  await writeFile(absolutePath, Buffer.from(conteudo, 'utf-8'))

  return { exportId, storagePath }
}

export interface GerarUrlDownloadExportOutput {
  downloadUrl: string
  expiresAt: Date
}

/** URL pré-assinada de download de export temporário (padrão 24h). */
export function gerarUrlDownloadExportTemporario(
  tenantId: string,
  exportId: string,
  options?: {
    expiresInMinutes?: number
    formato?: ExportArquivoFormato
  }
): GerarUrlDownloadExportOutput {
  const expiresInMinutes = options?.expiresInMinutes ?? EXPORT_URL_EXPIRES_MINUTES
  const formato = options?.formato ?? 'pdf'
  const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000)
  const expiresAtUnix = Math.floor(expiresAt.getTime() / 1000)
  const payload = `export:${tenantId}:${exportId}:${expiresAtUnix}`
  const signature = signExportPayload(payload)
  const baseUrl = getPublicBaseUrl()

  const fmtParam =
    formato === 'csv' ? '&fmt=csv' : formato === 'json' ? '&fmt=json' : ''
  const downloadUrl = `${baseUrl}/api/storage/export-download/${exportId}?tenant=${tenantId}&exp=${expiresAtUnix}&sig=${signature}${fmtParam}`

  return { downloadUrl, expiresAt }
}

/** Valida assinatura e expiração de URL de export (rotas de API). */
export function validarUrlAssinadaExport(params: {
  tenantId: string
  exportId: string
  expiresAtUnix: number
  signature: string
}): boolean {
  if (params.expiresAtUnix * 1000 < Date.now()) {
    return false
  }

  const payload = `export:${params.tenantId}:${params.exportId}:${params.expiresAtUnix}`
  const expected = signExportPayload(payload)

  try {
    const a = Buffer.from(params.signature)
    const b = Buffer.from(expected)
    if (a.length !== b.length) {
      return false
    }
    return timingSafeEqual(a, b)
  } catch {
    return false
  }
}

/** Caminho absoluto do arquivo de export (somente storage local). */
export function resolveLocalExportPath(
  tenantId: string,
  exportId: string,
  formato: ExportArquivoFormato = 'pdf'
): string {
  return resolveAbsolutePath(buildExportStoragePath(tenantId, exportId, formato))
}
