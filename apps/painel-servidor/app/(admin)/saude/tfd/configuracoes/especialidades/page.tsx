import { assertModuleActive, getTenantContext } from '@saude/core-auth'
import { getEspecialidadesTfd } from '@saude/mod-saude-tfd'
import { PageHeader } from '@saude/ui'
import { notFound } from 'next/navigation'
import { EspecialidadeTable } from './components/especialidade-table'

interface EspecialidadesPageProps {
  searchParams: Promise<{ page?: string; ativo?: string }>
}

export default async function EspecialidadesPage({ searchParams }: EspecialidadesPageProps) {
  const tenant = await getTenantContext()
  if (!tenant.modules?.saude?.tfd) {
    notFound()
  }

  await assertModuleActive('saude', 'tfd')

  const params = await searchParams
  const page = Math.max(1, Number(params.page) || 1)
  let ativo: boolean | undefined
  if (params.ativo === '1') {
    ativo = true
  } else if (params.ativo === '0') {
    ativo = false
  }

  const { items, total, perPage } = await getEspecialidadesTfd({ page, perPage: 20, ativo })

  return (
    <div className="flex flex-col gap-[var(--space-6)]">
      <PageHeader
        titulo="Especialidades"
        subtitulo="Cadastre as especialidades médicas disponíveis para solicitações de TFD."
        breadcrumbs={[
          { label: 'TFD', href: '/saude/tfd' },
          { label: 'Configurações' },
          { label: 'Especialidades' },
        ]}
      />
      <EspecialidadeTable
        items={items}
        pagination={{ page, perPage, total }}
        ativoFilter={ativo}
      />
    </div>
  )
}
