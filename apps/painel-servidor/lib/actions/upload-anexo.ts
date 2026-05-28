'use server'

import { assertModuleActive, requirePermission, requireTenantRole } from '@saude/core-auth/server'
import { getPrismaForTenant } from '@saude/core-db'
import {
  confirmarUpload,
  solicitarUrlUpload,
  StorageConfigError,
  StorageNotFoundError,
  StorageValidationError,
  type ConfirmarUploadOutput,
  type SolicitarUrlUploadOutput,
} from '@saude/core-documents/storage'
import type { StorageMimeType } from '@saude/core-documents/storage-types'
import { TFD_PERMISSIONS } from '@saude/mod-saude-tfd/permissions'
import type { ActionResponse } from '@saude/validators'
import { z } from 'zod'

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024

const storageMimeTypeSchema = z.enum(
  ['application/pdf', 'image/jpeg', 'image/png'],
  { errorMap: () => ({ message: 'Tipo de arquivo não permitido. Envie PDF, JPEG ou PNG.' }) }
)

const nomeArquivoPorMime: Record<z.infer<typeof storageMimeTypeSchema>, string> = {
  'application/pdf': 'documento.pdf',
  'image/jpeg': 'imagem.jpg',
  'image/png': 'imagem.png',
}

const solicitarUrlUploadActionSchema = z.object({
  processoId: z.string().uuid('ID do processo inválido.').optional().nullable(),
  mimeType: storageMimeTypeSchema,
  tamanhoBytes: z
    .number({
      required_error: 'Informe o tamanho do arquivo.',
      invalid_type_error: 'Tamanho do arquivo inválido.',
    })
    .int('Tamanho do arquivo deve ser um número inteiro.')
    .positive('Tamanho do arquivo inválido.')
    .max(MAX_FILE_SIZE_BYTES, 'O arquivo excede o tamanho máximo de 10 MB.'),
  nomeArquivo: z
    .string()
    .trim()
    .min(1, 'Nome do arquivo inválido.')
    .max(500, 'Nome do arquivo muito longo.')
    .optional(),
})

const confirmarUploadActionSchema = z.object({
  anexoId: z.string().uuid('ID do anexo inválido.'),
})

function resolveNomeArquivo(
  mimeType: z.infer<typeof storageMimeTypeSchema>,
  nomeArquivo?: string
): string {
  if (nomeArquivo && nomeArquivo.length > 0) {
    return nomeArquivo
  }
  return nomeArquivoPorMime[mimeType]
}

function mapStorageErrorToMessage(error: unknown): string {
  if (error instanceof StorageValidationError) {
    return error.message
  }

  if (error instanceof StorageNotFoundError) {
    return error.message
  }

  if (error instanceof StorageConfigError) {
    return error.message
  }

  if (error instanceof Error && error.message.includes('AUTH_SECRET')) {
    return error.message
  }

  return 'Não foi possível concluir a operação. Tente novamente.'
}

export async function solicitarUrlUploadAction(
  rawInput: unknown
): Promise<ActionResponse<SolicitarUrlUploadOutput>> {
  await assertModuleActive('saude', 'tfd')

  const session = await requireTenantRole('SERVIDOR')

  await requirePermission(session, TFD_PERMISSIONS.ABRIR_SOLICITACAO)

  const parsed = solicitarUrlUploadActionSchema.safeParse(rawInput)
  if (!parsed.success) {
    return {
      success: false,
      error: 'Dados inválidos.',
      fieldErrors: parsed.error.flatten().fieldErrors,
    }
  }

  const data = parsed.data
  const tenantId = session.user.tenantId!

  try {
    const db = await getPrismaForTenant(tenantId)

    const resultado = await solicitarUrlUpload(
      {
        tenantId,
        nomeArquivo: resolveNomeArquivo(data.mimeType, data.nomeArquivo),
        mimeType: data.mimeType as StorageMimeType,
        tamanhoBytes: data.tamanhoBytes,
        processoId: data.processoId ?? null,
        uploaderId: session.user.id,
      },
      db
    )

    return { success: true, data: resultado }
  } catch (error) {
    console.error('[solicitarUrlUploadAction] Erro:', {
      tenantId,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      name: error instanceof Error ? error.name : undefined,
    })
    return {
      success: false,
      error: mapStorageErrorToMessage(error),
    }
  }
}

export async function confirmarUploadAction(
  rawInput: unknown
): Promise<ActionResponse<ConfirmarUploadOutput>> {
  await assertModuleActive('saude', 'tfd')

  const session = await requireTenantRole('SERVIDOR')

  await requirePermission(session, TFD_PERMISSIONS.ABRIR_SOLICITACAO)

  const parsed = confirmarUploadActionSchema.safeParse(rawInput)
  if (!parsed.success) {
    return {
      success: false,
      error: 'Dados inválidos.',
      fieldErrors: parsed.error.flatten().fieldErrors,
    }
  }

  const data = parsed.data
  const tenantId = session.user.tenantId!

  try {
    const db = await getPrismaForTenant(tenantId)

    const resultado = await confirmarUpload(
      {
        tenantId,
        anexoId: data.anexoId,
      },
      db
    )

    return { success: true, data: resultado }
  } catch (error) {
    console.error('[confirmarUploadAction] Erro:', {
      tenantId,
      error: error instanceof Error ? error.name : 'Erro desconhecido',
    })
    return {
      success: false,
      error: mapStorageErrorToMessage(error),
    }
  }
}
