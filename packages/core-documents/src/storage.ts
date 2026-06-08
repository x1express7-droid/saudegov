import 'server-only'

import { createHmac, randomUUID, timingSafeEqual } from 'crypto'
import { access, mkdir } from 'fs/promises'
import path from 'path'

import type { PrismaClient } from '@prisma/client'

import { createAuditLog } from './audit'
import type { PrismaTransactionClient } from './protocol'

/** Cliente Prisma tenant-aware (transação ou instância). */
export type StorageDbClient = PrismaTransactionClient | PrismaClient

export type { StorageMimeType, StorageProvider } from './storage.types'
import type { StorageMimeType, StorageProvider } from './storage.types'

const ALLOWED_MIME_TYPES: readonly StorageMimeType[] = [
  'application/pdf',
  'image/jpeg',
  'image/png',
]

const MIME_TO_EXTENSION: Record<StorageMimeType, string> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
}

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024
const DEFAULT_UPLOAD_EXPIRES_MINUTES = 15
const DEFAULT_DOWNLOAD_EXPIRES_MINUTES = 60
const PENDING_PROCESSO_SEGMENT = 'pending'

export class StorageValidationError extends Error {
  readonly code = 'STORAGE_VALIDATION' as const

  constructor(message: string) {
    super(message)
    this.name = 'StorageValidationError'
  }
}

export class StorageConfigError extends Error {
  readonly code = 'STORAGE_CONFIG' as const

  constructor(message: string) {
    super(message)
    this.name = 'StorageConfigError'
  }
}

export class StorageNotFoundError extends Error {
  readonly code = 'STORAGE_NOT_FOUND' as const

  constructor(message: string) {
    super(message)
    this.name = 'StorageNotFoundError'
  }
}

export interface SolicitarUrlUploadInput {
  tenantId: string
  nomeArquivo: string
  mimeType: StorageMimeType
  tamanhoBytes: number
  processoId?: string | null
  uploaderId?: string | null
  uploadExpiresInMinutes?: number
}

export interface SolicitarUrlUploadOutput {
  uploadUrl: string
  anexoId: string
  expiresAt: Date
}

export interface ConfirmarUploadInput {
  tenantId: string
  anexoId: string
  downloadExpiresInMinutes?: number
}

export interface ConfirmarUploadOutput {
  downloadUrl: string
  expiresAt: Date
}

export interface GerarUrlDownloadAnexoInput {
  tenantId: string
  anexoId: string
  downloadExpiresInMinutes?: number
}

export interface GerarUrlDownloadAnexoOutput {
  url: string
  expiresAt: Date
}

function getStorageProvider(): StorageProvider {
  const raw = process.env.STORAGE_PROVIDER?.trim().toLowerCase()
  if (raw === 'r2' || raw === 's3' || raw === 'local') {
    return raw
  }
  return 'local'
}

