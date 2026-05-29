import { getPrismaAdmin } from '../../src/admin-client'
import { SPRINT_31_TFD_PLATFORM_FEATURES } from './sprint-3-1-platform-features'
import { SPRINT_32_TFD_PLATFORM_FEATURES } from './sprint-3-2-platform-features'
import { SPRINT_33_TFD_PLATFORM_FEATURES } from './sprint-3-3-platform-features'
import { SPRINT_34_TFD_PLATFORM_FEATURES } from './sprint-3-4-platform-features'
import { SPRINT_35_TFD_PLATFORM_FEATURES } from './sprint-3-5-platform-features'
import { SPRINT_36_TFD_PLATFORM_FEATURES } from './sprint-3-6-platform-features'

const SPRINTS_FASE_3 = [
  { sprint: '3.1', features: SPRINT_31_TFD_PLATFORM_FEATURES },
  { sprint: '3.2', features: SPRINT_32_TFD_PLATFORM_FEATURES },
  { sprint: '3.3', features: SPRINT_33_TFD_PLATFORM_FEATURES },
  { sprint: '3.4', features: SPRINT_34_TFD_PLATFORM_FEATURES },
  { sprint: '3.5', features: SPRINT_35_TFD_PLATFORM_FEATURES },
  { sprint: '3.6', features: SPRINT_36_TFD_PLATFORM_FEATURES },
] as const

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message)
  }
}

async function main(): Promise<void> {
  const db = getPrismaAdmin()

  console.log('--- Verificação platform_features Fase 3 (sprints 3.1–3.6) ---\n')

  for (const grupo of SPRINTS_FASE_3) {
    const esperadas = grupo.features.map((feature) => feature.funcionalidade)

    const existentes = await db.platformFeature.findMany({
      where: {
        sistema: 'saude',
        modulo: 'tfd',
        sprint: grupo.sprint,
        funcionalidade: { in: [...esperadas] },
      },
      select: {
        funcionalidade: true,
        status: true,
        painel_servidor: true,
      },
      orderBy: { funcionalidade: 'asc' },
    })

    console.log(`Sprint ${grupo.sprint}: ${existentes.length}/${esperadas.length} features`)

    assert(
      existentes.length === esperadas.length,
      `Sprint ${grupo.sprint}: esperadas ${esperadas.length} platform_features; encontradas ${existentes.length}.`
    )

    for (const row of existentes) {
      assert(row.status === 'ativo', `Feature ${row.funcionalidade} (sprint ${grupo.sprint}) deve estar ativa.`)
    }

    const faltando = esperadas.filter(
      (nome) => !existentes.some((row) => row.funcionalidade === nome)
    )

    if (faltando.length > 0) {
      throw new Error(`Sprint ${grupo.sprint} incompleta. Faltando: ${faltando.join(', ')}`)
    }
  }

  await db.tfdViagemLegado.findFirst({ select: { deprecated_at: true } })
  console.log('\n✓ TfdViagem.deprecated_at — coluna acessível no Prisma')

  await db.tfdProcessoDadosClinicos.findFirst({ select: { id: true } })
  console.log('✓ TfdProcessoDadosClinicos — delegate acessível')

  await db.tfdAgendamento.findFirst({ select: { id: true } })
  console.log('✓ TfdAgendamento — delegate acessível')

  await db.tfdTransporte.findFirst({ select: { id: true } })
  console.log('✓ TfdTransporte — delegate acessível')

  await db.tfdTransporteAnexo.findFirst({ select: { id: true } })
  console.log('✓ TfdTransporteAnexo — delegate acessível')

  await db.tfdFilaMovimentacao.findFirst({ select: { id: true } })
  console.log('✓ TfdFilaMovimentacao — delegate acessível')

  console.log('\n✅ Verificação Sprint 3 completa (3.1–3.6) concluída com sucesso.')
}

main()
  .catch((error: unknown) => {
    console.error('❌ Verificação Fase 3 falhou:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await getPrismaAdmin().$disconnect()
  })
