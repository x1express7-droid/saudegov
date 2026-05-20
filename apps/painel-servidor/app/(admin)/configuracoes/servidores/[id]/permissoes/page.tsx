import { PageHeader } from '@saude/ui'
import Link from 'next/link'
import { getPermissoesServidor } from '../../../../../../lib/queries/get-permissoes-servidor'
import { PermissoesModuloCard } from './components/permissoes-modulo-card'

interface PermissoesPageProps {
  params: Promise<{ id: string }>
}

function roleLabel(role: 'GESTOR' | 'SERVIDOR') {
  return role === 'GESTOR' ? 'Gestor' : 'Servidor'
}

export default async function PermissoesServidorPage({ params }: PermissoesPageProps) {
  const { id } = await params
  const { servidor, modulos } = await getPermissoesServidor(id)

  return (
    <div className="flex flex-col gap-[var(--space-6)]">
      <PageHeader
        titulo="Permissões granulares"
        subtitulo={`${servidor.name} · ${roleLabel(servidor.role)}`}
      />

      <p className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
        Alterações entram em vigor no próximo login do servidor.
      </p>

      {!servidor.active ? (
        <p className="text-[length:var(--text-sm)] text-[var(--color-warning)]">
          Este servidor está inativo. Reative-o antes de alterar permissões.
        </p>
      ) : null}

      {modulos.length === 0 ? (
        <p className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
          Nenhum módulo ativo com catálogo de permissões para o papel{' '}
          {roleLabel(servidor.role)}.
        </p>
      ) : (
        <div className="flex max-w-2xl flex-col gap-[var(--space-4)]">
          {modulos.map((grupo) => (
            <PermissoesModuloCard
              key={grupo.moduloChave}
              servidorId={servidor.id}
              grupo={grupo}
              disabled={!servidor.active}
            />
          ))}
        </div>
      )}

      <Link
        href="/configuracoes/servidores"
        className="text-[length:var(--text-sm)] text-[var(--color-primary)] hover:underline"
      >
        Voltar para servidores
      </Link>
    </div>
  )
}
