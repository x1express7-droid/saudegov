'use client'

import { RelatorioPainelErro } from './components/relatorio-painel-erro'

// BLOCO-13-RELATORIOS
interface RelatoriosErrorProps {
  reset: () => void
}

export default function RelatoriosError({ reset }: RelatoriosErrorProps) {
  return (
    <div className="py-[var(--space-8)]">
      <RelatorioPainelErro reset={reset} />
    </div>
  )
}
