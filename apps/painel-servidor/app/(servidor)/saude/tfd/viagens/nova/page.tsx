import {
  assertModuleActive,
  getTenantContext,
  requireTenantRole,
} from '@saude/core-auth/server'
import {
  getAgendamentoDetalhe,
  getListaProcessosTfd,
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
  let processoIdInicial: string | undefined
  let agendamentoIdPreSelecionado: string | undefined

  if (agendamentoId && isUuid(agendamentoId)) {
    const agendamento = await getAgendamentoDetalhe(agendamentoId)
    if (agendamento) {
      processoIdInicial = agendamento.processoId
      agendamentoIdPreSelecionado = agendamento.id
    }
  }

  const veiculos = await getVeiculosAgendamentoTfd(false)
  const { items: processosLista } = await getListaProcessosTfd({ perPage: 100, page: 1 })
  const processos = processosLista.map((item) => ({
    value: item.processoId,
    label: `${item.protocolo} — ${item.paciente?.nome ?? 'Sem paciente'}`,
  }))

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

      <Alert variant="info">
        Para vincular um agendamento específico, acesse o agendamento e clique em &quot;Criar
        viagem&quot; — o processo e o agendamento serão pré-selecionados automaticamente.
      </Alert>

      <NovaViagemForm
        session={session}
        veiculos={veiculos}
        processos={processos}
        processoIdInicial={processoIdInicial}
        agendamentoIdPreSelecionado={agendamentoIdPreSelecionado}
      />
    </div>
  )
}
