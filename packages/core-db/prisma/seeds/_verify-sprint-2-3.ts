import { getPrismaAdmin } from '../../src/admin-client'

const FUNCIONALIDADES_SPRINT_23 = [
  'estornar_movimentacao_saldo',
  'cancelar_pendente_60_dias',
  'job_transicao_em_viagem',
  'validacao_vedacoes_decisao',
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
      sprint: '2.3',
      funcionalidade: { in: [...FUNCIONALIDADES_SPRINT_23] },
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

  console.log('--- platform_features sprint = 2.3 ---')
  assert(
    features.length === FUNCIONALIDADES_SPRINT_23.length,
    `Esperadas ${FUNCIONALIDADES_SPRINT_23.length} platform_features Sprint 2.3; encontradas ${features.length}.`
  )

  for (const row of features) {
    console.log(
      `${row.funcionalidade}\tdev=${row.painel_dev}\tservidor=${row.painel_servidor}\tstatus=${row.status}\t${row.sprint}`
    )
    assert(row.status === 'ativo', `Feature ${row.funcionalidade} deve estar ativa.`)
  }

  const faltando = FUNCIONALIDADES_SPRINT_23.filter(
    (nome) => !features.some((row) => row.funcionalidade === nome)
  )
  assert(faltando.length === 0, `Features ausentes: ${faltando.join(', ')}`)

  await db.tfdProcedimento.findFirst({
    select: { eh_pab: true },
  })
  console.log('✓ TfdProcedimento.eh_pab — coluna acessível')

  await db.tfdSolicitacao.findFirst({
    select: {
      distancia_km: true,
      tratamento_experimental: true,
      regiao_metropolitana: true,
      paciente_hospitalizado_destino: true,
      vedacoes_confirmadas_por_id: true,
      vedacoes_confirmadas_at: true,
    },
  })
  console.log('✓ TfdSolicitacao — campos de vedação acessíveis')

  await db.tfdViagem.findFirst({
    select: { em_viagem_transicionado_at: true },
  })
  console.log('✓ TfdViagem.em_viagem_transicionado_at — coluna acessível')

  await db.tfdMovimentacaoSaldo.findFirst({
    select: { movimentacao_origem_id: true },
  })
  console.log('✓ TfdMovimentacaoSaldo.movimentacao_origem_id — coluna acessível')

  console.log('\n✅ Verificação Sprint 2.3 concluída com sucesso.')
}

main()
  .catch((error: unknown) => {
    console.error('❌ Verificação Sprint 2.3 falhou:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await getPrismaAdmin().$disconnect()
  })
