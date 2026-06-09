import { Card } from '@saude/ui'
import { Info } from 'lucide-react'

// BLOCO-14-PRESTACOES
export function PrestacaoInstrucaoCard() {
  return (
    <Card bodyClassName="p-[var(--space-3)]">
      <div className="flex items-start gap-[var(--space-3)]">
        <Info className="mt-0.5 size-5 shrink-0 text-[var(--color-info)]" aria-hidden="true" />
        <p className="text-[length:var(--text-sm)] text-[var(--color-text)]">
          Prestações pendentes precisam ter despesas lançadas e ser enviadas para análise em até 10
          dias após a chegada da viagem.
        </p>
      </div>
    </Card>
  )
}
