import { requireSuperAdmin } from '@saude/core-auth/server'
import { getAuditLogs } from '../../../lib/queries/get-audit-logs'
import { AuditLogLista } from './components/audit-log-lista'

interface AuditLogsPageProps {
  searchParams: Promise<{
    tenantId?: string
    entidade?: string
    acao?: string
    dataInicio?: string
    dataFim?: string
    userId?: string
    modulo?: string
    page?: string
  }>
}

function parsePage(value: string | undefined): number {
  const parsed = Number.parseInt(value ?? '1', 10)
  if (Number.isNaN(parsed) || parsed < 1) {
    return 1
  }
  return parsed
}

export default async function AuditLogsPage({ searchParams }: AuditLogsPageProps) {
  await requireSuperAdmin()

  const params = await searchParams
  const page = parsePage(params.page)
  const perPage = 50

  const tenantId = params.tenantId?.trim() || undefined
  const entidade = params.entidade?.trim() || undefined
  const acao = params.acao?.trim() || undefined
  const dataInicio = params.dataInicio?.trim() || undefined
  const dataFim = params.dataFim?.trim() || undefined
  const userId = params.userId?.trim() || undefined
  const modulo = params.modulo?.trim() || undefined

  const { items, total, tenantSlugMap } = await getAuditLogs({
    tenantId,
    entidade,
    acao,
    dataInicio,
    dataFim,
    userId,
    modulo,
    page,
    perPage,
  })

  return (
    <AuditLogLista
      items={items}
      total={total}
      tenantSlugMap={tenantSlugMap}
      filtros={{
        tenantId: tenantId ?? '',
        entidade: entidade ?? '',
        acao: acao ?? '',
        dataInicio: dataInicio ?? '',
        dataFim: dataFim ?? '',
        userId: userId ?? '',
        modulo: modulo ?? '',
        page,
        perPage,
      }}
    />
  )
}
