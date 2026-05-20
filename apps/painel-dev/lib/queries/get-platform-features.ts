import { requireSuperAdmin } from '@saude/core-auth'
import { getPrismaAdmin } from '@saude/core-db'

export interface PlatformFeatureItem {
  id: string
  sistema: string
  modulo: string
  funcionalidade: string
  descricao: string
  painelDev: boolean
  painelServidor: boolean
  permissaoChave: string | null
  status: string
  sprint: string | null
  criadoAt: string
  atualizadoAt: string
}

export interface GetPlatformFeaturesFiltros {
  sistema?: string
  modulo?: string
  status?: string
}

export async function getPlatformFeatures(
  filtros: GetPlatformFeaturesFiltros = {}
): Promise<{ items: PlatformFeatureItem[]; total: number }> {
  await requireSuperAdmin()

  const { sistema, modulo, status } = filtros
  const db = getPrismaAdmin()

  const where = {
    ...(sistema?.trim() ? { sistema: sistema.trim() } : {}),
    ...(modulo?.trim() ? { modulo: modulo.trim() } : {}),
    ...(status?.trim() ? { status: status.trim() } : {}),
  }

  const [rows, total] = await Promise.all([
    db.platformFeature.findMany({
      where,
      select: {
        id: true,
        sistema: true,
        modulo: true,
        funcionalidade: true,
        descricao: true,
        painel_dev: true,
        painel_servidor: true,
        permissao_chave: true,
        status: true,
        sprint: true,
        criado_at: true,
        atualizado_at: true,
      },
      orderBy: [{ sistema: 'asc' }, { modulo: 'asc' }, { funcionalidade: 'asc' }],
    }),
    db.platformFeature.count({ where }),
  ])

  const items: PlatformFeatureItem[] = rows.map((row) => ({
    id: row.id,
    sistema: row.sistema,
    modulo: row.modulo,
    funcionalidade: row.funcionalidade,
    descricao: row.descricao,
    painelDev: row.painel_dev,
    painelServidor: row.painel_servidor,
    permissaoChave: row.permissao_chave,
    status: row.status,
    sprint: row.sprint,
    criadoAt: row.criado_at.toISOString(),
    atualizadoAt: row.atualizado_at.toISOString(),
  }))

  return { items, total }
}
