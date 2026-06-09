'use client'

import { Button, Spinner } from '@saude/ui'
import { Download, FileDown } from 'lucide-react'

// BLOCO-12-RELATORIOS
interface RelatorioExportCsvButtonProps {
  loading: boolean
  disabled?: boolean
  onClick: () => void
}

export function RelatorioExportCsvButton({
  loading,
  disabled = false,
  onClick,
}: RelatorioExportCsvButtonProps) {
  return (
    <Button
      type="button"
      variant="outline"
      disabled={disabled || loading}
      aria-busy={loading}
      className="min-h-[36px] whitespace-nowrap px-[var(--space-3)] text-[length:var(--text-xs)]"
      onClick={onClick}
    >
      {loading ? (
        <Spinner className="size-4 text-[var(--color-primary)]" />
      ) : (
        <Download className="size-4" aria-hidden="true" />
      )}
      {loading ? 'Gerando...' : 'Exportar CSV'}
    </Button>
  )
}

interface RelatorioExportPdfButtonProps {
  loading: boolean
  disabled?: boolean
  onClick: () => void
}

export function RelatorioExportPdfButton({
  loading,
  disabled = false,
  onClick,
}: RelatorioExportPdfButtonProps) {
  return (
    <Button
      type="button"
      variant="primary"
      disabled={disabled || loading}
      aria-busy={loading}
      className="min-h-[36px] whitespace-nowrap px-[var(--space-3)] text-[length:var(--text-xs)]"
      onClick={onClick}
    >
      {loading ? (
        <Spinner className="size-4 text-[var(--color-primary-foreground)]" />
      ) : (
        <FileDown className="size-4" aria-hidden="true" />
      )}
      {loading ? 'Gerando...' : 'Gerar PDF'}
    </Button>
  )
}
