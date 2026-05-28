'use client'

import {
  confirmarUploadAction,
  solicitarUrlUploadAction,
} from '@/lib/actions/upload-anexo'
import type { StorageMimeType } from '@saude/core-documents/storage-types'
import { Alert, FileUpload, Spinner } from '@saude/ui'
import { FileText, X } from 'lucide-react'
import { useCallback, useId, useState } from 'react'

/** Alinhado a `packages/core-documents/src/storage.ts` e `.cursorrules`. */
const MAX_FILE_SIZE_MB = 10
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024

const ACCEPTED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png'] as const

type LaudoItemState = 'idle' | 'enviando' | 'concluido' | 'erro'

interface LaudoUploadItem {
  localId: string
  fileName: string
  state: LaudoItemState
  progress: number
  anexoId?: string
  errorMessage?: string
}

function resolveStorageMimeType(file: File): StorageMimeType | null {
  if (ACCEPTED_MIME_TYPES.includes(file.type as (typeof ACCEPTED_MIME_TYPES)[number])) {
    return file.type as StorageMimeType
  }
  return null
}

function uploadWithProgress(
  file: File,
  uploadUrl: string,
  onProgress: (percent: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()

    xhr.upload.addEventListener('progress', (event) => {
      if (!event.lengthComputable) {
        return
      }
      const percent = Math.round((event.loaded / event.total) * 100)
      onProgress(percent)
    })

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve()
        return
      }
      reject(new Error('Falha ao enviar o arquivo.'))
    })

    xhr.addEventListener('error', () => {
      reject(new Error('Falha de rede ao enviar o arquivo.'))
    })

    xhr.open('PUT', uploadUrl)
    xhr.setRequestHeader('Content-Type', file.type)
    xhr.send(file)
  })
}

