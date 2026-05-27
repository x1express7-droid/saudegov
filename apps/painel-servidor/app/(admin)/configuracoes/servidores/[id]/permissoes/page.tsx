import { Alert, Badge, Button, Card, PageHeader } from '@saude/ui'
import { ArrowLeft, KeyRound, Shield } from 'lucide-react'
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

  const totalPermissoes = modulos.reduce((acc, modulo) => acc + modulo.catalogo.length, 0)
  const totalAtivas = modulos.reduce(
    (acc, modulo) =>
      acc + modulo.catalogo.filter((item) => modulo.valores[item.key] === true).length,
    0
  )

  return (
    <div className="flex flex-col gap-[var(--space-6)]">
      <PageHeader
        titulo="Permissões granulares"
        subtitulo="Defina o que este servidor pode fazer em cada módulo ativo do município."
        breadcrumbs={[
          { label: 'Configurações', href: '/configuracoes' },
          { label: 'Servidores', href: '/configuracoes/servidores' },
          { label: 'Permissões' },
        ]}
        acoes={
          <Button asChild variant="secondary" className="min-h-0">
            <Link href="/configuracoes/servidores">
              <ArrowLeft className="size-4" aria-hidden="true" />
              Voltar
            </Link>
          </Button>
        }
      />

      <div className="flex max-w-3xl flex-col gap-[var(--space-5)]">
        <Card bodyClassName="flex flex-col gap-[var(--space-4)] sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-[var(--space-3)]">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary-light)] text-[var(--color-primary)]">
              <Shield className="size-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-[length:var(--text-base)] font-semibold text-[var(--color-text)]">
                {servidor.name}
              </p>
              <div className="mt-[var(--space-2)] flex flex-wrap items-center gap-[var(--space-2)]">
                <Badge variant="blue">{roleLabel(servidor.role)}</Badge>
                <Badge variant={servidor.active ? 'green' : 'gray'}>
                  {servidor.active ? 'Ativo' : 'Inativo'}
                </Badge>
                {modulos.length > 0 ? (
                  <Badge variant="gray">
                    {totalAtivas}/{totalPermissoes} permissões ativas
                  </Badge>
                ) : null}
              </div>
            </div>
          </div>
          <Button asChild variant="secondary" className="min-h-0 shrink-0 self-start sm:self-center">
            <Link href={`/configuracoes/servidores/${servidor.id}`}>Editar cadastro</Link>
          </Button>
        </Card>

        <Alert variant="info" titulo="Como funciona">
          <ul className="list-disc space-y-[var(--space-1)] pl-[var(--space-4)]">
            <li>
              O <strong>papel</strong> ({roleLabel(servidor.role)}) define o teto: só aparecem
              permissões compatíveis com esse papel.
            </li>
            <li>
              Marque apenas as ações que este servidor deve executar no dia a dia — princípio do
              menor privilégio.
            </li>
            <li>
              As alterações entram em vigor no <strong>próximo login</strong> do servidor.
            </li>
            <li>Salve cada módulo separadamente após concluir os ajustes.</li>
          </ul>
        </Alert>

        {!servidor.active ? (
          <Alert variant="warning" titulo="Servidor inativo">
            Reative o cadastro em Servidores antes de alterar permissões.
          </Alert>
        ) : null}

        {modulos.length === 0 ? (
          <Card bodyClassName="flex flex-col items-center gap-[var(--space-3)] py-[var(--space-8)] text-center">
            <KeyRound className="size-8 text-[var(--color-text-muted)]" aria-hidden="true" />
            <p className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
              Nenhum módulo ativo com catálogo de permissões para o papel{' '}
              <strong>{roleLabel(servidor.role)}</strong>.
            </p>
            <Button asChild variant="secondary">
              <Link href="/configuracoes/servidores">Voltar para servidores</Link>
            </Button>
          </Card>
        ) : (
          modulos.map((grupo) => (
            <PermissoesModuloCard
              key={grupo.moduloChave}
              servidorId={servidor.id}
              grupo={grupo}
              disabled={!servidor.active}
            />
          ))
        )}
      </div>
    </div>
  )
}
