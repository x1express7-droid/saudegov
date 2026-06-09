'use client'

import { Button, Card } from '@saude/ui'

// BLOCO-13-RELATORIOS
interface RelatorioPainelErroProps {
  reset: () => void
}

export function RelatorioPainelErro({ reset }: RelatorioPainelErroProps) {
  return (
    <Card className="mx-auto max-w-lg text-center">
      <p className="text-[length:var(--text-sm)] text-[var(--color-text)]">
        Não foi possível carregar os dados. Tente novamente.
      </p>
      <Button type="button" variant="primary" className="mt-[var(--space-4)]" onClick={reset}>
        Tentar novamente
      </Button>
    </Card>
  )
}
