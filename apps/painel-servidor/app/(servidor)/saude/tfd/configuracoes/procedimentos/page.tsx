import {
  assertModuleActive,
  getTenantContext,
  requirePermission,
  requireTenantRole,
} from '@saude/core-auth/server'
import {
  getEspecialidadesTfd,
  getProcedimentosTfd,
  TFD_CATALOGO_OPCOES_PER_PAGE,
  TFD_PERMISSIONS,
} from '@saude/mod-saude-tfd'
import { PageHeader } from '@saude/ui'
import { notFound } from 'next/navigation'
import { ProcedimentoTable } from './components/procedimento-table'

interface ProcedimentosPageProps {
  searchParams: Promise<{ page?: string; ativo?: string; especialidadeId?: string }>
}

export default async function ProcedimentosPage({ searchParams }: ProcedimentosPageProps) {
  const tenant = await getTenantContext()
  if (!tenant.modules?.saude?.tfd) {
    notFound()
  }

  await assertModuleActive('saude', 'tfd')
  const session = await requireTenantRole('GESTOR')
  await requirePermission(session, TFD_PERMISSIONS.CONFIGURAR_PROCEDIMENTOS)

  const params = await searchParams
  const page = Math.max(1, Number(params.page) || 1)
  let ativo: boolean | undefined
  if (params.ativo === '1') {
    ativo = true
  } else if (params.ativo === '0') {
    ativo = false
  }

  const especialidadeId =
    params.especialidadeId && params.especialidadeId.length > 0
      ? params.especialidadeId
      : undefined

  const [{ items, total, perPage }, especialidadesResult] = await Promise.all([
    getProcedimentosTfd({
      page,
      perPage: 20,
      ativo,
      especialidadeId,
    }),
    getEspecialidadesTfd({ ativo: true, perPage: TFD_CATALOGO_OPCOES_PER_PAGE, page: 1 }),
  ])

  const especialidadeOptions = especialidadesResult.items.map((item) => ({
    value: item.id,
    label: item.nome,
  }))

  return (
    <div className="flex flex-col gap-[var(--space-6)]">
      <PageHeader
        titulo="Procedimentos"
        subtitulo="Cadastre procedimentos vinculados às especialidades para uso nas solicitações de TFD."
        breadcrumbs={[
          { label: 'TFD', href: '/saude/tfd' },
          { label: 'Configurações' },
          { label: 'Procedimentos' },
        ]}
      />
      <ProcedimentoTable
        items={items}
        pagination={{ page, perPage, total }}
        ativoFilter={ativo}
        especialidadeFilterId={especialidadeId}
        especialidadeOptions={especialidadeOptions}
      />
    </div>
  )
}
