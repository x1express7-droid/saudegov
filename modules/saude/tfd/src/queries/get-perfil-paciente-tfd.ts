import { assertModuleActive, maskCPF, requirePermission, requireTenantRole } from '@saude/core-auth/server'
import { getPrismaForTenant } from '@saude/core-db'

import { TFD_PERMISSIONS } from '../permissions'
import type {
  TfdPacienteAgendamentoResumoItem,
  TfdPacientePerfilOutput,
  TfdPacienteProcessoListItem,
} from '../types/tfd.types'

const MODULO_TFD = 'saude.tfd'
const MAX_PROCESSOS = 50
const MAX_AGENDAMENTOS = 50

function maskCns(cns: string): string {
  if (cns.length < 7) {
    return '***'
  }
  return `${cns.slice(0, 3)}•••••••••••${cns.slice(-4)}`
}

function formatDateOnly(date: Date | null): string | null {
  if (!date) {
    return null
  }
  return date.toISOString().slice(0, 10)
}

export async function getPerfilPacienteTfd(
  pacienteId: string
): Promise<TfdPacientePerfilOutput | null> {
  await assertModuleActive('saude', 'tfd')
  const session = await requireTenantRole('SERVIDOR')
  await requirePermission(session, TFD_PERMISSIONS.VER_PERFIL_PACIENTE)

  const tenantId = session.user.tenantId!
  const db = await getPrismaForTenant(tenantId)

  const paciente = await db.paciente.findFirst({
    where: {
      id: pacienteId,
      tenant_id: tenantId,
    },
    select: {
      id: true,
      nome: true,
      nome_social: true,
      cpf: true,
      cns: true,
      data_nascimento: true,
      sexo: true,
      email: true,
      telefone: true,
      telefone_celular: true,
      telefone_alternativo: true,
      raca_cor: true,
      nacionalidade: true,
      identidade_genero: true,
      responsavel_legal_nome: true,
      responsavel_legal_cpf: true,
      municipio: true,
      uf: true,
      ativo: true,
    },
  })

  if (!paciente) {
    return null
  }

  const [processosRows, processosTotal, agendamentosRows, agendamentosTotal] =
    await Promise.all([
      db.tfdSolicitacao.findMany({
        where: {
          tenant_id: tenantId,
          paciente_id: pacienteId,
        },
        orderBy: [{ created_at: 'desc' }],
        take: MAX_PROCESSOS,
        select: {
          id: true,
          status: true,
          posicao_fila: true,
          created_at: true,
          updated_at: true,
          processo: {
            select: {
              id: true,
              protocolo: true,
              status: true,
            },
          },
          especialidade: {
            select: { nome: true },
          },
          prestador: {
            select: {
              nome: true,
              cidade: true,
              estado: true,
            },
          },
        },
      }),
      db.tfdSolicitacao.count({
        where: {
          tenant_id: tenantId,
          paciente_id: pacienteId,
        },
      }),
      db.tfdViagemLegado.findMany({
        where: {
          tenant_id: tenantId,
          solicitacao: {
            paciente_id: pacienteId,
          },
        },
        orderBy: [{ data_viagem: 'desc' }, { sequencia: 'desc' }],
        take: MAX_AGENDAMENTOS,
        select: {
          id: true,
          data_viagem: true,
          status: true,
          sequencia: true,
          solicitacao: {
            select: {
              id: true,
              processo: {
                select: { protocolo: true },
              },
              prestador: {
                select: { nome: true },
              },
            },
          },
        },
      }),
      db.tfdViagemLegado.count({
        where: {
          tenant_id: tenantId,
          solicitacao: {
            paciente_id: pacienteId,
          },
        },
      }),
    ])

  const processos: TfdPacienteProcessoListItem[] = processosRows.map((row) => ({
    processoId: row.processo.id,
    solicitacaoId: row.id,
    protocolo: row.processo.protocolo,
    statusSolicitacao: row.status,
    statusProcesso: row.processo.status,
    especialidadeNome: row.especialidade?.nome ?? null,
    prestadorNome: row.prestador?.nome ?? null,
    prestadorCidade: row.prestador?.cidade ?? null,
    prestadorEstado: row.prestador?.estado ?? null,
    posicaoFila: row.posicao_fila,
    criadoEm: row.created_at.toISOString(),
    atualizadoEm: row.updated_at.toISOString(),
  }))

  const agendamentos: TfdPacienteAgendamentoResumoItem[] = agendamentosRows.map(
    (row) => ({
      viagemId: row.id,
      protocolo: row.solicitacao.processo.protocolo,
      dataViagem: formatDateOnly(row.data_viagem) ?? '',
      statusViagem: row.status,
      prestadorNome: row.solicitacao.prestador?.nome ?? null,
      solicitacaoId: row.solicitacao.id,
    })
  )

  return {
    cadastro: {
      id: paciente.id,
      nome: paciente.nome,
      nomeSocial: paciente.nome_social,
      cpfMascarado: paciente.cpf ? maskCPF(paciente.cpf) : null,
      cnsMascarado: paciente.cns ? maskCns(paciente.cns) : null,
      dataNascimento: formatDateOnly(paciente.data_nascimento),
      sexo: paciente.sexo,
      email: paciente.email,
      telefone: paciente.telefone,
      telefoneCelular: paciente.telefone_celular,
      telefoneAlternativo: paciente.telefone_alternativo,
      racaCor: paciente.raca_cor,
      nacionalidade: paciente.nacionalidade,
      identidadeGenero: paciente.identidade_genero,
      responsavelLegalNome: paciente.responsavel_legal_nome,
      responsavelLegalCpfMascarado: paciente.responsavel_legal_cpf
        ? maskCPF(paciente.responsavel_legal_cpf)
        : null,
      municipio: paciente.municipio,
      uf: paciente.uf,
      ativo: paciente.ativo,
    },
    processos,
    processosTotal,
    agendamentos,
    agendamentosTotal,
  }
}
