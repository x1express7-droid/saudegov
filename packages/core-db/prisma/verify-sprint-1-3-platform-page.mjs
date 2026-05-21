import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const rows = await prisma.platformFeature.findMany({
  where: { modulo: 'tfd', funcionalidade: { in: ['buscar_paciente_cns', 'vincular_paciente', 'validar_divergencia_cpf_cns'] } },
  select: { funcionalidade: true, sprint: true, status: true, painel_dev: true, painel_servidor: true },
  orderBy: { funcionalidade: 'asc' },
})

console.log('platform-features page (filtro modulo=tfd) — registros Sprint 1.3:')
console.log(JSON.stringify(rows, null, 2))

await prisma.$disconnect()
