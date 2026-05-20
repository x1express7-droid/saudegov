import { PageHeader } from '@saude/ui'
import { getDepartamentos } from '../../../../lib/queries/get-departamentos'
import { getSecretariaSaude } from '../../../../lib/queries/get-secretaria-saude'
import { getSetores } from '../../../../lib/queries/get-setores'
import { OrganogramaView } from './components/organograma-view'

export default async function OrganogramaPage() {
  const [secretaria, departamentos, setores] = await Promise.all([
    getSecretariaSaude(),
    getDepartamentos(),
    getSetores(),
  ])

  return (
    <div className="flex flex-col gap-[var(--space-6)]">
      <PageHeader
        titulo="Organograma"
        subtitulo="Configure departamentos e setores da Secretaria Municipal de Saúde."
      />
      <OrganogramaView
        secretaria={secretaria}
        departamentos={departamentos}
        setores={setores}
      />
    </div>
  )
}
