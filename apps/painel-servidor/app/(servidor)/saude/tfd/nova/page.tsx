import {
  assertModuleActive,
  getTenantContext,
  requirePermission,
  requireTenantRole,
} from '@saude/core-auth/server'
import {
  getEspecialidadesTfd,
  getPacienteAtendimentoTfd,
  getPrestadoresTfd,
  getProcessoTfdDetalhe,
  getProcedimentosTfd,
  getSolicitacoesOrigemRetornoTfd,
  isCadsusEnabledForTenant,
  TFD_CATALOGO_OPCOES_PER_PAGE,
  TFD_PERMISSIONS,
} from '@saude/mod-saude-tfd'
import { PageHeader } from '@saude/ui'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { AtendimentoTfdForm } from './components/atendimento-tfd-form'

export const metadata: Metadata = {
  title: 'Atendimento da Solicitação TFD',
}

const CATALOGO_PER_PAGE = TFD_CATALOGO_OPCOES_PER_PAGE

interface NovaSolicitacaoPageProps {
  searchParams: Promise<{ pacienteId?: string; processoId?: string }>
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  )
}

export default async function NovaSolicitacaoPage({ searchParams }: NovaSolicitacaoPageProps) {
  const tenant = await getTenantContext()
  if (!tenant.modules?.saude?.tfd) {
    notFound()
  }

  await assertModuleActive('saude', 'tfd')
  const session = await requireTenantRole('SERVIDOR')
  await requirePermission(session, TFD_PERMISSIONS.ABRIR_SOLICITACAO)

  const params = await searchParams
  const pacienteIdParam = params.pacienteId?.trim()
  const processoIdParam = params.processoId?.trim()

  let initialPaciente = null
  let processoId: string | undefined

  if (processoIdParam && isUuid(processoIdParam)) {
    const processo = await getProcessoTfdDetalhe(processoIdParam)
    if (!processo) {
      notFound()
    }
    processoId = processo.id
    if (processo.paciente?.id) {
      initialPaciente = await getPacienteAtendimentoTfd(processo.paciente.id)
      if (!initialPaciente) {
        notFound()
      }
    }
  }

  if (pacienteIdParam && isUuid(pacienteIdParam)) {
    initialPaciente = await getPacienteAtendimentoTfd(pacienteIdParam)
    if (!initialPaciente) {
      notFound()
    }
  }

  const pacienteIdForOrigem = initialPaciente?.id

  const tenantId = tenant.id

  const [especialidadesResult, procedimentosResult, prestadoresResult, solicitacoesOrigem, cadsusEnabled] =
    await Promise.all([
      getEspecialidadesTfd({ ativo: true, perPage: CATALOGO_PER_PAGE }),
      getProcedimentosTfd({ ativo: true, perPage: CATALOGO_PER_PAGE }),
      getPrestadoresTfd({ ativo: true, perPage: CATALOGO_PER_PAGE }),
      pacienteIdForOrigem
        ? getSolicitacoesOrigemRetornoTfd({ pacienteId: pacienteIdForOrigem })
        : Promise.resolve([]),
      isCadsusEnabledForTenant(tenantId),
    ])

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        titulo="Atendimento da Solicitação TFD"
        subtitulo="Identifique o paciente, revise os dados cadastrais e registre a solicitação de Tratamento Fora de Domicílio."
        breadcrumbs={[
          { label: 'Processos TFD', href: '/saude/tfd/processos' },
          ...(processoId
            ? [{ label: 'Processo', href: `/saude/tfd/processos/${processoId}` }]
            : []),
          { label: 'Nova solicitação' },
        ]}
      />

      <AtendimentoTfdForm
        initialPaciente={initialPaciente}
        processoId={processoId}
        cadsusEnabled={cadsusEnabled}
        especialidades={especialidadesResult.items}
        procedimentos={procedimentosResult.items}
        prestadores={prestadoresResult.items}
        solicitacoesOrigem={solicitacoesOrigem}
      />
    </div>
  )
}
