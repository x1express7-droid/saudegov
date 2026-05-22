import type { PrismaClient } from '@prisma/client'

/** IDs fixos para upsert idempotente do saldo de exemplo (tenant campograndems). */
export const TFD_SALDO_SEED_IDS = {
  saldo: '11111111-1111-4111-8111-111111110010',
  movimentacaoCredito: '11111111-1111-4111-8111-111111110011',
} as const

function parseCompetenciaDate(value: string): Date {
  return new Date(`${value}T12:00:00.000Z`)
}

/**
 * Saldo financeiro de desenvolvimento — tenant principal (Campo Grande).
 * Replica o padrão de `criarSaldoTfd`: saldo ativo + movimentação CREDITO com mesmo valor e descrição.
 */
export async function seedTfdSaldoExemplo(
  prisma: PrismaClient,
  tenantId: string,
  usuarioId: string
): Promise<void> {
  const year = new Date().getFullYear()
  const descricao = `Saldo TFD — exercício ${year} (seed desenvolvimento)`
  const competenciaInicio = parseCompetenciaDate(`${year}-01-01`)
  const competenciaFim = parseCompetenciaDate(`${year}-12-31`)
  const valorTotal = 50_000

  const saldo = await prisma.tfdSaldo.upsert({
    where: { id: TFD_SALDO_SEED_IDS.saldo },
    update: {
      descricao,
      fonte: 'MUNICIPAL_PROPRIO',
      valor_total: valorTotal,
      competencia_inicio: competenciaInicio,
      competencia_fim: competenciaFim,
      ativo: true,
    },
    create: {
      id: TFD_SALDO_SEED_IDS.saldo,
      tenant_id: tenantId,
      descricao,
      fonte: 'MUNICIPAL_PROPRIO',
      valor_total: valorTotal,
      competencia_inicio: competenciaInicio,
      competencia_fim: competenciaFim,
      ativo: true,
    },
  })

  await prisma.tfdMovimentacaoSaldo.upsert({
    where: { id: TFD_SALDO_SEED_IDS.movimentacaoCredito },
    update: {
      tipo: 'CREDITO',
      valor: valorTotal,
      descricao: saldo.descricao,
      usuario_id: usuarioId,
    },
    create: {
      id: TFD_SALDO_SEED_IDS.movimentacaoCredito,
      tenant_id: tenantId,
      saldo_id: saldo.id,
      tipo: 'CREDITO',
      valor: valorTotal,
      descricao: saldo.descricao,
      usuario_id: usuarioId,
    },
  })
}
