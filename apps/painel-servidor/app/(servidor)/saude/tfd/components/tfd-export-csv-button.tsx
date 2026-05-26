'use client'

import { TFD_PERMISSIONS } from '@saude/mod-saude-tfd/client'
import type { SaudeMunicSession } from '@saude/core-auth/types/session'
import type { ActionResponse } from '@saude/validators'
import { Alert, Button } from '@saude/ui'
import { PermissionGate } from '@saude/ui/permission-gate'
import { Download } from 'lucide-react'
import { useState, useTransition } from 'react'

export interface ExportarCsvResult {
  downloadUrl: string
  expiresAt: string
  totalRegistros: number
}

interface TfdExportCsvButtonProps {
  session: SaudeMunicSession
  label?: string
  disabled?: boolean
  onExport: () => Promise<ActionResponse<ExportarCsvResult>>
}

export function TfdExportCsvButton({
  session,
  label = 'Exportar CSV',
  disabled = false,
  onExport,
}: TfdExportCsvButtonProps) {
  const [isExporting, startExportTransition] = useTransition()
  const [exportError, setExportError] = useState<string | null>(null)

  function handleExportar() {
    setExportError(null)
    startExportTransition(async () => {
      const response = await onExport()
      if (!response.success) {
        setExportError(response.error)
        return
      }
      window.open(response.data.downloadUrl, '_blank', 'noopener,noreferrer')
    })
  }

  return (
    <div className="flex flex-col items-end gap-[var(--space-2)]">
      {exportError ? (
        <Alert variant="error" role="alert" className="w-full max-w-xl">
          {exportError}
        </Alert>
      ) : null}
      <PermissionGate session={session} permission={TFD_PERMISSIONS.EXPORTAR_RELATORIO}>
        <Button
          type="button"
          variant="secondary"
          disabled={disabled || isExporting}
          aria-busy={isExporting}
          onClick={handleExportar}
        >
          <Download className="size-4" aria-hidden="true" />
          {isExporting ? 'Exportando…' : label}
        </Button>
      </PermissionGate>
    </div>
  )
}
