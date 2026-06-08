import { Card } from '@saude/ui'
import { ArrowRight } from 'lucide-react'
import Link from 'next/link'

const FLUXO = [
  { label: 'Pacientes', href: '/saude/tfd/pacientes' },
  { label: 'Solicitações', href: '/saude/tfd/solicitacoes' },
  { label: 'Processos', href: '/saude/tfd/processos' },
  { label: 'Agendamentos', href: '/saude/tfd/agendamentos' },
  { label: 'Viagens', href: '/saude/tfd/viagens' },
  { label: 'Prestações', href: '/saude/tfd/prestacoes' },
] as const

export function GestaoRelacionamentos() {
  return (
    <Card
      header={
        <div>
          <h2 className="text-[length:var(--text-lg)] font-semibold text-[var(--color-text)]">
            Fluxo do TFD
          </h2>
          <p className="mt-[var(--space-1)] text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
            Navegue pela cadeia operacional: paciente, solicitação, processo, agendamento, viagem e
            prestação de contas.
          </p>
        </div>
      }
    >
      <ol className="flex flex-col gap-[var(--space-2)] sm:flex-row sm:flex-wrap sm:items-center">
        {FLUXO.map((etapa, index) => (
          <li key={etapa.href} className="flex items-center gap-[var(--space-2)]">
            <Link
              href={etapa.href}
              className="inline-flex min-h-[40px] items-center rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] px-[var(--space-3)] text-[length:var(--text-sm)] font-medium text-[var(--color-text)] transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
            >
              {etapa.label}
            </Link>
            {index < FLUXO.length - 1 ? (
              <ArrowRight
                className="hidden size-4 shrink-0 text-[var(--color-text-muted)] sm:block"
                aria-hidden="true"
              />
            ) : null}
          </li>
        ))}
      </ol>
    </Card>
  )
}
