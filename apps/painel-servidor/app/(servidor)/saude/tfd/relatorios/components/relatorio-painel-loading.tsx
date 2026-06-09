import { Spinner } from '@saude/ui'

// BLOCO-13-RELATORIOS
export function RelatorioPainelLoading() {
  return (
    <div
      className="flex min-h-[16rem] items-center justify-center py-[var(--space-12)]"
      role="status"
      aria-live="polite"
      aria-label="Carregando dados"
    >
      <Spinner className="size-8 text-[var(--color-primary)]" />
    </div>
  )
}