function createLocalId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `laudo-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function getCompletedAnexoIds(items: LaudoUploadItem[]): string[] {
  return items
    .filter((item) => item.state === 'concluido' && item.anexoId)
    .map((item) => item.anexoId!)
}

const ITEM_STATE_LABEL: Record<LaudoItemState, string> = {
  idle: '',
  enviando: 'Enviando…',
  concluido: 'Confirmado',
  erro: 'Falha no envio',
}

export interface SolicitacaoLaudoUploadProps {
  processoId?: string | null
  disabled?: boolean
  onUploadComplete: (anexoIds: string[]) => void
}

export function SolicitacaoLaudoUpload({
  processoId = null,
  disabled = false,
  onUploadComplete,
}: SolicitacaoLaudoUploadProps) {
  const listId = useId()
  const [items, setItems] = useState<LaudoUploadItem[]>([])
  const [pickerResetKey, setPickerResetKey] = useState(0)

  const notifyCompleted = useCallback(
    (nextItems: LaudoUploadItem[]) => {
      onUploadComplete(getCompletedAnexoIds(nextItems))
    },
    [onUploadComplete]
  )

  const updateItem = useCallback(
    (localId: string, patch: Partial<LaudoUploadItem>) => {
      setItems((current) => {
        const next = current.map((item) =>
          item.localId === localId ? { ...item, ...patch } : item
        )
        notifyCompleted(next)
        return next
      })
    },
    [notifyCompleted]
  )

  const uploadItem = useCallback(
    async (localId: string, file: File) => {
      const mimeType = resolveStorageMimeType(file)
      if (!mimeType) {
        updateItem(localId, {
          state: 'erro',
          errorMessage: 'Tipo de arquivo não permitido. Envie PDF, JPEG ou PNG.',
        })
        return
      }

      if (file.size > MAX_FILE_SIZE_BYTES) {
        updateItem(localId, {
          state: 'erro',
          errorMessage: `O arquivo excede o tamanho máximo de ${MAX_FILE_SIZE_MB} MB.`,
        })
        return
      }

      try {
        updateItem(localId, { state: 'enviando', progress: 0, errorMessage: undefined })

        const urlResponse = await solicitarUrlUploadAction({
          processoId,
          mimeType,
          tamanhoBytes: file.size,
          nomeArquivo: file.name,
        })

        if (!urlResponse.success) {
          updateItem(localId, { state: 'erro', errorMessage: urlResponse.error })
          return
        }

        const { uploadUrl, anexoId: novoAnexoId } = urlResponse.data

        await uploadWithProgress(file, uploadUrl, (percent) => {
          updateItem(localId, { progress: percent })
        })

        const confirmResponse = await confirmarUploadAction({ anexoId: novoAnexoId })

        if (!confirmResponse.success) {
          updateItem(localId, { state: 'erro', errorMessage: confirmResponse.error })
          return
        }

        updateItem(localId, {
          state: 'concluido',
          progress: 100,
          anexoId: novoAnexoId,
        })
      } catch {
        updateItem(localId, {
          state: 'erro',
          errorMessage: 'Não foi possível enviar o laudo. Tente novamente.',
        })
      }
    },
    [processoId, updateItem]
  )

  const handleFileSelected = useCallback(
    (file: File) => {
      setPickerResetKey((key) => key + 1)

      const localId = createLocalId()
      const newItem: LaudoUploadItem = {
        localId,
        fileName: file.name,
        state: 'enviando',
        progress: 0,
      }

      setItems((current) => [...current, newItem])
      void uploadItem(localId, file)
    },
    [uploadItem]
  )

  const handleRemoveItem = useCallback(
    (localId: string) => {
      setItems((current) => {
        const item = current.find((entry) => entry.localId === localId)
        if (!item || item.state === 'enviando') {
          return current
        }
        const next = current.filter((entry) => entry.localId !== localId)
        notifyCompleted(next)
        return next
      })
    },
    [notifyCompleted]
  )

  const hasUploadInProgress = items.some((item) => item.state === 'enviando')
  const uploadDisabled = disabled || hasUploadInProgress

  return (
    <div className="flex flex-col gap-4">
      <FileUpload
        key={pickerResetKey}
        label="Laudo médico"
        accept={[...ACCEPTED_MIME_TYPES]}
        maxSizeMB={MAX_FILE_SIZE_MB}
        onUpload={(file) => void handleFileSelected(file)}
        disabled={uploadDisabled}
      />

      {items.length > 0 ? (
        <ul
          id={listId}
          className="flex flex-col gap-[var(--space-2)]"
          aria-label="Laudos médicos anexados"
        >
          {items.map((item) => {
            const canRemove = !disabled && item.state !== 'enviando'

            return (
              <li
                key={item.localId}
                className="flex flex-col gap-[var(--space-2)] rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-bg)] px-[var(--space-3)] py-[var(--space-2)]"
              >
                <div className="flex items-start gap-[var(--space-2)]">
                  <FileText
                    className="mt-0.5 size-4 shrink-0 text-[var(--color-text-muted)]"
                    aria-hidden="true"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[length:var(--text-sm)] font-medium text-[var(--color-text)]">
                      {item.fileName}
                    </p>
                    <p className="text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
                      {ITEM_STATE_LABEL[item.state]}
                    </p>
                  </div>

                  {item.state === 'enviando' ? (
                    <Spinner className="size-4 shrink-0 text-[var(--color-primary)]" aria-hidden="true" />
                  ) : null}

                  {canRemove ? (
                    <button
                      type="button"
                      aria-label={`Remover ${item.fileName}`}
                      className="inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-[var(--radius-sm)] text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface)] hover:text-[var(--color-text)]"
                      onClick={() => handleRemoveItem(item.localId)}
                    >
                      <X className="size-4" aria-hidden="true" />
                    </button>
                  ) : null}
                </div>

                {item.state === 'enviando' ? (
                  <div className="flex flex-col gap-[var(--space-1)]">
                    <div
                      className="h-2 w-full overflow-hidden rounded-full bg-[var(--color-border)]"
                      role="progressbar"
                      aria-valuenow={item.progress}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`Progresso do envio de ${item.fileName}`}
                    >
                      <div
                        className="h-full bg-[var(--color-primary)] transition-[width]"
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                    <p className="text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
                      {item.progress}%
                    </p>
                  </div>
                ) : null}

                {item.state === 'erro' && item.errorMessage ? (
                  <Alert variant="error" role="alert">
                    {item.errorMessage}
                  </Alert>
                ) : null}

                {item.state === 'concluido' ? (
                  <p className="text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
                    Laudo confirmado. Será vinculado à solicitação ao salvar ou enviar.
                  </p>
                ) : null}
              </li>
            )
          })}
        </ul>
      ) : null}

      {getCompletedAnexoIds(items).length > 0 ? (
        <Alert variant="success">
          {getCompletedAnexoIds(items).length === 1
            ? '1 laudo enviado e confirmado com sucesso.'
            : `${getCompletedAnexoIds(items).length} laudos enviados e confirmados com sucesso.`}
        </Alert>
      ) : null}
    </div>
  )
}
