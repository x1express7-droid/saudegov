import { notFound } from 'next/navigation'
import { requireSuperAdmin } from '@saude/core-auth'
import { getMunicipio } from '../../../../lib/queries/get-municipio'
import { getSaldosTfdByTenant } from '../../../../lib/queries/tfd-saldos'
import { MunicipioConfiguracoes } from './components/municipio-configuracoes'

interface MunicipioConfigPageProps {
  params: Promise<{ id: string }>
}

export default async function MunicipioConfigPage({ params }: MunicipioConfigPageProps) {
  await requireSuperAdmin()

  const { id } = await params
  const municipio = await getMunicipio(id)

  if (!municipio) {
    notFound()
  }

  const saldosTfd = municipio.modules.saude?.tfd
    ? await getSaldosTfdByTenant(municipio.id)
    : null

  return <MunicipioConfiguracoes municipio={municipio} saldosTfd={saldosTfd} />
}
