import { assertModuleActive, maskCPF, requireTenantRole } from '@saude/core-auth/server'
import { getPrismaForTenant } from '@saude/core-db'

import type { ProcessoTfdDetalheOutput } from '../types/tfd.types'
import { formatHoraConsulta } from '../utils/agendamento-novo'

export type { ProcessoTfdDetalheOutput } from '../types/tfd.types'

const MODULO_TFD = 'saude.tfd'

function maskCns(cns: string): string {
  if (cns.length < 7) {
    return '***'
  }
  return `${cns.slice(0, 3)}•••••••••••${cns.slice(-4)}`
}

function assertProcessoAcessivelSetor(
  role: string,
  setorId: string | null | undefined,
  processoSetorId: string | null
): boolean {
  if (role !== 'SERVIDOR') {
    return true
  }
  if (!setorId) {
    return false
  }
  return processoSetorId === setorId
}

export async function getProcessoTfdDetalhe(
  processoId: string
): Promise<ProcessoTfdDetalheOutput | null> {
  await assertModuleActive('saude', 'tfd')
  const session = await requireTenantRole('SERVIDOR')
  const tenantId = session.user.tenantId!

  const db = await getPrismaForTenant(tenantId)

  const processo = await db.processo.findFirst({
    where: {
      id: processoId,
      tenant_id: tenantId,
      modulo: MODULO_TFD,
    },
    select: {
      id: true,
      protocolo: true,
      status: true,
      titulo: true,
      setor_id: true,
      paciente: {
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
      },
      tfd_dados_clinicos: {
        select: {
          subjetivo: true,
          objetivo: true,
          avaliacao: true,
          plano: true,
          motivo_quadro: true,
          observacao: true,
          updated_at: true,
          registrado_por: {
            select: { name: true },
          },
        },
      },
      tfd_solicitacoes: {
        orderBy: { created_at: 'desc' },
        select: {
          id: true,
          protocolo: true,
          status: true,
          urgencia: true,
          tipo_atendimento: true,
          created_at: true,
          especialidade: { select: { nome: true } },
          prestador: { select: { nome: true } },
        },
      },
      tfd_agendamentos: {
        orderBy: [{ sequencia: 'asc' }, { created_at: 'asc' }],
        select: {
          id: true,
          protocolo: true,
          sequencia: true,
          data_consulta: true,
          hora_consulta: true,
          status: true,
          prestador: { select: { nome: true } },
        },
      },
      tramitacoes: {
        orderBy: { created_at: 'desc' },
        take: 20,
        select: {
          tipo: true,
          descricao: true,
          created_at: true,
          usuario: { select: { name: true } },
        },
      },
      anexos: {
        where: { confirmado: true },
        orderBy: { created_at: 'desc' },
        select: {
          id: true,
          nome_original: true,
          mime_type: true,
          created_at: true,
          uploader_id: true,
        },
      },
    },
  })

  if (!processo) {
    return null
  }

  if (!assertProcessoAcessivelSetor(session.user.role, session.user.setorId, processo.setor_id)) {
    return null
  }

  const dadosClinicosRow = processo.tfd_dados_clinicos

  return {
    id: processo.id,
    protocolo: processo.protocolo,
    status: processo.status,
    titulo: processo.titulo,
    paciente: processo.paciente
      ? {
          id: processo.paciente.id,
          nome: processo.paciente.nome,
          nomeSocial: processo.paciente.nome_social,
          cpfMascarado: processo.paciente.cpf ? maskCPF(processo.paciente.cpf) : null,
          cnsMascarado: processo.paciente.cns ? maskCns(processo.paciente.cns) : null,
          dataNascimento: processo.paciente.data_nascimento
            ? processo.paciente.data_nascimento.toISOString().slice(0, 10)
            : null,
          sexo: processo.paciente.sexo,
          email: processo.paciente.email,
          telefone: processo.paciente.telefone,
          telefoneCelular: processo.paciente.telefone_celular,
          telefoneAlternativo: processo.paciente.telefone_alternativo,
          racaCor: processo.paciente.raca_cor,
          nacionalidade: processo.paciente.nacionalidade,
          identidadeGenero: processo.paciente.identidade_genero,
          responsavelLegalNome: processo.paciente.responsavel_legal_nome,
          responsavelLegalCpfMascarado: processo.paciente.responsavel_legal_cpf
            ? maskCPF(processo.paciente.responsavel_legal_cpf)
            : null,
          municipio: processo.paciente.municipio,
          uf: processo.paciente.uf,
          ativo: processo.paciente.ativo,
        }
      : null,
    dadosClinicos: {
      subjetivo: dadosClinicosRow?.subjetivo ?? null,
      objetivo: dadosClinicosRow?.objetivo ?? null,
      avaliacao: dadosClinicosRow?.avaliacao ?? null,
      plano: dadosClinicosRow?.plano ?? null,
      motivoQuadro: dadosClinicosRow?.motivo_quadro ?? null,
      observacao: dadosClinicosRow?.observacao ?? null,
      registradoPorNome: dadosClinicosRow?.registrado_por?.name ?? null,
      updatedAt: dadosClinicosRow?.updated_at.toISOString() ?? null,
    },
    solicitacoes: processo.tfd_solicitacoes.map((row) => ({
      id: row.id,
      protocolo: row.protocolo,
      status: row.status,
      urgencia: row.urgencia,
      tipoAtendimento: row.tipo_atendimento,
      especialidade: row.especialidade?.nome ?? null,
      prestador: row.prestador?.nome ?? null,
      createdAt: row.created_at.toISOString(),
    })),
    agendamentos: processo.tfd_agendamentos.map((row) => ({
      id: row.id,
      protocolo: row.protocolo,
      sequencia: row.sequencia,
      dataConsulta: row.data_consulta.toISOString().slice(0, 10),
      horaConsulta: formatHoraConsulta(row.hora_consulta),
      status: row.status,
      prestador: row.prestador?.nome ?? null,
    })),
    tramitacoes: processo.tramitacoes.map((row) => ({
      tipo: row.tipo,
      descricao: row.descricao,
      usuarioNome: row.usuario?.name ?? null,
      createdAt: row.created_at.toISOString(),
    })),
    anexos: processo.anexos.map((row) => ({
      id: row.id,
      nomeOriginal: row.nome_original,
      mimeType: row.mime_type,
      createdAt: row.created_at.toISOString(),
      uploaderId: row.uploader_id,
    })),
  }
}
