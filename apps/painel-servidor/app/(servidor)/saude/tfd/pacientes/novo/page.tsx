import {
  assertModuleActive,
  getTenantContext,
  hasPermission,
  requirePermission,
  requireTenantRole,
} from '@saude/core-auth/server'
import {
  getPacienteAtendimentoTfd,
  isCadsusEnabledForTenant,
  TFD_PERMISSIONS,
} from '@saude/mod-saude-tfd'
import { PageHeader } from '@saude/ui'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { PacienteCadastroForm } from './components/paciente-cadastro-form'

export const metadata: Metadata = {
  title: 'Cadastrar ou editar paciente — TFD',
}

interface NovoPacientePageProps {
  searchParams: Promise<{ pacienteId?: string }>
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  )
}

export default async function NovoPacientePage({ searchParams }: NovoPacientePageProps) {
  const tenant = await getTenantContext()
  if (!tenant.modules?.saude?.tfd) {
    notFound()
  }

  await assertModuleActive('saude', 'tfd')
  const session = await requireTenantRole('SERVIDOR')
  await requirePermission(session, TFD_PERMISSIONS.ABRIR_SOLICITACAO)

  const params = await searchParams
  const pacienteIdParam = params.pacienteId?.trim()

  let initialPaciente = null
  if (pacienteIdParam && isUuid(pacienteIdParam)) {
    initialPaciente = await getPacienteAtendimentoTfd(pacienteIdParam)
    if (!initialPaciente) {
      notFound()
    }
  }

  const modoEdicao = Boolean(initialPaciente)

  const [cadsusEnabled, podeVerPerfilPaciente] = await Promise.all([
    isCadsusEnabledForTenant(tenant.id),
    Promise.resolve(hasPermission(session, TFD_PERMISSIONS.VER_PERFIL_PACIENTE)),
  ])

  return (
    <div className="flex flex-col gap-[var(--space-6)]">
      <PageHeader
        titulo={modoEdicao ? 'Editar paciente' : 'Cadastrar ou editar paciente'}
        subtitulo={
          modoEdicao
            ? `Atualize os dados de ${initialPaciente!.nome} na base do município.`
            : 'Busque um paciente existente para editar ou preencha o formulário para um novo cadastro. Nome é obrigatório; CPF, CNS e demais campos são opcionais.'
        }
        breadcrumbs={[
          { label: 'TFD', href: '/saude/tfd' },
          { label: 'Pacientes', href: '/saude/tfd/pacientes' },
          { label: modoEdicao ? 'Editar paciente' : 'Cadastrar ou editar' },
        ]}
      />

      <PacienteCadastroForm
        initialPaciente={initialPaciente}
        cadsusEnabled={cadsusEnabled}
        podeVerPerfilPaciente={podeVerPerfilPaciente}
      />
    </div>
  )
}
