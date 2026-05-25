'use client'

import {
  confirmarUploadAction,
  solicitarUrlUploadAction,
} from '@/lib/actions/upload-anexo'
import type { StorageMimeType } from '@saude/core-documents/storage-types'
import { Alert, FileUpload, Spinner } from '@saude/ui'
import { useCallback, useId, useState } from 'react'

/** Alinhado a `packages/core-documents/src/storage.ts` e `.cursorrules`. */
const MAX_FILE_SIZE_MB = 10
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024

const ACCEPTED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png'] as const

type LaudoUploadState =
  | 'idle'
  | 'solicitando_url'
  | 'enviando'
  | 'confirmando'
  | 'concluido'
  | 'erro'

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

const STATE_LABEL: Record<LaudoUploadState, string> = {
  idle: '',
  solicitando_url: 'Preparando envio…',
  enviando: 'Enviando arquivo…',
  confirmando: 'Confirmando laudo…',
  concluido: 'Laudo confirmado e pronto para envio da solicitação.',
  erro: '',
}

export interface SolicitacaoLaudoUploadProps {
  processoId?: string | null
  disabled?: boolean
  onUploadComplete: (anexoId: string) => void
  onUploadClear?: () => void
}

export function SolicitacaoLaudoUpload({
  processoId = null,
  disabled = false,
  onUploadComplete,
  onUploadClear,
}: SolicitacaoLaudoUploadProps) {
  const statusId = useId()
  const [state, setState] = useState<LaudoUploadState>('idle')
  const [progress, setProgress] = useState(0)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [anexoId, setAnexoId] = useState<string | null>(null)

  const handleFileSelected = useCallback(
    async (file: File) => {
      setErrorMessage(null)
      setProgress(0)
      setAnexoId(null)
      onUploadClear?.()

      const mimeType = resolveStorageMimeType(file)
      if (!mimeType) {
        setState('erro')
        setErrorMessage('Tipo de arquivo não permitido. Envie PDF, JPEG ou PNG.')
        return
      }

      if (file.size > MAX_FILE_SIZE_BYTES) {
        setState('erro')
        setErrorMessage(`O arquivo excede o tamanho máximo de ${MAX_FILE_SIZE_MB} MB.`)
        return
      }

      try {
        setState('solicitando_url')
        const urlResponse = await solicitarUrlUploadAction({
          processoId,
          mimeType,
          tamanhoBytes: file.size,
          nomeArquivo: file.name,
        })

        if (!urlResponse.success) {
          setState('erro')
          setErrorMessage(urlResponse.error)
          return
        }

        const { uploadUrl, anexoId: novoAnexoId } = urlResponse.data

        setState('enviando')
        await uploadWithProgress(file, uploadUrl, setProgress)

        setState('confirmando')
        const confirmResponse = await confirmarUploadAction({ anexoId: novoAnexoId })

        if (!confirmResponse.success) {
          setState('erro')
          setErrorMessage(confirmResponse.error)
          return
        }

        setAnexoId(novoAnexoId)
        setState('concluido')
        onUploadComplete(novoAnexoId)
      } catch {
        setState('erro')
        setErrorMessage('Não foi possível enviar o laudo. Tente novamente.')
      }
    },
    [onUploadClear, onUploadComplete, processoId]
  )

  const isBusy = state === 'solicitando_url' || state === 'enviando' || state === 'confirmando'
  const uploadDisabled = disabled || isBusy || state === 'concluido'

  return (
    <div className="flex flex-col gap-4">
      <FileUpload
        label="Laudo médico"
        accept={[...ACCEPTED_MIME_TYPES]}
        maxSizeMB={MAX_FILE_SIZE_MB}
        onUpload={(file) => void handleFileSelected(file)}
        disabled={uploadDisabled}
      />

      {state !== 'idle' && state !== 'erro' ? (
        <div
          id={statusId}
          className="flex flex-col gap-[var(--space-2)] rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-bg)] px-[var(--space-3)] py-[var(--space-2)]"
          aria-live="polite"
        >
          <div className="flex items-center gap-[var(--space-2)]">
            {isBusy ? (
              <Spinner className="size-4 text-[var(--color-primary)]" aria-hidden="true" />
            ) : null}
            <p className="text-[length:var(--text-sm)] text-[var(--color-text)]">
              {STATE_LABEL[state]}
            </p>
          </div>

          {state === 'enviando' ? (
            <div className="flex flex-col gap-[var(--space-1)]">
              <div
                className="h-2 w-full overflow-hidden rounded-full bg-[var(--color-border)]"
                role="progressbar"
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Progresso do envio do laudo"
              >
                <div
                  className="h-full bg-[var(--color-primary)] transition-[width]"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
                {progress}%
              </p>
            </div>
          ) : null}

          {state === 'concluido' && anexoId ? (
            <p className="text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
              Identificador do anexo registrado. O laudo será vinculado à solicitação ao salvar.
            </p>
          ) : null}
        </div>
      ) : null}

      {state === 'erro' && errorMessage ? (
        <Alert variant="error" role="alert">
          {errorMessage}
        </Alert>
      ) : null}

      {state === 'concluido' ? (
        <Alert variant="success">Laudo enviado e confirmado com sucesso.</Alert>
      ) : null}
    </div>
  )
}
