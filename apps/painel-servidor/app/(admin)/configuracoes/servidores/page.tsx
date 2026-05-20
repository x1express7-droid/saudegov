import { PageHeader } from '@saude/ui'
import { getServidores } from '../../../../lib/queries/get-servidores'
import { ServidoresList } from './components/servidores-list'

interface ServidoresPageProps {
  searchParams: Promise<{ inativos?: string }>
}

export default async function ServidoresPage({ searchParams }: ServidoresPageProps) {
  const params = await searchParams
  const incluirInativos = params.inativos === '1'
  const servidores = await getServidores({ incluirInativos })

  return (
    <div className="flex flex-col gap-[var(--space-6)]">
      <PageHeader
        titulo="Servidores"
        subtitulo="Cadastre gestores e servidores vinculados aos setores do organograma."
      />
      <p className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
        Dados tratados conforme LGPD. CPF é exibido mascarado na listagem.
      </p>
      <ServidoresList servidores={servidores} incluirInativos={incluirInativos} />
    </div>
  )
}
