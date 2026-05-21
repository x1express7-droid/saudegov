import type { AlertaPendente30Dias } from '@saude/mod-saude-tfd'
import { Alert } from '@saude/ui'
import Link from 'next/link'

export interface AlertaPendentesProps {
  alertas: AlertaPendente30Dias[]
}

function labelQuantidade(total: number): string {
  if (total === 1) {
    return '1 solicitação aguarda complemento há mais de 30 dias'
  }
  return `${total} solicitações aguardam complemento há mais de 30 dias`
}

export function AlertaPendentes({ alertas }: AlertaPendentesProps) {
  if (alertas.length === 0) {
    return null
  }

  return (
    <Alert variant="warning" titulo={labelQuantidade(alertas.length)} role="alert">
      <ul className="mt-[var(--space-2)] list-none space-y-[var(--space-2)] p-0">
        {alertas.map((item) => (
          <li key={item.id}>
            <Link
              href={`/saude/tfd/${item.id}`}
              className="font-medium text-[var(--color-warning)] underline-offset-2 hover:underline"
            >
              {item.protocolo}
            </Link>
            <span className="text-[var(--color-text)]"> — {item.paciente.nome}</span>
          </li>
        ))}
      </ul>
    </Alert>
  )
}
