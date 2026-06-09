'use client'

import type { ActionResponse } from '@saude/validators'
import { useCallback, useState } from 'react'

import { formatExportErrorMessage } from './relatorio-helpers'

// BLOCO-13-RELATORIOS
async function runExport<T extends { downloadUrl: string }>(
  action: () => Promise<ActionResponse<T>>,
  onError: (message: string) => void,
  openDownload: (url: string) => void
): Promise<void> {
  const result = await action()
  if (!result.success) {
    onError(formatExportErrorMessage(result.error))
    return
  }
  openDownload(result.data.downloadUrl)
}

export function useRelatorioExport() {
  const [loadingKey, setLoadingKey] = useState<string | null>(null)
  const [erros, setErros] = useState<Record<string, string | null>>({})

  const abrirDownload = useCallback((url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer')
  }, [])

  const setErro = useCallback((key: string, message: string | null) => {
    setErros((current) => ({ ...current, [key]: message }))
  }, [])

  const runWithLoading = useCallback(
    async (key: string, task: () => Promise<void>) => {
      setErro(key, null)
      setLoadingKey(key)
      try {
        await task()
      } finally {
        setLoadingKey(null)
      }
    },
    [setErro]
  )

  const exportar = useCallback(
    async <T extends { downloadUrl: string }>(
      key: string,
      action: () => Promise<ActionResponse<T>>
    ) => {
      await runWithLoading(key, () =>
        runExport(action, (message) => setErro(key, message), abrirDownload)
      )
    },
    [abrirDownload, runWithLoading, setErro]
  )

  return { loadingKey, erros, setErro, runWithLoading, exportar }
}

export function compactDateInputClassName(): string {
  return 'min-h-[36px] w-[9.5rem] px-[var(--space-2)] py-[var(--space-1)] text-[length:var(--text-xs)]'
}

export function compactSelectClassName(): string {
  return 'min-w-[9rem] [&_button]:min-h-[36px] [&_button]:text-[length:var(--text-xs)]'
}
