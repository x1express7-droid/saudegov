import { getAgendamentosPorProcesso } from '@saude/mod-saude-tfd'
import type { AgendamentoProcessoListItem } from '@saude/mod-saude-tfd'
import { TFD_PERMISSIONS } from '@saude/mod-saude-tfd/permissions'
import type { SaudeMunicSession } from '@saude/core-auth/types/session'
import { hasPermission } from '@saude/core-auth/server'
import { Button, Card, CardHeader, EmptyState } from '@saude/ui'
import { PermissionGate } from '@saude/ui/permission-gate'
import { Calendar } from 'lucide-react'
import Link from 'next/link'

import { AgendamentoStatusBadge } from '../../components/agendamento-status-badge'

const TIPO_ATENDIMENTO_LABEL: Record<string, string> = {
  CONSULTA: 'Consulta',
  RETORNO: 'Retorno',
  EXAME: 'Exame',
  CIRURGIA: 'Cirurgia',
}

const STATUS_POS_APROVACAO = new Set([
  'APROVADO',
  'AGENDADO',
  'EM_VIAGEM',
  'AGUARDANDO_PC',
  'PC_EM_ANALISE',
  'CONCLUIDO',
])

function formatDataConsulta(iso: string, hora: string | null): string {
  const parsed = iso.length === 10 ? `${iso}T12:00:00` : iso
  const data = new Date(parsed).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
  return hora ? `${data} às ${hora}` : data
}

function labelPrestador(item: AgendamentoProcessoListItem): string {
  const { prestador } = item
  if (!prestador.nome) {
    return '—'
  }
  if (prestador.cidade && prestador.estado) {
    return `${prestador.nome} (${prestador.cidade}/${prestador.estado})`
  }
  return prestador.nome
}

export interface AgendamentosSectionProps {
  session: SaudeMunicSession
  processoId: string
  solicitacaoId: string
  solicitacaoStatus: string
}

export async function AgendamentosSection({
  session,
  processoId,
  solicitacaoId,
  solicitacaoStatus,
}: AgendamentosSectionProps) {
  const agendamentos = await getAgendamentosPorProcesso(processoId)
  const podeCriar = hasPermission(session, TFD_PERMISSIONS.CRIAR_AGENDAMENTO)
  const mostrarNovo =
    agendamentos.length === 0 &&
    solicitacaoStatus === 'APROVADO' &&
    podeCriar
  const statusInformativo = !STATUS_POS_APROVACAO.has(solicitacaoStatus)

  return (
    <Card header={<CardHeader>Agendamentos</CardHeader>}>
      {agendamentos.length === 0 ? (
        <div className="flex flex-col gap-[var(--space-4)]">
          {statusInformativo ? (
            <EmptyState
              icon={<Calendar className="size-6" aria-hidden="true" />}
              titulo="Agendamentos indisponíveis"
              descricao="Os agendamentos de consulta ficam disponíveis após a aprovação da solicitação."
            />
          ) : (
            <EmptyState
              icon={<Calendar className="size-6" aria-hidden="true" />}
              titulo="Nenhum agendamento registrado"
              descricao="Marque a consulta quando a solicitação estiver aprovada."
            />
          )}
          {mostrarNovo ? (
            <PermissionGate session={session} permission={TFD_PERMISSIONS.CRIAR_AGENDAMENTO}>
              <Button variant="primary" asChild>
                <Link
                  href={`/saude/tfd/processos/${processoId}/agendamentos/novo?solicitacaoId=${solicitacaoId}`}
                >
                  Novo agendamento
                </Link>
              </Button>
            </PermissionGate>
          ) : null}
        </div>
      ) : (
        <div className="flex flex-col gap-[var(--space-3)]">
          <ul className="flex flex-col gap-[var(--space-3)]">
            {agendamentos.map((item) => (
              <li
                key={item.id}
                className="flex flex-col gap-[var(--space-2)] rounded-[var(--radius)] border border-[var(--color-border)] p-[var(--space-3)] sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 flex-col gap-[var(--space-1)]">
                  <div className="flex flex-wrap items-center gap-[var(--space-2)]">
                    <span className="text-[length:var(--text-sm)] font-semibold text-[var(--color-text)]">
                      #{item.sequencia}
                    </span>
                    <AgendamentoStatusBadge status={item.status} size="sm" />
                  </div>
                  <p className="text-[length:var(--text-sm)] text-[var(--color-text)]">
                    {formatDataConsulta(item.dataConsulta, item.horaConsulta)} —{' '}
                    {TIPO_ATENDIMENTO_LABEL[item.tipoAtendimento] ?? item.tipoAtendimento}
                  </p>
                  <p className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
                    {labelPrestador(item)}
                  </p>
                </div>
                <Link
                  href={`/saude/tfd/processos/${processoId}/agendamentos/${item.id}`}
                  className="shrink-0 text-[length:var(--text-sm)] font-medium text-[var(--color-primary)] hover:underline"
                >
                  Ver detalhe
                </Link>
              </li>
            ))}
          </ul>
          {mostrarNovo ? (
            <PermissionGate session={session} permission={TFD_PERMISSIONS.CRIAR_AGENDAMENTO}>
              <Button variant="secondary" asChild>
                <Link
                  href={`/saude/tfd/processos/${processoId}/agendamentos/novo?solicitacaoId=${solicitacaoId}`}
                >
                  Novo agendamento
                </Link>
              </Button>
            </PermissionGate>
          ) : null}
        </div>
      )}
    </Card>
  )
}
