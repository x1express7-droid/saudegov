import { PageHeader } from '@saude/ui'
import { getSetoresParaServidorForm } from '../../../../../lib/queries/get-setores-para-servidor-form'
import { ServidorForm } from '../components/servidor-form'

export default async function NovoServidorPage() {
  const setoresOpcoes = await getSetoresParaServidorForm()

  return (
    <div className="flex flex-col gap-[var(--space-6)]">
      <PageHeader
        titulo="Novo servidor"
        subtitulo="Papel Gestor ou Servidor. A senha temporária será exibida uma única vez após o cadastro."
      />
      <ServidorForm mode="create" setoresOpcoes={setoresOpcoes} />
    </div>
  )
}
