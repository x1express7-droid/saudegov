import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

// BLOCO-13-RELATORIOS
export function RelatorioVoltarLink() {
  return (
    <Link
      href="/saude/tfd/relatorios"
      className="inline-flex items-center gap-[var(--space-2)] text-[length:var(--text-sm)] font-medium text-[var(--color-primary)] underline-offset-2 hover:underline"
    >
      <ArrowLeft className="size-4" aria-hidden="true" />
      Voltar para Relatórios
    </Link>
  )
}
