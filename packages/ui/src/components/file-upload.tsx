'use client'

import { FileText, Upload, X } from 'lucide-react'
import { useCallback, useId, useRef, useState, type KeyboardEvent } from 'react'
import { cn } from '../utils/cn'
import {
  fieldErrorClassName,
  fieldHintClassName,
  fieldLabelClassName,
  focusRingClassName,
} from '../utils/field-control'

type FileUploadState = 'idle' | 'dragging' | 'selected' | 'error'

export interface FileUploadProps {
  onUpload: (file: File) => void
  accept: string[]
  maxSizeMB: number
  label: string
  disabled?: boolean
  className?: string
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

function formatAcceptList(accept: string[]): string {
  return accept
    .map((mime) => {
      if (mime === 'application/pdf') return 'PDF'
      if (mime === 'image/jpeg') return 'JPEG'
      if (mime === 'image/png') return 'PNG'
      if (mime.endsWith('/*')) return mime.replace('/*', '').toUpperCase()
      return mime
    })
    .join(', ')
}

function isAcceptedType(file: File, accept: string[]): boolean {
  return accept.some((allowed) => {
    if (allowed.endsWith('/*')) {
      const prefix = allowed.slice(0, -1)
      return file.type.startsWith(prefix)
    }
    return file.type === allowed
  })
}

export function FileUpload({
  onUpload,
  accept,
  maxSizeMB,
  label,
  disabled = false,
  className,
}: FileUploadProps) {
  const inputId = useId()
  const errorId = `${inputId}-error`
  const hintId = `${inputId}-hint`
  const inputRef = useRef<HTMLInputElement>(null)

  const [visualState, setVisualState] = useState<FileUploadState>('idle')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const maxBytes = maxSizeMB * 1024 * 1024

  const validateAndSelect = useCallback(
    (file: File) => {
      if (!isAcceptedType(file, accept)) {
        setSelectedFile(null)
        setVisualState('error')
        setErrorMessage(
          `Tipo de arquivo não permitido. Envie apenas: ${formatAcceptList(accept)}.`
        )
        return
      }

      if (file.size > maxBytes) {
        setSelectedFile(null)
        setVisualState('error')
        setErrorMessage(`O arquivo excede o tamanho máximo de ${maxSizeMB} MB.`)
        return
      }

      setSelectedFile(file)
      setErrorMessage(null)
      setVisualState('selected')
      onUpload(file)
    },
    [accept, maxBytes, maxSizeMB, onUpload]
  )

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (disabled || !files || files.length === 0) return
      validateAndSelect(files[0]!)
    },
    [disabled, validateAndSelect]
  )

  const openFilePicker = () => {
    if (disabled) return
    inputRef.current?.click()
  }

  const clearSelection = () => {
    setSelectedFile(null)
    setErrorMessage(null)
    setVisualState('idle')
    if (inputRef.current) {
      inputRef.current.value = ''
    }
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      openFilePicker()
    }
  }

  const isDragging = visualState === 'dragging'
  const hasError = visualState === 'error'
  const hasFile = visualState === 'selected' && selectedFile != null

  return (
    <div className={cn('flex w-full flex-col gap-3', className)}>
      <div>
        <label htmlFor={inputId} className={fieldLabelClassName()}>
          {label}
        </label>
        <p id={hintId} className={fieldHintClassName()}>
          Tipos aceitos: {formatAcceptList(accept)}. Tamanho máximo: {maxSizeMB} MB.
        </p>
      </div>

      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={accept.join(',')}
        disabled={disabled}
        className="hidden"
        aria-describedby={[hintId, errorMessage ? errorId : null].filter(Boolean).join(' ')}
        onChange={(event) => handleFiles(event.target.files)}
      />

      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label={
          hasFile
            ? `Arquivo selecionado: ${selectedFile.name}. Clique para substituir.`
            : `Enviar arquivo: ${label}`
        }
        aria-disabled={disabled || undefined}
        aria-invalid={hasError || undefined}
        onKeyDown={handleKeyDown}
        onClick={() => {
          if (hasFile) {
            openFilePicker()
            return
          }
          openFilePicker()
        }}
        onDragEnter={(event) => {
          event.preventDefault()
          if (disabled) return
          setVisualState((current) => (current === 'error' ? 'error' : 'dragging'))
        }}
        onDragOver={(event) => {
          event.preventDefault()
          if (disabled) return
          setVisualState((current) => (current === 'error' ? 'error' : 'dragging'))
        }}
        onDragLeave={(event) => {
          event.preventDefault()
          if (disabled) return
          setVisualState((current) => {
            if (current === 'dragging') return selectedFile ? 'selected' : 'idle'
            return current
          })
        }}
        onDrop={(event) => {
          event.preventDefault()
          if (disabled) return
          handleFiles(event.dataTransfer.files)
        }}
        className={cn(
          'relative flex min-h-[120px] w-full cursor-pointer flex-col items-center justify-center gap-[var(--space-2)] rounded-[var(--radius)] border-2 border-dashed px-[var(--space-4)] py-[var(--space-6)] text-center transition-colors',
          focusRingClassName,
          disabled && 'cursor-not-allowed opacity-60',
          !disabled && visualState === 'idle' && 'border-[var(--color-border)] bg-[var(--color-surface)]',
          !disabled &&
            isDragging &&
            'border-[var(--color-primary)] bg-[var(--color-primary-light)]',
          !disabled &&
            hasFile &&
            'border-[var(--color-success)] bg-[var(--color-success-light)]',
          !disabled && hasError && 'border-[var(--color-error)] bg-[var(--color-error-light)]'
        )}
      >
        {hasFile && selectedFile ? (
          <>
            <FileText className="size-8 text-[var(--color-success)]" aria-hidden="true" />
            <div className="min-w-0">
              <p className="truncate text-[length:var(--text-sm)] font-medium text-[var(--color-text)]">
                {selectedFile.name}
              </p>
              <p className="text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
                {formatFileSize(selectedFile.size)}
              </p>
            </div>
            <button
              type="button"
              aria-label="Remover arquivo selecionado"
              disabled={disabled}
              className={cn(
                'absolute right-[var(--space-2)] top-[var(--space-2)] inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-[var(--radius-sm)] text-[var(--color-text-muted)] transition-colors',
                'hover:bg-[var(--color-surface)] hover:text-[var(--color-text)]',
                focusRingClassName
              )}
              onClick={(event) => {
                event.stopPropagation()
                clearSelection()
              }}
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </>
        ) : (
          <>
            <Upload
              className={cn(
                'size-8',
                hasError ? 'text-[var(--color-error)]' : 'text-[var(--color-text-muted)]'
              )}
              aria-hidden="true"
            />
            <p className="text-[length:var(--text-sm)] font-medium text-[var(--color-text)]">
              {isDragging ? 'Solte o arquivo aqui' : 'Arraste um arquivo ou clique para selecionar'}
            </p>
            <p className="text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
              {formatAcceptList(accept)} — máximo {maxSizeMB} MB
            </p>
          </>
        )}
      </div>

      {errorMessage ? (
        <p id={errorId} role="alert" className={fieldErrorClassName()}>
          {errorMessage}
        </p>
      ) : null}
    </div>
  )
}
