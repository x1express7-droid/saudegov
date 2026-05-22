import { getTenantContext, requireTenantRole } from '@saude/core-auth/server'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { PacienteBuscaForm } from './components/paciente-busca-form'

export const metadata: Metadata = {
  title: 'Busca de Paciente — TFD',
}

export default async function PacientesPage() {
  const tenant = await getTenantContext()
  if (!tenant.modules?.saude?.tfd) {
    notFound()
  }

  await requireTenantRole('SERVIDOR')

  return <PacienteBuscaForm />
}
