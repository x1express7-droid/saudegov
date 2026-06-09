import type {
  AlertaLembreteViagemFalhou,
  AlertaPendente30Dias,
  AlertaPendente60Dias,
  AlertaPrestacaoPrazo,
  TfdAlertaUrgente,
  TfdDashboardSaldoItem,
} from '@saude/mod-saude-tfd/client'
import { Alert, Card, EmptyState, TFD_STATUS_CONFIG, type TfdStatus } from '@saude/ui'
import { BellRing } from 'lucide-react'
import Link from 'next/link'

export interface TfdDashboardAlertasProps {
  alertasUrgentes: TfdAlertaUrgente[]
  saldosBaixo: TfdDashboardSaldoItem[]
  alertasPrestacao: AlertaPrestacaoPrazo[]
  alertasPendente30: AlertaPendente30Dias[]
  alertasPendente60: AlertaPendente60Dias[]
  alertasLembreteViagem: AlertaLembreteViagemFalhou[]
}

function formatData(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function descricaoMotivoPrestacao(motivo: AlertaPrestacaoPrazo['motivo']): string {
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

function labelStatus(status: string): string {
  if (status in TFD_STATUS_CONFIG) {
    return TFD_STATUS_CONFIG[status as TfdStatus].label
  }
  return status
}

function percentualDisponivel(saldo: TfdDashboardSaldoItem): number {
  if (saldo.valorTotal <= 0) {
    return 0
  }
  return Math.round((saldo.valorDisponivel / saldo.valorTotal) * 1000) / 10
}

function formatMoeda(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function TfdDashboardAlertas({
  alertasUrgentes,
  saldosBaixo,
  alertasPrestacao,
  alertasPendente30,
  alertasPendente60,
  alertasLembreteViagem,
}: TfdDashboardAlertasProps) {
  const totalAlertas =
    alertasUrgentes.length +
    saldosBaixo.length +
    alertasPrestacao.length +
    alertasPendente30.length +
    alertasPendente60.length +
    alertasLembreteViagem.length

  return (
    <Card
      header={
        <h2 className="text-[length:var(--text-lg)] font-semibold text-[var(--color-text)]">
          Alertas operacionais
        </h2>
      }
    >
      {totalAlertas === 0 ? (
        <EmptyState
          icon={<BellRing className="size-6" />}
          titulo="Nenhum alerta no momento"
          descricao="Alertas de urgência, saldo, prestação de contas e viagens aparecerão aqui quando houver pendências."
          className="border-0 bg-transparent py-[var(--space-8)]"
        />
      ) : (
        <div className="flex flex-col gap-[var(--space-4)]">
          {alertasUrgentes.length > 0 ? (
            <Alert
              variant="error"
              titulo={
                alertasUrgentes.length === 1
                  ? '1 solicitação muito urgente sem decisão'
                  : `${alertasUrgentes.length} solicitações muito urgentes sem decisão`
              }
              role="alert"
            >
              <ul className="mt-[var(--space-2)] list-none space-y-[var(--space-2)] p-0">
                {alertasUrgentes.map((item) => (
                  <li key={item.solicitacaoId}>
                    <Link
                      href={`/saude/tfd/${item.solicitacaoId}`}
                      className="font-medium text-[var(--color-error)] underline-offset-2 hover:underline"
                    >
                      {item.protocolo}
                    </Link>
                    <span className="text-[var(--color-text)]">
                      {' '}
                      — {labelStatus(item.status)}, {item.especialidade}
                    </span>
                  </li>
                ))}
              </ul>
            </Alert>
          ) : null}

          {saldosBaixo.length > 0 ? (
            <Alert
              variant="warning"
              titulo={
                saldosBaixo.length === 1
                  ? '1 saldo com disponível abaixo de 20%'
                  : `${saldosBaixo.length} saldos com disponível abaixo de 20%`
              }
              role="alert"
            >
              <ul className="mt-[var(--space-2)] list-none space-y-[var(--space-2)] p-0">
                {saldosBaixo.map((saldo) => (
                  <li key={saldo.id}>
                    <Link
                      href="/saude/tfd/saldos"
                      className="font-medium text-[var(--color-warning)] underline-offset-2 hover:underline"
                    >
                      {saldo.descricao}
                    </Link>
                    <span className="text-[var(--color-text)]">
                      {' '}
                      — disponível {formatMoeda(saldo.valorDisponivel)} (
                      {percentualDisponivel(saldo)}% do total)
                    </span>
                  </li>
                ))}
              </ul>
            </Alert>
          ) : null}

          {alertasPrestacao.length > 0 ? (
            <Alert
              variant="warning"
              titulo={
                alertasPrestacao.length === 1
                  ? '1 prestação de contas com prazo crítico'
                  : `${alertasPrestacao.length} prestações de contas com prazo crítico`
              }
              role="alert"
            >
              <ul className="mt-[var(--space-2)] list-none space-y-[var(--space-2)] p-0">
                {alertasPrestacao.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={`/saude/tfd/${item.solicitacao.id}`}
                      className="font-medium text-[var(--color-warning)] underline-offset-2 hover:underline"
                    >
                      {item.solicitacao.protocolo}
                    </Link>
                    <span className="text-[var(--color-text)]">
                      {' '}
                      — viagem {item.sequenciaViagem}, {descricaoMotivoPrestacao(item.motivo)} (prazo{' '}
                      {formatData(item.prazoEnvioAt)})
                    </span>
                  </li>
                ))}
              </ul>
            </Alert>
          ) : null}

          {alertasPendente30.length > 0 ? (
            <Alert
              variant="warning"
              titulo={
                alertasPendente30.length === 1
                  ? '1 complemento pendente há mais de 30 dias'
                  : `${alertasPendente30.length} complementos pendentes há mais de 30 dias`
              }
              role="alert"
            >
              <ul className="mt-[var(--space-2)] list-none space-y-[var(--space-2)] p-0">
                {alertasPendente30.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={`/saude/tfd/${item.id}`}
                      className="font-medium text-[var(--color-warning)] underline-offset-2 hover:underline"
                    >
                      {item.protocolo}
                    </Link>
                    <span className="text-[var(--color-text)]">
                      {' '}
                      — aguardando complemento ({item.diasPendente} dias)
                    </span>
                  </li>
                ))}
              </ul>
            </Alert>
          ) : null}

          {alertasPendente60.length > 0 ? (
            <Alert
              variant="error"
              titulo={
                alertasPendente60.length === 1
                  ? '1 complemento pendente há 60 dias ou mais — cancelamento permitido'
                  : `${alertasPendente60.length} complementos pendentes há 60 dias ou mais — cancelamento permitido`
              }
              role="alert"
            >
              <ul className="mt-[var(--space-2)] list-none space-y-[var(--space-2)] p-0">
                {alertasPendente60.map((item) => (
                  <li key={item.id} className="flex flex-wrap items-baseline gap-x-[var(--space-2)]">
                    <Link
                      href={`/saude/tfd/${item.id}`}
                      className="font-medium text-[var(--color-error)] underline-offset-2 hover:underline"
                    >
                      {item.protocolo}
                    </Link>
                    <span className="text-[var(--color-text)]">
                      — {item.diasPendente} dias sem retorno
                    </span>
                    <Link
                      href={`/saude/tfd/${item.id}?cancelar=prazo`}
                      className="text-[length:var(--text-xs)] font-medium text-[var(--color-error)] underline-offset-2 hover:underline"
                    >
                      Cancelar por prazo esgotado
                    </Link>
                  </li>
                ))}
              </ul>
            </Alert>
          ) : null}

          {alertasLembreteViagem.length > 0 ? (
            <Alert
              variant="warning"
              titulo={
                alertasLembreteViagem.length === 1
                  ? '1 lembrete de viagem (48h) não enviado'
                  : `${alertasLembreteViagem.length} lembretes de viagem (48h) não enviados`
              }
              role="alert"
            >
              <ul className="mt-[var(--space-2)] list-none space-y-[var(--space-2)] p-0">
                {alertasLembreteViagem.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={`/saude/tfd/${item.solicitacao.id}`}
                      className="font-medium text-[var(--color-warning)] underline-offset-2 hover:underline"
                    >
                      {item.solicitacao.protocolo}
                    </Link>
                    <span className="text-[var(--color-text)]">
                      {' '}
                      — viagem em {formatData(item.dataViagem)}
                    </span>
                  </li>
                ))}
              </ul>
            </Alert>
          ) : null}
        </div>
      )}
    </Card>
  )
}
