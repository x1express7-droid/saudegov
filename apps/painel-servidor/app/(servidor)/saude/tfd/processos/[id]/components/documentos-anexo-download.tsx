'use client'

import { Button } from '@saude/ui'
import { Download } from 'lucide-react'
import { useState, useTransition } from 'react'

export interface DocumentosAnexoDownloadProps {
  anexoId: string
  nomeOriginal: string
}

export function DocumentosAnexoDownload({ anexoId, nomeOriginal }: DocumentosAnexoDownloadProps) {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleDownload() {
    setError(null)
    startTransition(async () => {
      try {
        const response = await fetch(`/api/storage/download/${anexoId}`, {
          method: 'GET',
          credentials: 'include',
        })

        const body = (await response.json()) as { url?: string; error?: string }

        if (!response.ok || !body.url) {
          setError(body.error ?? 'Não foi possível baixar o arquivo.')
          return
        }

        window.open(body.url, '_blank', 'noopener,noreferrer')
      } catch {
        setError(`Não foi possível baixar ${nomeOriginal}.`)
      }
    })
  }

  return (
    <div className="flex flex-col items-end gap-[var(--space-1)]">
      <Button
        type="button"
        variant="secondary"
        onClick={handleDownload}
        disabled={isPending}
      >
        <Download className="size-4" aria-hidden />
        Download
      </Button>
      {error ? (
        <p className="max-w-[12rem] text-right text-[length:var(--text-xs)] text-[var(--color-error)]">
          {error}
        </p>
      ) : null}
    </div>
  )
}
