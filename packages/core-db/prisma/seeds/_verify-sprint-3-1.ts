import { getPrismaAdmin } from '../../src/admin-client'

const FUNCIONALIDADES_SPRINT_31 = [
  'schema_tfd_dados_clinicos',
  'schema_tfd_fila_movimentacoes',
  'registrar_dados_clinicos',
  'perfil_paciente_tfd',
  'mover_paciente_fila',
  'posicao_fila_solicitacao',
] as const

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message)
  }
}

async function main(): Promise<void> {
  const db = getPrismaAdmin()

  const features = await db.platformFeature.findMany({
    where: {
      sistema: 'saude',
      modulo: 'tfd',
      sprint: '3.1',
      funcionalidade: { in: [...FUNCIONALIDADES_SPRINT_31] },
    },
    select: {
      funcionalidade: true,
      painel_dev: true,
      painel_servidor: true,
      sprint: true,
      status: true,
    },
    orderBy: { funcionalidade: 'asc' },
  })

  console.log('--- platform_features sprint = 3.1 ---')
  assert(
    features.length === FUNCIONALIDADES_SPRINT_31.length,
    `Esperadas ${FUNCIONALIDADES_SPRINT_31.length} platform_features Sprint 3.1; encontradas ${features.length}.`
  )

  for (const row of features) {
    console.log(
      `${row.funcionalidade}\tdev=${row.painel_dev}\tservidor=${row.painel_servidor}\tstatus=${row.status}\t${row.sprint}`
    )
    assert(row.status === 'ativo', `Feature ${row.funcionalidade} deve estar ativa.`)
  }

  await db.tfdProcessoDadosClinicos.findFirst({
    select: { id: true },
  })
  console.log('✓ TfdProcessoDadosClinicos — delegate acessível')

  await db.tfdFilaMovimentacao.findFirst({
    select: { tipo_movimentacao: true },
  })
  console.log('✓ TfdFilaMovimentacao — delegate acessível')

  await db.tfdSolicitacao.findFirst({
    select: { posicao_fila: true, modalidade_tfd: true },
  })
  console.log('✓ TfdSolicitacao — campos de fila/modalidade acessíveis')

  await db.processo.findFirst({
    select: { paciente_id: true },
  })
  console.log('✓ Processo.paciente_id — coluna acessível')

  await db.paciente.findFirst({
    select: { nome_social: true, raca_cor: true },
  })
  console.log('✓ Paciente — campos Sprint 3.1 acessíveis')

  console.log('\n✅ Verificação Sprint 3.1 concluída com sucesso.')
}

main()
  .catch((error: unknown) => {
    console.error('❌ Verificação Sprint 3.1 falhou:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await getPrismaAdmin().$disconnect()
  })
