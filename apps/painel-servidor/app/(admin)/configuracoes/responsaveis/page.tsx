import { PageHeader } from '@saude/ui'
import { getModulosAtivos } from '../../../../lib/queries/get-modulos-ativos'
import { getSetoresParaSelect } from '../../../../lib/queries/get-setores-para-select'
import { getSetoresResponsaveis } from '../../../../lib/queries/get-setores-responsaveis'
import { ResponsaveisView } from './components/responsaveis-view'

export default async function ResponsaveisPage() {
  const [modulos, responsaveis, setoresOpcoes] = await Promise.all([
    getModulosAtivos(),
    getSetoresResponsaveis(),
    getSetoresParaSelect(),
  ])

  return (
    <div className="flex flex-col gap-[var(--space-6)]">
      <PageHeader
        titulo="Setores responsáveis por módulo"
        subtitulo="Defina qual setor recebe as demandas de cada módulo ativo do município."
      />
      <p className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
        Novos módulos são habilitados pela equipe saudegov.
      </p>
      <ResponsaveisView
        modulos={modulos}
        responsaveis={responsaveis}
        setoresOpcoes={setoresOpcoes}
      />
    </div>
  )
}
