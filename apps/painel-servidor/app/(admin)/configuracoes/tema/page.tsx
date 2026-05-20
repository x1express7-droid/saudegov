import { PageHeader } from '@saude/ui'
import { getTema } from '../../../../lib/queries/get-tema'
import { TemaView } from './components/tema-view'

export default async function TemaConfigPage() {
  const { theme, valores } = await getTema()

  return (
    <div className="flex flex-col gap-[var(--space-6)]">
      <PageHeader
        titulo="Tema visual"
        subtitulo="Personalize cores e logo exibidos no painel do município."
      />
      <TemaView initialTheme={theme} initialValores={valores} />
    </div>
  )
}
