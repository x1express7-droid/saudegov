import { assertModuleActive, getTenantContext, requireTenantRole } from '@saude/core-auth'
import { getSaldosTfd } from '@saude/mod-saude-tfd'
import { PageHeader } from '@saude/ui'
import { notFound } from 'next/navigation'
import { SaldoLista } from './components/saldo-lista'

interface SaldosPageProps {
  searchParams: Promise<{ incluirInativos?: string }>
}

export default async function SaldosPage({ searchParams }: SaldosPageProps) {
  const tenant = await getTenantContext()
  if (!tenant.modules?.saude?.tfd) {
    notFound()
  }

  await assertModuleActive('saude', 'tfd')
  const session = await requireTenantRole('GESTOR')

  const params = await searchParams
  const incluirInativos = params.incluirInativos === '1'
  const items = await getSaldosTfd({ incluirInativos })

  return (
    <div className="flex flex-col gap-[var(--space-6)]">
      <PageHeader
        titulo="Saldos financeiros"
        subtitulo="Cadastre e acompanhe os recursos destinados ao TFD, com reservas e consumo em tempo real."
        breadcrumbs={[
          { label: 'TFD', href: '/saude/tfd' },
          { label: 'Configurações' },
          { label: 'Saldos' },
        ]}
      />
      <SaldoLista items={items} session={session} incluirInativos={incluirInativos} />
    </div>
  )
}
