import { assertModuleActive, getTenantContext } from '@saude/core-auth'
import {
  getMotoristasTfd,
  getServidoresMotoristaOptionsTfd,
} from '@saude/mod-saude-tfd'
import { Alert, PageHeader } from '@saude/ui'
import { notFound } from 'next/navigation'
import { MotoristaTable } from './components/motorista-table'

interface MotoristasPageProps {
  searchParams: Promise<{ page?: string; ativo?: string }>
}

export default async function MotoristasPage({ searchParams }: MotoristasPageProps) {
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

  const [{ items, total, perPage }, servidorOptions, alertasAtivos] = await Promise.all([
    getMotoristasTfd({ page, perPage: 20, ativo }),
    getServidoresMotoristaOptionsTfd(),
    getMotoristasTfd({ ativo: true, perPage: 500, page: 1 }),
  ])

  const cnhVencidas = alertasAtivos.items.filter((item) => item.cnhVencida).length
  const cnhVencendoEmBreve = alertasAtivos.items.filter(
    (item) => item.cnhVencendoEmBreve && !item.cnhVencida
  ).length

  const exibirAlertaCnh = cnhVencidas > 0 || cnhVencendoEmBreve > 0

  return (
    <div className="flex flex-col gap-[var(--space-6)]">
      <PageHeader
        titulo="Motoristas"
        subtitulo="Cadastre servidores habilitados para conduzir veículos nos agendamentos de TFD."
        breadcrumbs={[
          { label: 'TFD', href: '/saude/tfd' },
          { label: 'Configurações' },
          { label: 'Motoristas' },
        ]}
      />

      {exibirAlertaCnh ? (
        <Alert
          variant={cnhVencidas > 0 ? 'error' : 'warning'}
          titulo="Atenção — validade da CNH"
        >
          {cnhVencidas > 0 ? (
            <p>
              {cnhVencidas === 1
                ? '1 motorista ativo com CNH vencida.'
                : `${cnhVencidas} motoristas ativos com CNH vencida.`}{' '}
              Motoristas com CNH vencida não aparecem na seleção de agendamentos.
            </p>
          ) : null}
          {cnhVencendoEmBreve > 0 ? (
            <p className={cnhVencidas > 0 ? 'mt-[var(--space-2)]' : undefined}>
              {cnhVencendoEmBreve === 1
                ? '1 motorista ativo com CNH vencendo nos próximos 30 dias.'
                : `${cnhVencendoEmBreve} motoristas ativos com CNH vencendo nos próximos 30 dias.`}
            </p>
          ) : null}
        </Alert>
      ) : null}

      <MotoristaTable
        items={items}
        pagination={{ page, perPage, total }}
        ativoFilter={ativo}
        servidorOptions={servidorOptions}
      />
    </div>
  )
}
