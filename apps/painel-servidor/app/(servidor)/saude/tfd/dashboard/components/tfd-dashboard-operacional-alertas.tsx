import type {
  TfdAlertaAgendamentoSemTransporte,
  TfdAlertaPrazoAnalise,
  TfdAlertaUrgenciaSemResposta,
} from '@saude/mod-saude-tfd/client'
import { Alert, Card } from '@saude/ui'
import Link from 'next/link'

export interface TfdDashboardOperacionalAlertasProps {
  alertas: {
    prazoAnalise: TfdAlertaPrazoAnalise[]
    urgenciaSemResposta: TfdAlertaUrgenciaSemResposta[]
    agendamentosSemTransporte: TfdAlertaAgendamentoSemTransporte[]
  }
}

function formatData(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function labelMotivoPrazo(motivo: TfdAlertaPrazoAnalise['motivo']): string {
  return motivo === 'VENCIDO' ? 'prazo vencido' : 'prazo próximo do vencimento'
}

export function TfdDashboardOperacionalAlertas({ alertas }: TfdDashboardOperacionalAlertasProps) {
  const total =
    alertas.prazoAnalise.length +
    alertas.urgenciaSemResposta.length +
    alertas.agendamentosSemTransporte.length

  return (
    <Card
      header={
        <h2 className="text-[length:var(--text-lg)] font-semibold text-[var(--color-text)]">
          Alertas e urgências
        </h2>
      }
    >
      {total === 0 ? (
        <p className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
          Nenhum alerta no momento.
        </p>
      ) : (
        <div className="flex flex-col gap-[var(--space-4)]">
          {alertas.prazoAnalise.length > 0 ? (
            <Alert
              variant="warning"
              titulo={
                alertas.prazoAnalise.length === 1
                  ? '1 solicitação com prazo de análise crítico'
                  : `${alertas.prazoAnalise.length} solicitações com prazo de análise crítico`
              }
              role="alert"
            >
              <p className="mb-[var(--space-2)] text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
                Portaria GM/MS 55/1999: até 5 dias úteis para casos eletivos; imediato para
                urgência/emergência.
              </p>
              <ul className="list-none space-y-[var(--space-2)] p-0">
                {alertas.prazoAnalise.map((item) => (
                  <li key={item.solicitacaoId}>
                    <Link
                      href={`/saude/tfd/${item.solicitacaoId}`}
                      className="font-medium text-[var(--color-warning)] underline-offset-2 hover:underline"
                    >
                      {item.protocolo}
                    </Link>
                    <span className="text-[var(--color-text)]">
                      {' '}
                      — {item.pacienteNomeParcial}, {labelMotivoPrazo(item.motivo)}
                      {item.diasUteisDecorridos > 0
                        ? ` (${item.diasUteisDecorridos} dias úteis)`
                        : ''}
                    </span>
                  </li>
                ))}
              </ul>
            </Alert>
          ) : null}

          {alertas.urgenciaSemResposta.length > 0 ? (
            <Alert
              variant="error"
              titulo={
                alertas.urgenciaSemResposta.length === 1
                  ? '1 urgência/emergência sem resposta'
                  : `${alertas.urgenciaSemResposta.length} urgências/emergências sem resposta`
              }
              role="alert"
            >
              <ul className="list-none space-y-[var(--space-2)] p-0">
                {alertas.urgenciaSemResposta.map((item) => (
                  <li key={item.solicitacaoId}>
                    <Link
                      href={`/saude/tfd/${item.solicitacaoId}`}
                      className="font-medium text-[var(--color-error)] underline-offset-2 hover:underline"
                    >
                      {item.protocolo}
                    </Link>
                    <span className="text-[var(--color-text)]">
                      {' '}
                      — {item.pacienteNomeParcial}, {item.urgencia.replace('_', ' ')}
                    </span>
                  </li>
                ))}
              </ul>
            </Alert>
          ) : null}

          {alertas.agendamentosSemTransporte.length > 0 ? (
            <Alert
              variant="warning"
              titulo={
                alertas.agendamentosSemTransporte.length === 1
                  ? '1 agendamento nas próximas 24h sem transporte confirmado'
                  : `${alertas.agendamentosSemTransporte.length} agendamentos nas próximas 24h sem transporte confirmado`
              }
              role="alert"
            >
              <ul className="list-none space-y-[var(--space-2)] p-0">
                {alertas.agendamentosSemTransporte.map((item) => {
                  const faltas: string[] = []
                  if (item.faltaMotorista) faltas.push('motorista')
                  if (item.faltaVeiculo) faltas.push('veículo')

                  return (
                    <li key={item.viagemId}>
                      <Link
                        href={`/saude/tfd/${item.solicitacaoId}`}
                        className="font-medium text-[var(--color-warning)] underline-offset-2 hover:underline"
                      >
                        {item.protocolo}
                      </Link>
                      <span className="text-[var(--color-text)]">
                        {' '}
                        — {item.pacienteNomeParcial}, viagem {formatData(item.dataViagem)}
                        {item.horaSaida ? ` às ${item.horaSaida}` : ''} (falta:{' '}
                        {faltas.join(' e ')})
                      </span>
                    </li>
                  )
                })}
              </ul>
            </Alert>
          ) : null}
        </div>
      )}
    </Card>
  )
}
