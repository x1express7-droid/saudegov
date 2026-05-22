'use client'

import { AlertaPrestacaoPrazo } from '@saude/mod-saude-tfd/client'
import { Alert } from '@saude/ui'
import Link from 'next/link'

export interface AlertaPrestacaoPrazoProps {
  alertas: AlertaPrestacaoPrazo[]
}

function labelQuantidade(total: number): string {
  if (total === 1) {
    return '1 alerta de prestação de contas'
  }
  return `${total} alertas de prestação de contas`
}

function descricaoMotivo(motivo: AlertaPrestacaoPrazo['motivo']): string {
  switch (motivo) {
    case 'LEMBRETE_FALHOU':
      return 'lembrete automático (48h) não enviado'
    case 'PRAZO_VENCIDO':
      return 'prazo de envio vencido'
    case 'PRAZO_VENCENDO':
      return 'prazo de envio em até 48h'
    default:
      return 'atenção necessária'
  }
}

export function AlertaPrestacaoPrazoBanner({ alertas }: AlertaPrestacaoPrazoProps) {
  if (alertas.length === 0) {
    return null
  }

  const temFalhaLembrete = alertas.some((item) => item.motivo === 'LEMBRETE_FALHOU')

  return (
    <Alert variant="warning" titulo={labelQuantidade(alertas.length)} role="alert">
      <p className="text-[length:var(--text-sm)] text-[var(--color-text)]">
        {temFalhaLembrete
          ? 'O envio automático do lembrete de prestação falhou em um ou mais casos. '
          : null}
        Há prestações de contas com prazo vencendo ou vencido — acompanhe e oriente o
        servidor responsável.{' '}
        <Link
          href="/saude/tfd"
          className="font-medium text-[var(--color-warning)] underline-offset-2 hover:underline"
        >
          Ver fila TFD
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
            <span className="text-[var(--color-text)]">
              {' '}
              — viagem {item.sequenciaViagem}, {descricaoMotivo(item.motivo)} (prazo{' '}
              {item.prazoEnvioAt})
            </span>
          </li>
        ))}
      </ul>
    </Alert>
  )
}
