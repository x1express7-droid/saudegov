import { assertModuleActive, requireTenantRole } from '@saude/core-auth/server'
import { getPrismaForTenant } from '@saude/core-db'
import type { Sexo } from '@prisma/client'

import type { TfdPacienteAtendimentoDetalhe } from '../types/paciente-atendimento.types'

function formatDateOnly(value: Date | null): string | null {
  if (!value) {
    return null
  }
  return value.toISOString().slice(0, 10)
}

function mapPaciente(row: {
  id: string
  nome: string
  cpf: string | null
  cns: string | null
  data_nascimento: Date | null
  sexo: Sexo | null
  nome_mae: string | null
  municipio_nascimento: string | null
  cep: string | null
  logradouro: string | null
  numero: string | null
  complemento: string | null
  bairro: string | null
  municipio: string | null
  uf: string | null
  email: string | null
  telefone_celular: string | null
  telefone: string | null
  telefone_alternativo: string | null
}): TfdPacienteAtendimentoDetalhe {
  return {
    id: row.id,
    nome: row.nome,
    cpf: row.cpf,
    email: row.email,
    telefoneCelular: row.telefone_celular,
    cns: row.cns,
    dataNascimento: formatDateOnly(row.data_nascimento),
    sexo: row.sexo,
    nomeMae: row.nome_mae,
    municipioNascimento: row.municipio_nascimento,
    cep: row.cep,
    logradouro: row.logradouro,
    numero: row.numero,
    complemento: row.complemento,
    bairro: row.bairro,
    municipio: row.municipio,
    uf: row.uf,
    telefone: row.telefone,
    telefoneAlternativo: row.telefone_alternativo,
  }
}

const pacienteAtendimentoSelect = {
  id: true,
  nome: true,
  cpf: true,
  cns: true,
  data_nascimento: true,
  sexo: true,
  nome_mae: true,
  municipio_nascimento: true,
  cep: true,
  logradouro: true,
  numero: true,
  complemento: true,
  bairro: true,
  municipio: true,
  uf: true,
  email: true,
  telefone_celular: true,
  telefone: true,
  telefone_alternativo: true,
} as const

export async function getPacienteAtendimentoTfd(
  pacienteId: string
): Promise<TfdPacienteAtendimentoDetalhe | null> {
  await assertModuleActive('saude', 'tfd')
  const session = await requireTenantRole('SERVIDOR')
  const tenantId = session.user.tenantId
  if (!tenantId) {
    throw new Error('Tenant não identificado.')
  }

  const db = await getPrismaForTenant(tenantId)

  const row = await db.paciente.findFirst({
    where: {
      id: pacienteId,
      tenant_id: tenantId,
      ativo: true,
    },
    select: pacienteAtendimentoSelect,
  })

  return row ? mapPaciente(row) : null
}
