'use client'

import { Button } from '@saude/ui'

// BLOCO-10-VIAGENS
export interface ViagemListaPaginacaoProps {
  page: number
  perPage: number
  total: number
  onPaginationChange: (page: number) => void
}

export function ViagemListaPaginacao({
  page,
  perPage,
  total,
  onPaginationChange,
}: ViagemListaPaginacaoProps) {
  if (total <= perPage) {
    return null
  }

  const totalPages = Math.max(1, Math.ceil(total / perPage))

  return (
    <div className="flex flex-col gap-[var(--space-3)] sm:flex-row sm:items-center sm:justify-between">
      <p className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
        Exibindo {(page - 1) * perPage + 1}–{Math.min(page * perPage, total)} de {total} registros
      </p>
      <div className="flex items-center gap-[var(--space-2)]">
        <Button
          type="button"
          variant="outline"
          disabled={page <= 1}
          onClick={() => onPaginationChange(page - 1)}
        >
          Anterior
        </Button>
        <span className="min-w-[120px] text-center text-[length:var(--text-sm)] text-[var(--color-text)]">
          Página {page} de {totalPages}
        </span>
        <Button
          type="button"
          variant="outline"
          disabled={page >= totalPages}
          onClick={() => onPaginationChange(page + 1)}
        >
          Próxima
        </Button>
      </div>
    </div>
  )
}
