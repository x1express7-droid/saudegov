import { assertModuleActive, getTenantContext, requireTenantRole } from '@saude/core-auth/server'
import { getPerfilServidor } from '@saude/mod-saude-tfd'
import { PageHeader } from '@saude/ui'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { PerfilServidorView } from './components/perfil-servidor-view'

interface PerfilServidorPageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PerfilServidorPageProps): Promise<Metadata> {
  const { id } = await params
  try {
    const perfil = await getPerfilServidor(id)
    return {
      title: perfil ? `Perfil — ${perfil.nome}` : 'Perfil do servidor',
    }
  } catch {
    return { title: 'Perfil do servidor' }
  }
}

export default async function PerfilServidorPage({ params }: PerfilServidorPageProps) {
  const tenant = await getTenantContext()
  if (!tenant.modules?.saude?.tfd) {
    notFound()
  }

  await assertModuleActive('saude', 'tfd')
  const session = await requireTenantRole('SERVIDOR')

  const { id } = await params

  let perfil
  try {
    perfil = await getPerfilServidor(id)
  } catch {
    notFound()
  }

  if (!perfil) {
    notFound()
  }

  const podeEditarDados =
    session.user.role === 'ADMIN' || session.user.id === id

  const podeVerHistorico =
    session.user.role === 'ADMIN' || session.user.role === 'GESTOR'

  return (
    <div className="flex flex-col gap-[var(--space-6)]">
      <PageHeader
        titulo={perfil.nome}
        subtitulo="Perfil do servidor municipal."
        breadcrumbs={[
          { label: 'TFD', href: '/saude/tfd/dashboard' },
          { label: 'Configurações', href: '/saude/tfd/configuracoes' },
          { label: perfil.nome },
        ]}
      />

      <PerfilServidorView
        perfil={perfil}
        podeEditarDados={podeEditarDados}
        podeVerHistorico={podeVerHistorico}
      />
    </div>
  )
}
