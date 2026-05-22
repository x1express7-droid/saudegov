import { requireSuperAdmin } from '@saude/core-auth/server'
import { getAuditLogs } from '../../../lib/queries/get-audit-logs'
import { AuditLogLista } from './components/audit-log-lista'

interface AuditLogsPageProps {
  searchParams: Promise<{
    tenantId?: string
    entidade?: string
    acao?: string
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

  const { items, total, tenantSlugMap } = await getAuditLogs({
    tenantId: params.tenantId?.trim() || undefined,
    entidade: params.entidade?.trim() || undefined,
    acao: params.acao?.trim() || undefined,
    page,
    perPage,
  })

  return (
    <AuditLogLista
      items={items}
      total={total}
      tenantSlugMap={tenantSlugMap}
      filtros={{
        tenantId: params.tenantId?.trim() ?? '',
        entidade: params.entidade?.trim() ?? '',
        acao: params.acao?.trim() ?? '',
        page,
        perPage,
      }}
    />
  )
}
