import {
  assertModuleActive,
  getTenantContext,
  hasPermission,
  requireTenantRole,
} from '@saude/core-auth/server'
import { getPacientesTfd, isCadsusEnabledForTenant, TFD_PERMISSIONS } from '@saude/mod-saude-tfd'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'

import { PacienteBuscaForm } from './components/paciente-busca-form'
import { PacientesVinculadosFiltro } from './components/pacientes-vinculados-filtro'
import { PacientesVinculadosLista } from './components/pacientes-vinculados-lista'

export const metadata: Metadata = {
  title: 'Pacientes — TFD',
}

interface PacientesPageProps {
  searchParams: Promise<{
    nome?: string
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
  const nome = params.nome?.trim()

  const [{ items, total }, cadsusEnabled] = await Promise.all([
    getPacientesTfd({
      nome: nome || undefined,
      page,
      perPage,
    }),
    isCadsusEnabledForTenant(tenant.id),
  ])

  return (
    <PacienteBuscaForm
      cadsusEnabled={cadsusEnabled}
      podeCadastrarPaciente={podeCadastrarPaciente}
      vinculadosSection={
        <>
          <section
            aria-labelledby="pacientes-vinculados-tfd"
            className="flex flex-col gap-[var(--space-4)]"
          >
            <div>
              <h2
                id="pacientes-vinculados-tfd"
                className="text-[length:var(--text-lg)] font-semibold text-[var(--color-text)]"
              >
                Pacientes vinculados ao município
              </h2>
              <p className="mt-[var(--space-1)] text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
                Pacientes já cadastrados e disponíveis para solicitações TFD neste município.
              </p>
            </div>

            <Suspense
              fallback={
                <p className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
                  Carregando busca…
                </p>
              }
            >
              <PacientesVinculadosFiltro />
            </Suspense>

            <PacientesVinculadosLista
              items={items}
              total={total}
              podeVerPerfilPaciente={podeVerPerfilPaciente}
              podeEditarPaciente={podeCadastrarPaciente}
            />
          </section>
        </>
      }
    />
  )
}
