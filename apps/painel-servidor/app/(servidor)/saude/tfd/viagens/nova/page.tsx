import {
  assertModuleActive,
  getTenantContext,
  requireTenantRole,
} from '@saude/core-auth/server'
import {
  getAgendamentoDetalhe,
  getSolicitacaoTfd,
  getVeiculosAgendamentoTfd,
} from '@saude/mod-saude-tfd'
import { Alert, PageHeader } from '@saude/ui'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { NovaViagemForm } from './components/nova-viagem-form'

export const metadata: Metadata = {
  title: 'Nova viagem TFD',
}

interface NovaViagemPageProps {
  searchParams: Promise<{ agendamentoId?: string }>
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  )
}

export default async function NovaViagemPage({ searchParams }: NovaViagemPageProps) {
  const tenant = await getTenantContext()
  if (!tenant.modules?.saude?.tfd) {
    notFound()
  }

  await assertModuleActive('saude', 'tfd')
  const session = await requireTenantRole('SERVIDOR')

  const { agendamentoId } = await searchParams
  let agendamentoIdPreSelecionado: string | undefined
  let dataSaidaInicial: string | undefined
  let agendamentoContext: { protocolo: string; pacienteNome: string } | undefined

  if (agendamentoId && isUuid(agendamentoId)) {
    const agendamento = await getAgendamentoDetalhe(agendamentoId)
    if (agendamento) {
      agendamentoIdPreSelecionado = agendamento.id
      dataSaidaInicial = agendamento.dataConsulta

      const solicitacao = await getSolicitacaoTfd(agendamento.solicitacaoId)
      const pacienteNome = solicitacao?.paciente.nome ?? 'Paciente'

      agendamentoContext = {
        protocolo: agendamento.protocolo,
        pacienteNome,
      }
    }
  }

  const veiculos = await getVeiculosAgendamentoTfd(false)

  return (
    <div className="flex flex-col gap-[var(--space-6)]">
      <PageHeader
        titulo="Nova viagem"
        subtitulo="Cadastre o deslocamento e vincule os agendamentos como passageiros."
        breadcrumbs={[
          { label: 'Viagens', href: '/saude/tfd/viagens' },
          { label: 'Nova viagem' },
        ]}
      />

      {agendamentoContext ? (
        // REMOVE-PROCESSO-PARTE-3: banner contextual sem campo de processo
        <Alert variant="info">
          Você está criando uma viagem para o agendamento {agendamentoContext.protocolo}. O paciente{' '}
          {agendamentoContext.pacienteNome} será adicionado automaticamente como passageiro.
        </Alert>
      ) : null}

      <NovaViagemForm
        session={session}
        veiculos={veiculos}
        agendamentoIdPreSelecionado={agendamentoIdPreSelecionado}
        dataSaidaInicial={dataSaidaInicial}
      />
    </div>
  )
}
