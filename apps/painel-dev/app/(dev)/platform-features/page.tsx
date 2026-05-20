import { requireSuperAdmin } from '@saude/core-auth'
import { getPlatformFeatures } from '../../../lib/queries/get-platform-features'
import { PlatformFeatureLista } from './components/platform-feature-lista'

interface PlatformFeaturesPageProps {
  searchParams: Promise<{
    sistema?: string
    modulo?: string
    status?: string
  }>
}

export default async function PlatformFeaturesPage({ searchParams }: PlatformFeaturesPageProps) {
  await requireSuperAdmin()

  const params = await searchParams

  const { items, total } = await getPlatformFeatures({
    sistema: params.sistema?.trim() || undefined,
    modulo: params.modulo?.trim() || undefined,
    status: params.status?.trim() || undefined,
  })

  return (
    <PlatformFeatureLista
      items={items}
      total={total}
      filtros={{
        sistema: params.sistema?.trim() ?? '',
        modulo: params.modulo?.trim() ?? '',
        status: params.status?.trim() ?? '',
      }}
    />
  )
}
