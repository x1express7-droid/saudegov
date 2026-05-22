import { assertModuleActive, getTenantContext } from '@saude/core-auth/server'
import { getEspecialidadesTfd, getPrestadoresTfd } from '@saude/mod-saude-tfd'
import { PageHeader } from '@saude/ui'
import { notFound } from 'next/navigation'
import { PrestadorTable } from './components/prestador-table'

interface PrestadoresPageProps {
  searchParams: Promise<{ page?: string; ativo?: string }>
}

export default async function PrestadoresPage({ searchParams }: PrestadoresPageProps) {
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

  const [{ items, total, perPage }, especialidadesResult] = await Promise.all([
    getPrestadoresTfd({ page, perPage: 20, ativo }),
    getEspecialidadesTfd({ ativo: true, perPage: 500, page: 1 }),
  ])

  const especialidadeOptions = especialidadesResult.items.map((item) => ({
    value: item.id,
    label: item.nome,
  }))

  return (
    <div className="flex flex-col gap-[var(--space-6)]">
      <PageHeader
        titulo="Prestadores externos"
        subtitulo="Cadastre unidades e profissionais de saúde fora do município para referência nas solicitações de TFD."
        breadcrumbs={[
          { label: 'TFD', href: '/saude/tfd' },
          { label: 'Configurações' },
          { label: 'Prestadores' },
        ]}
      />
      <PrestadorTable
        items={items}
        pagination={{ page, perPage, total }}
        ativoFilter={ativo}
        especialidadeOptions={especialidadeOptions}
      />
    </div>
  )
}
