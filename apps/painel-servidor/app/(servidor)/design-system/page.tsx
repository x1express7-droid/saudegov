import { PageHeader } from '@saude/ui'
import { DesignSystemCatalog } from './components/design-system-catalog'

export default function DesignSystemPage() {
  return (
    <>
      <PageHeader
        titulo="Design System"
        subtitulo="Catálogo de componentes — Sprint 0.5"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Design System' },
        ]}
      />
      <DesignSystemCatalog />
    </>
  )
}
