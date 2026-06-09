import {
  assertModuleActive,
  getTenantContext,
  hasPermission,
  requireTenantRole,
} from '@saude/core-auth/server'
import { getPacientesTfd, isCadsusEnabledForTenant, TFD_PERMISSIONS } from '@saude/mod-saude-tfd'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { PacientesPageLayout } from './components/pacientes-page-layout'

// BLOCO-7-PACIENTES
export const metadata: Metadata = {
  title: 'Pacientes — TFD',
}

interface PacientesPageProps {
  searchParams: Promise<{
    page?: string
    perPage?: string
  }>
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

export default async function PacientesPage({ searchParams }: PacientesPageProps) {
  const tenant = await getTenantContext()
  if (!tenant.modules?.saude?.tfd) {
    notFound()
  }

  await assertModuleActive('saude', 'tfd')
  const session = await requireTenantRole('SERVIDOR')
  const podeVerPerfilPaciente = hasPermission(session, TFD_PERMISSIONS.VER_PERFIL_PACIENTE)
  const podeCadastrarPaciente = hasPermission(session, TFD_PERMISSIONS.ABRIR_SOLICITACAO)

  const params = await searchParams
  const page = parsePositiveInt(params.page, 1)
  const perPage = Math.min(100, parsePositiveInt(params.perPage, 20))

  const [{ items, total }, cadsusEnabled] = await Promise.all([
    getPacientesTfd({
      page,
      perPage,
    }),
    isCadsusEnabledForTenant(tenant.id),
  ])

  return (
    <PacientesPageLayout
      items={items}
      total={total}
      page={page}
      perPage={perPage}
      cadsusEnabled={cadsusEnabled}
      podeVerPerfilPaciente={podeVerPerfilPaciente}
      podeEditarPaciente={podeCadastrarPaciente}
      podeNovaSolicitacao={podeCadastrarPaciente}
      podeCadastrarPaciente={podeCadastrarPaciente}
    />
  )
}