function getSigningSecret(): string {
  const secret = process.env.AUTH_SECRET?.trim() || process.env.NEXTAUTH_SECRET?.trim()
  if (!secret || secret.length < 32) {
    throw new StorageConfigError(
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

function isAllowedMimeType(mimeType: string): mimeType is StorageMimeType {
  return (ALLOWED_MIME_TYPES as readonly string[]).includes(mimeType)
}

function sanitizeOriginalName(nomeArquivo: string): string {
  const sanitized = nomeArquivo.replace(/[^a-zA-Z0-9._-]/g, '_').toLowerCase()
  return sanitized.slice(0, 500) || 'arquivo'
}

function extensionFromMime(mimeType: StorageMimeType): string {
  return MIME_TO_EXTENSION[mimeType]
}

function buildStoragePath(
  tenantId: string,
  processoId: string | null | undefined,
  fileId: string,
  mimeType: StorageMimeType
): string {
  const processoSegment = processoId ?? PENDING_PROCESSO_SEGMENT
  const ext = extensionFromMime(mimeType)
  return `${tenantId}/saude/tfd/${processoSegment}/${fileId}.${ext}`
}

function resolveAbsolutePath(storagePath: string): string {
  return path.join(getLocalStorageRoot(), storagePath)
}

function signPayload(payload: string): string {
  const secret = getSigningSecret()
  return createHmac('sha256', secret).update(payload).digest('base64url')
}

function buildSignedUrl(
  purpose: 'upload' | 'download',
  tenantId: string,
  anexoId: string,
  expiresInMinutes: number
): { url: string; expiresAt: Date } {
  const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000)
  const expiresAtUnix = Math.floor(expiresAt.getTime() / 1000)
  const payload = `${purpose}:${tenantId}:${anexoId}:${expiresAtUnix}`
  const signature = signPayload(payload)
  const baseUrl = getPublicBaseUrl()

  const url = `${baseUrl}/_storage/${purpose}/${anexoId}?tenant=${tenantId}&exp=${expiresAtUnix}&sig=${signature}`

  return { url, expiresAt }
}

function assertCloudCredentialsPresent(provider: StorageProvider): void {
  const bucket = process.env.STORAGE_BUCKET?.trim()
  const accessKey = process.env.STORAGE_ACCESS_KEY?.trim()
  const secretKey = process.env.STORAGE_SECRET_KEY?.trim()

  if (!bucket || !accessKey || !secretKey) {
    throw new StorageConfigError(
      `Armazenamento ${provider.toUpperCase()} não configurado. Preencha STORAGE_BUCKET, STORAGE_ACCESS_KEY e STORAGE_SECRET_KEY, ou use STORAGE_PROVIDER=local em desenvolvimento.`
    )
  }

  if (provider === 'r2' && !process.env.STORAGE_ENDPOINT?.trim()) {
    throw new StorageConfigError(
      'Armazenamento R2 requer STORAGE_ENDPOINT. Use STORAGE_PROVIDER=local em desenvolvimento.'
    )
  }
}

function assertCloudUploadNotImplemented(provider: StorageProvider): never {
  assertCloudCredentialsPresent(provider)
  throw new StorageConfigError(
    `Upload via ${provider.toUpperCase()} será habilitado na Sprint 2.x. Use STORAGE_PROVIDER=local em desenvolvimento.`
  )
}

function validateUploadInput(input: SolicitarUrlUploadInput): void {
  if (!isAllowedMimeType(input.mimeType)) {
    throw new StorageValidationError('Tipo de arquivo não permitido. Envie PDF, JPEG ou PNG.')
  }

  if (!Number.isFinite(input.tamanhoBytes) || input.tamanhoBytes <= 0) {
    throw new StorageValidationError('Tamanho do arquivo inválido.')
  }

  if (input.tamanhoBytes > MAX_FILE_SIZE_BYTES) {
    throw new StorageValidationError('O arquivo excede o tamanho máximo de 10 MB.')
  }

  if (!input.nomeArquivo.trim()) {
    throw new StorageValidationError('Nome do arquivo é obrigatório.')
  }
}

async function ensureLocalDirectory(absolutePath: string): Promise<void> {
  const directory = path.dirname(absolutePath)
  await mkdir(directory, { recursive: true })
}

async function localFileExists(absolutePath: string): Promise<boolean> {
  try {
    await access(absolutePath)
    return true
  } catch {
    return false
  }
}

/**
 * Cria registro de anexo pendente e retorna URL de upload com expiração (padrão 15 min).
 * Não abre transação — recebe o cliente Prisma do chamador.
 */
export async function solicitarUrlUpload(
  input: SolicitarUrlUploadInput,
  db: StorageDbClient
): Promise<SolicitarUrlUploadOutput> {
  validateUploadInput(input)

  const provider = getStorageProvider()
  const uploadExpiresInMinutes = input.uploadExpiresInMinutes ?? DEFAULT_UPLOAD_EXPIRES_MINUTES

  if (provider === 'r2' || provider === 's3') {
    assertCloudUploadNotImplemented(provider)
  }

  const fileId = randomUUID()
  const storagePath = buildStoragePath(input.tenantId, input.processoId, fileId, input.mimeType)

  const anexo = await db.anexo.create({
    data: {
      tenant_id: input.tenantId,
      processo_id: input.processoId ?? null,
      uploader_id: input.uploaderId ?? null,
      nome_original: sanitizeOriginalName(input.nomeArquivo),
      storage_path: storagePath,
      mime_type: input.mimeType,
      tamanho_bytes: BigInt(input.tamanhoBytes),
      confirmado: false,
    },
  })

  await createAuditLog({
    tenantId: input.tenantId,
    userId: input.uploaderId ?? null,
    acao: 'CREATE',
    entidade: 'anexo',
    entidadeId: anexo.id,
    payloadDepois: {
      mime_type: input.mimeType,
      confirmado: false,
      processo_id: input.processoId ?? null,
    },
  })

  if (provider === 'local') {
    const absolutePath = resolveAbsolutePath(storagePath)
    await ensureLocalDirectory(absolutePath)

    const { url, expiresAt } = buildSignedUrl(
      'upload',
      input.tenantId,
      anexo.id,
      uploadExpiresInMinutes
    )

    return {
      uploadUrl: url,
      anexoId: anexo.id,
      expiresAt,
    }
  }

  throw new StorageConfigError('STORAGE_PROVIDER inválido. Use local, r2 ou s3.')
}

/**
 * Confirma que o arquivo está no storage, marca anexo como confirmado e retorna URL de download
 * com expiração (padrão 60 min).
 */
export async function confirmarUpload(
  input: ConfirmarUploadInput,
  db: StorageDbClient
): Promise<ConfirmarUploadOutput> {
  const provider = getStorageProvider()
  const downloadExpiresInMinutes =
    input.downloadExpiresInMinutes ?? DEFAULT_DOWNLOAD_EXPIRES_MINUTES

  const anexo = await db.anexo.findFirst({
    where: {
      id: input.anexoId,
      tenant_id: input.tenantId,
    },
  })

  if (!anexo) {
    throw new StorageNotFoundError('Anexo não encontrado.')
  }

  if (anexo.confirmado) {
    const { url, expiresAt } = buildSignedUrl(
      'download',
      input.tenantId,
      anexo.id,
      downloadExpiresInMinutes
    )
    return { downloadUrl: url, expiresAt }
  }

  if (provider === 'local') {
    const absolutePath = resolveAbsolutePath(anexo.storage_path)
    const exists = await localFileExists(absolutePath)
    if (!exists) {
      throw new StorageNotFoundError(
        'Arquivo ainda não foi enviado ao armazenamento. Conclua o upload antes de confirmar.'
      )
    }
  } else if (provider === 'r2' || provider === 's3') {
    assertCloudCredentialsPresent(provider)
    throw new StorageConfigError(
      `Confirmação de upload via ${provider.toUpperCase()} será habilitada na Sprint 2.x.`
    )
  } else {
    throw new StorageConfigError('STORAGE_PROVIDER inválido. Use local, r2 ou s3.')
  }

  await db.anexo.update({
    where: {
      id: anexo.id,
      tenant_id: input.tenantId,
    },
    data: { confirmado: true },
  })

  await createAuditLog({
    tenantId: input.tenantId,
    userId: anexo.uploader_id,
    acao: 'UPDATE',
    entidade: 'anexo',
    entidadeId: anexo.id,
    payloadDepois: { confirmado: true },
  })

  const { url, expiresAt } = buildSignedUrl(
    'download',
    input.tenantId,
    anexo.id,
    downloadExpiresInMinutes
  )

  return { downloadUrl: url, expiresAt }
}

/**
 * Gera URL pré-assinada de download para anexo no storage.
 * Não altera o registro do anexo.
 */
export async function gerarUrlDownloadAnexo(
  input: GerarUrlDownloadAnexoInput,
  db: StorageDbClient
): Promise<GerarUrlDownloadAnexoOutput> {
  const downloadExpiresInMinutes =
    input.downloadExpiresInMinutes ?? DEFAULT_DOWNLOAD_EXPIRES_MINUTES

  const anexo = await db.anexo.findFirst({
    where: {
      id: input.anexoId,
      tenant_id: input.tenantId,
    },
    select: { id: true },
  })

  if (!anexo) {
    throw new StorageNotFoundError('Anexo não encontrado.')
  }

  const { url, expiresAt } = buildSignedUrl(
    'download',
    input.tenantId,
    anexo.id,
    downloadExpiresInMinutes
  )

  return { url, expiresAt }
}

/** Valida assinatura e expiração de URLs geradas por este módulo (uso em rotas de API). */
export function validarUrlAssinada(params: {
  purpose: 'upload' | 'download'
  tenantId: string
  anexoId: string
  expiresAtUnix: number
  signature: string
}): boolean {
  if (params.expiresAtUnix * 1000 < Date.now()) {
    return false
  }

  const payload = `${params.purpose}:${params.tenantId}:${params.anexoId}:${params.expiresAtUnix}`
  const expected = signPayload(payload)

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

/** Caminho absoluto local do anexo (somente STORAGE_PROVIDER=local). */
export function resolveLocalAnexoPath(storagePath: string): string {
  if (getStorageProvider() !== 'local') {
    throw new StorageConfigError('Caminho local disponível apenas com STORAGE_PROVIDER=local.')
  }
  return resolveAbsolutePath(storagePath)
}
