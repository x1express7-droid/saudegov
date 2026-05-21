import {
  assertModuleActive,
  getTenantContext,
  requirePermission,
  requireTenantRole,
} from '@saude/core-auth'
import { getPrismaForTenant } from '@saude/core-db'
import {
  getEspecialidadesTfd,
  getPrestadoresTfd,
  getProcedimentosTfd,
  getSolicitacoesOrigemRetornoTfd,
  TFD_PERMISSIONS,
} from '@saude/mod-saude-tfd'
import { PageHeader } from '@saude/ui'
import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'

import { SolicitacaoForm } from '../components/solicitacao-form'

export const metadata: Metadata = {
  title: 'Nova solicitação — TFD',
}

const CATALOGO_PER_PAGE = 100

interface NovaSolicitacaoPageProps {
  searchParams: Promise<{ pacienteId?: string }>
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
  const pacienteId = params.pacienteId?.trim()

  if (!pacienteId || !isUuid(pacienteId)) {
    redirect('/saude/tfd/pacientes')
  }

  const tenantId = session.user.tenantId!
  const db = await getPrismaForTenant(tenantId)

  const paciente = await db.paciente.findFirst({
    where: {
      id: pacienteId,
      tenant_id: tenantId,
      ativo: true,
    },
    select: {
      id: true,
      nome: true,
      cpf: true,
    },
  })

  if (!paciente) {
    notFound()
  }

  const [especialidadesResult, procedimentosResult, prestadoresResult, solicitacoesOrigem] =
    await Promise.all([
      getEspecialidadesTfd({ ativo: true, perPage: CATALOGO_PER_PAGE }),
      getProcedimentosTfd({ ativo: true, perPage: CATALOGO_PER_PAGE }),
      getPrestadoresTfd({ ativo: true, perPage: CATALOGO_PER_PAGE }),
      getSolicitacoesOrigemRetornoTfd({ pacienteId: paciente.id }),
    ])

  return (
    <div className="flex flex-col gap-[var(--space-6)]">
      <PageHeader
        titulo="Nova solicitação TFD"
        subtitulo="Preencha os dados clínicos e anexe o laudo médico para abrir ou enviar a solicitação."
        breadcrumbs={[
          { label: 'Fila TFD', href: '/saude/tfd' },
          { label: 'Nova solicitação' },
        ]}
      />

      <SolicitacaoForm
        paciente={{
          id: paciente.id,
          nome: paciente.nome,
          possuiCpf: Boolean(paciente.cpf),
        }}
        especialidades={especialidadesResult.items}
        procedimentos={procedimentosResult.items}
        prestadores={prestadoresResult.items}
        solicitacoesOrigem={solicitacoesOrigem}
      />
    </div>
  )
}
