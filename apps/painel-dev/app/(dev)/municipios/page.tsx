import { requireSuperAdmin } from '@saude/core-auth'
import { getMunicipios } from '../../../lib/queries/get-municipios'
import { MunicipioLista } from './components/municipio-lista'

interface MunicipiosPageProps {
  searchParams: Promise<{
    busca?: string
    ativo?: string
    page?: string
  }>
}

function parseAtivoFilter(value: string | undefined): boolean | undefined {
  if (value === 'true') {
    return true
  }
  if (value === 'false') {
    return false
  }
  return undefined
}

function parsePage(value: string | undefined): number {
  const parsed = Number.parseInt(value ?? '1', 10)
  if (Number.isNaN(parsed) || parsed < 1) {
    return 1
  }
  return parsed
}

export default async function MunicipiosPage({ searchParams }: MunicipiosPageProps) {
  await requireSuperAdmin()

  const params = await searchParams
  const page = parsePage(params.page)
  const ativo = parseAtivoFilter(params.ativo)
  const busca = params.busca?.trim() || undefined
  const perPage = 20

  const { items, total } = await getMunicipios({
    busca,
    ativo,
    page,
    perPage,
  })

  const ativoFiltro =
    params.ativo === 'true' ? 'ativo' : params.ativo === 'false' ? 'suspenso' : 'todos'

  return (
    <MunicipioLista
      items={items}
      total={total}
      filtros={{
        busca: busca ?? '',
        ativo: ativoFiltro,
        page,
        perPage,
      }}
    />
  )
}
