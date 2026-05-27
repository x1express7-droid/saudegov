import type { PrismaClient } from '@prisma/client'

/** IDs fixos para upsert idempotente do catálogo TFD (tenant campograndems). */
export const TFD_CATALOGO_SEED_IDS = {
  especialidadeCardiologia: '11111111-1111-4111-8111-111111110020',
  procedimentoConsulta: '11111111-1111-4111-8111-111111110021',
  prestadorHospital: '11111111-1111-4111-8111-111111110022',
} as const

/**
 * Catálogo mínimo de desenvolvimento — especialidade, procedimento e prestador
 * para testar nova solicitação TFD sem cadastro manual.
 */
export async function seedTfdCatalogoExemplo(
  prisma: PrismaClient,
  tenantId: string
): Promise<void> {
  const especialidade = await prisma.tfdEspecialidade.upsert({
    where: { id: TFD_CATALOGO_SEED_IDS.especialidadeCardiologia },
    update: {
      nome: 'Cardiologia',
      ativa: true,
    },
    create: {
      id: TFD_CATALOGO_SEED_IDS.especialidadeCardiologia,
      tenant_id: tenantId,
      nome: 'Cardiologia',
      ativa: true,
    },
  })

  await prisma.tfdProcedimento.upsert({
    where: { id: TFD_CATALOGO_SEED_IDS.procedimentoConsulta },
    update: {
      nome: 'Consulta em cardiologia',
      codigo_sigtap: '0301010072',
      eh_pab: false,
      ativo: true,
      especialidade_id: especialidade.id,
    },
    create: {
      id: TFD_CATALOGO_SEED_IDS.procedimentoConsulta,
      tenant_id: tenantId,
      especialidade_id: especialidade.id,
      nome: 'Consulta em cardiologia',
      codigo_sigtap: '0301010072',
      eh_pab: false,
      ativo: true,
    },
  })

  await prisma.tfdPrestador.upsert({
    where: { id: TFD_CATALOGO_SEED_IDS.prestadorHospital },
    update: {
      nome: 'Hospital Universitário — São Paulo',
      cidade: 'São Paulo',
      estado: 'SP',
      cnes: '1234567',
      telefone: '1133334444',
      especialidades: [especialidade.id],
      ativo: true,
    },
    create: {
      id: TFD_CATALOGO_SEED_IDS.prestadorHospital,
      tenant_id: tenantId,
      nome: 'Hospital Universitário — São Paulo',
      cidade: 'São Paulo',
      estado: 'SP',
      cnes: '1234567',
      telefone: '1133334444',
      especialidades: [especialidade.id],
      ativo: true,
    },
  })
}
