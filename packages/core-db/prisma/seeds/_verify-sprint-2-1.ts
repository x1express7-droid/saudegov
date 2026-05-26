import { getPrismaAdmin } from '../../src/admin-client'

async function main(): Promise<void> {
  const db = getPrismaAdmin()

  const sprint21 = await db.platformFeature.findMany({
    where: { sprint: '2.1' },
    select: {
      funcionalidade: true,
      painel_dev: true,
      painel_servidor: true,
      sprint: true,
    },
    orderBy: { funcionalidade: 'asc' },
  })

  console.log('--- sprint = 2.1 ---')
  for (const row of sprint21) {
    console.log(
      `${row.funcionalidade}\tdev=${row.painel_dev}\tservidor=${row.painel_servidor}\t${row.sprint}`
    )
  }

  const sprint18 = await db.platformFeature.findMany({
    where: {
      funcionalidade: { in: ['relatorio_competencia', 'relatorio_paciente'] },
    },
    select: {
      funcionalidade: true,
      painel_dev: true,
      painel_servidor: true,
      sprint: true,
    },
    orderBy: { funcionalidade: 'asc' },
  })

  console.log('--- relatorios 1.8 (paridade) ---')
  for (const row of sprint18) {
    console.log(
      `${row.funcionalidade}\tdev=${row.painel_dev}\tservidor=${row.painel_servidor}\t${row.sprint}`
    )
  }
}

main()
  .catch((error: unknown) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await getPrismaAdmin().$disconnect()
  })
