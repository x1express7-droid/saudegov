import { PageHeader } from '@saude/ui'
import { getServidor } from '../../../../../lib/queries/get-servidor'
import { getSetoresParaServidorForm } from '../../../../../lib/queries/get-setores-para-servidor-form'
import { ServidorForm } from '../components/servidor-form'

interface EditarServidorPageProps {
  params: Promise<{ id: string }>
}

export default async function EditarServidorPage({ params }: EditarServidorPageProps) {
  const { id } = await params
  const [servidor, setoresOpcoes] = await Promise.all([
    getServidor(id),
    getSetoresParaServidorForm(),
  ])

  return (
    <div className="flex flex-col gap-[var(--space-6)]">
      <PageHeader
        titulo="Editar servidor"
        subtitulo={servidor.name}
      />
      {servidor.active && servidor.role !== 'ADMIN' ? (
        <p className="text-[length:var(--text-sm)]">
          <a
            href={`/configuracoes/servidores/${servidor.id}/permissoes`}
            className="text-[var(--color-primary)] hover:underline"
          >
            Gerenciar permissões granulares
          </a>
        </p>
      ) : null}
      <ServidorForm mode="edit" servidor={servidor} setoresOpcoes={setoresOpcoes} />
    </div>
  )
}
