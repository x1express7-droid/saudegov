'use client'

import type { AlertaLembreteViagemFalhou } from '@saude/mod-saude-tfd'
import { Alert } from '@saude/ui'
import Link from 'next/link'

export interface AlertaLembreteViagemProps {
  alertas: AlertaLembreteViagemFalhou[]
}

function labelQuantidade(total: number): string {
  if (total === 1) {
    return '1 lembrete de viagem (48h) não foi enviado'
  }
  return `${total} lembretes de viagem (48h) não foram enviados`
}

export function AlertaLembreteViagem({ alertas }: AlertaLembreteViagemProps) {
  if (alertas.length === 0) {
    return null
  }

  return (
    <Alert variant="warning" titulo={labelQuantidade(alertas.length)} role="alert">
      <p className="text-[length:var(--text-sm)] text-[var(--color-text)]">
        O envio automático do lembrete falhou. Verifique os agendamentos e contate os
        envolvidos manualmente se necessário.{' '}
        <Link
          href="/saude/tfd/agendamentos"
          className="font-medium text-[var(--color-warning)] underline-offset-2 hover:underline"
        >
          Ver agendamentos
        </Link>
      </p>
      <ul className="mt-[var(--space-2)] list-none space-y-[var(--space-2)] p-0">
        {alertas.map((item) => (
          <li key={item.id}>
            <Link
              href={`/saude/tfd/${item.solicitacao.id}`}
              className="font-medium text-[var(--color-warning)] underline-offset-2 hover:underline"
            >
              {item.solicitacao.protocolo}
            </Link>
            <span className="text-[var(--color-text)]"> — viagem em {item.dataViagem}</span>
          </li>
        ))}
      </ul>
    </Alert>
  )
}
