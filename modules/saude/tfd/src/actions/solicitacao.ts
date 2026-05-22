'use server'

import { revalidatePath } from 'next/cache'
import {
  assertModuleActive,
  requirePermission,
  requireTenantRole,
  type UserRole,
} from '@saude/core-auth/server'
import { getPrismaForTenant } from '@saude/core-db'
import {
  createAuditLog,
  gerarProtocolo,
  registrarTramitacao,
  type PrismaTransactionClient,
} from '@saude/core-documents'
import { dispararNotificacao, NOTIFICATION_EVENTS } from '@saude/core-notifications'
import type { ActionResponse } from '@saude/validators'

import { TFD_PERMISSIONS } from '../permissions'
import type { AbrirSolicitacaoOutput, EnviarSolicitacaoOutput } from '../types/tfd.types'
import { cpfsAcompanhanteEDiferenteDoPaciente } from '../validators/cpf-acompanhante'
import {
  abrirSolicitacaoSchema,
  enviarSolicitacaoSchema,
} from '../validators/solicitacao.schema'

const MODULO_TFD = 'saude.tfd'

const STATUS_SOLICITACAO_LABEL: Record<string, string> = {
  RASCUNHO: 'Rascunho',
  ENVIADO: 'Enviado',
  EM_ANALISE: 'Em análise',
  PENDENTE: 'Pendente',
  APROVADO: 'Aprovado',
  NEGADO: 'Negado',
  AGENDADO: 'Agendado',
  EM_VIAGEM: 'Em viagem',
  AGUARDANDO_PC: 'Aguardando prestação de contas',
  PC_EM_ANALISE: 'Prestação em análise',
  CONCLUIDO: 'Concluído',
  CANCELADO: 'Cancelado',
}

function podeEnviarSolicitacao(
  role: UserRole,
  userId: string,
  solicitanteId: string
): boolean {
  if (role === 'ADMIN' || role === 'GESTOR' || role === 'SUPERADMIN') {
    return true
  }
  return userId === solicitanteId
}

class SolicitacaoBusinessError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SolicitacaoBusinessError'
  }
}

function parsePrestadorEspecialidades(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }
  return value.filter((item): item is string => typeof item === 'string')
}

async function validarReferenciasAbertura(
  tx: PrismaTransactionClient,
  tenantId: string,
  data: {
    pacienteId: string
    especialidadeId: string
    prestadorId: string
    procedimentos: string[]
    tipoAtendimento: 'CONSULTA' | 'RETORNO' | 'EXAME' | 'CIRURGIA'
    solicitacaoOrigemId?: string
    laudoAnexoId?: string
    acompanhanteNecessario: boolean
    acompanhante?: {
      cpf: string
    }
  }
): Promise<{ especialidadeNome: string }> {
  const paciente = await tx.paciente.findFirst({
    where: {
      id: data.pacienteId,
      tenant_id: tenantId,
      ativo: true,
    },
    select: {
      id: true,
      cpf: true,
    },
  })

  if (!paciente) {
    throw new SolicitacaoBusinessError('Paciente não encontrado.')
  }

  if (data.acompanhanteNecessario && data.acompanhante) {
    if (!paciente.cpf) {
      throw new SolicitacaoBusinessError(
        'Paciente sem CPF cadastrado. Atualize o cadastro antes de informar acompanhante.'
      )
    }

    if (!cpfsAcompanhanteEDiferenteDoPaciente(paciente.cpf, data.acompanhante.cpf)) {
      throw new SolicitacaoBusinessError(
        'CPF do acompanhante deve ser diferente do CPF do paciente.'
      )
    }
  }

  if (data.tipoAtendimento === 'RETORNO') {
    if (!data.solicitacaoOrigemId) {
      throw new SolicitacaoBusinessError('Retorno exige vínculo com consulta anterior.')
    }

    const solicitacaoOrigem = await tx.tfdSolicitacao.findFirst({
      where: {
        id: data.solicitacaoOrigemId,
        tenant_id: tenantId,
        paciente_id: data.pacienteId,
        status: 'CONCLUIDO',
      },
      select: { id: true },
    })

    if (!solicitacaoOrigem) {
      throw new SolicitacaoBusinessError(
        'Solicitação de origem inválida. Selecione uma solicitação concluída do mesmo paciente.'
      )
    }
  }

  const especialidade = await tx.tfdEspecialidade.findFirst({
    where: {
      id: data.especialidadeId,
      tenant_id: tenantId,
      ativa: true,
    },
    select: { id: true, nome: true },
  })

  if (!especialidade) {
    throw new SolicitacaoBusinessError('Especialidade inválida ou inativa.')
  }

  const prestador = await tx.tfdPrestador.findFirst({
    where: {
      id: data.prestadorId,
      tenant_id: tenantId,
      ativo: true,
    },
    select: { id: true, especialidades: true },
  })

  if (!prestador) {
    throw new SolicitacaoBusinessError('Prestador inválido ou inativo.')
  }

  const especialidadesPrestador = parsePrestadorEspecialidades(prestador.especialidades)
  if (!especialidadesPrestador.includes(data.especialidadeId)) {
    throw new SolicitacaoBusinessError(
      'O prestador selecionado não atende a especialidade informada.'
    )
  }

  const procedimentosUnicos = [...new Set(data.procedimentos)]
  const procedimentosAtivos = await tx.tfdProcedimento.count({
    where: {
      tenant_id: tenantId,
      especialidade_id: data.especialidadeId,
      ativo: true,
      id: { in: procedimentosUnicos },
    },
  })

  if (procedimentosAtivos !== procedimentosUnicos.length) {
    throw new SolicitacaoBusinessError(
      'Um ou mais procedimentos são inválidos, inativos ou não pertencem à especialidade.'
    )
  }

  if (data.laudoAnexoId) {
    const anexo = await tx.anexo.findFirst({
      where: {
        id: data.laudoAnexoId,
        tenant_id: tenantId,
      },
      select: { id: true },
    })

    if (!anexo) {
      throw new SolicitacaoBusinessError('Laudo médico não encontrado.')
    }
  }

  return { especialidadeNome: especialidade.nome }
}

export async function abrirSolicitacaoTfd(
  rawInput: unknown
): Promise<ActionResponse<AbrirSolicitacaoOutput>> {
  await assertModuleActive('saude', 'tfd')

  const session = await requireTenantRole('SERVIDOR')

  await requirePermission(session, TFD_PERMISSIONS.ABRIR_SOLICITACAO)

  const parsed = abrirSolicitacaoSchema.safeParse(rawInput)
  if (!parsed.success) {
    return {
      success: false,
      error: 'Dados inválidos.',
      fieldErrors: parsed.error.flatten().fieldErrors,
    }
  }
  const data = parsed.data

  try {
    const tenantId = session.user.tenantId!
    const db = await getPrismaForTenant(tenantId)

    const resultado = await db.$transaction(async (tx) => {
      const { especialidadeNome } = await validarReferenciasAbertura(tx, tenantId, {
        pacienteId: data.pacienteId,
        especialidadeId: data.especialidadeId,
        prestadorId: data.prestadorId,
        procedimentos: data.procedimentos,
        tipoAtendimento: data.tipoAtendimento,
        solicitacaoOrigemId: data.solicitacaoOrigemId,
        laudoAnexoId: data.laudoAnexoId,
        acompanhanteNecessario: data.acompanhanteNecessario,
        acompanhante: data.acompanhante,
      })

      const protocolo = await gerarProtocolo(tenantId, 'SAUDE', 'TFD', tx)

      const moduloResponsavel = await tx.moduloSetorResponsavel.findFirst({
        where: {
          tenant_id: tenantId,
          modulo: MODULO_TFD,
          ativo: true,
        },
        select: { setor_id: true },
      })

      const processo = await tx.processo.create({
        data: {
          tenant_id: tenantId,
          protocolo,
          modulo: MODULO_TFD,
          status: 'ABERTO',
          titulo: `TFD — ${especialidadeNome}`,
          setor_id: moduloResponsavel?.setor_id ?? null,
          aberto_por_id: session.user.id,
        },
      })

      const solicitacao = await tx.tfdSolicitacao.create({
        data: {
          tenant_id: tenantId,
          processo_id: processo.id,
          paciente_id: data.pacienteId,
          solicitante_id: session.user.id,
          especialidade_id: data.especialidadeId,
          prestador_id: data.prestadorId,
          procedimentos: data.procedimentos,
          tipo_atendimento: data.tipoAtendimento,
          solicitacao_origem_id: data.solicitacaoOrigemId ?? null,
          urgencia: data.urgencia,
          status: 'RASCUNHO',
          laudo_anexo_id: data.laudoAnexoId ?? null,
          acompanhante_necessario: data.acompanhanteNecessario,
        },
      })

      if (data.laudoAnexoId) {
        await tx.anexo.update({
          where: {
            id: data.laudoAnexoId,
            tenant_id: tenantId,
          },
          data: { processo_id: processo.id },
        })
      }

      if (data.acompanhanteNecessario && data.acompanhante) {
        await tx.tfdAcompanhante.create({
          data: {
            tenant_id: tenantId,
            solicitacao_id: solicitacao.id,
            nome: data.acompanhante.nome,
            cpf: data.acompanhante.cpf,
            relacao: data.acompanhante.relacao,
            telefone: data.acompanhante.telefone ?? null,
          },
        })
      }

      await registrarTramitacao(
        {
          tenantId,
          processoId: processo.id,
          tipo: 'ABERTURA',
          descricao: `Solicitação TFD registrada em rascunho. Protocolo ${protocolo}.`,
          usuarioId: session.user.id,
        },
        tx
      )

      return {
        solicitacaoId: solicitacao.id,
        protocolo,
        processoId: processo.id,
      }
    })

    await createAuditLog({
      tenantId,
      userId: session.user.id,
      acao: 'CREATE',
      entidade: 'saude_tfd_solicitacao',
      entidadeId: resultado.solicitacaoId,
      payloadDepois: {
        protocolo: resultado.protocolo,
        modulo: MODULO_TFD,
        status: 'RASCUNHO',
        processoId: resultado.processoId,
      },
    })

    revalidatePath('/saude/tfd')

    return {
      success: true,
      data: {
        solicitacaoId: resultado.solicitacaoId,
        protocolo: resultado.protocolo,
      },
    }
  } catch (error) {
    if (error instanceof SolicitacaoBusinessError) {
      return { success: false, error: error.message }
    }

    console.error('[abrirSolicitacaoTfd] Erro:', {
      tenantId: session.user.tenantId,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    })
    return {
      success: false,
      error: 'Não foi possível registrar a solicitação. Tente novamente.',
    }
  }
}

export async function enviarSolicitacaoTfd(
  rawInput: unknown
): Promise<ActionResponse<EnviarSolicitacaoOutput>> {
  await assertModuleActive('saude', 'tfd')

  const session = await requireTenantRole('SERVIDOR')

  await requirePermission(session, TFD_PERMISSIONS.ABRIR_SOLICITACAO)

  const parsed = enviarSolicitacaoSchema.safeParse(rawInput)
  if (!parsed.success) {
    return {
      success: false,
      error: 'Dados inválidos.',
      fieldErrors: parsed.error.flatten().fieldErrors,
    }
  }
  const data = parsed.data

  try {
    const tenantId = session.user.tenantId!
    const db = await getPrismaForTenant(tenantId)

    const solicitacao = await db.tfdSolicitacao.findFirst({
      where: {
        id: data.solicitacaoId,
        tenant_id: tenantId,
      },
      select: {
        id: true,
        status: true,
        solicitante_id: true,
        processo_id: true,
        laudo_anexo_id: true,
        urgencia: true,
        especialidade: {
          select: { nome: true },
        },
        processo: {
          select: { protocolo: true },
        },
      },
    })

    if (!solicitacao) {
      return { success: false, error: 'Solicitação não encontrada.' }
    }

    if (!podeEnviarSolicitacao(session.user.role, session.user.id, solicitacao.solicitante_id)) {
      return {
        success: false,
        error: 'Você não tem permissão para enviar esta solicitação.',
      }
    }

    if (solicitacao.status !== 'RASCUNHO') {
      const statusLabel =
        STATUS_SOLICITACAO_LABEL[solicitacao.status] ?? solicitacao.status
      return {
        success: false,
        error: `A solicitação não pode ser enviada no status "${statusLabel}". Apenas rascunhos podem ser enviados.`,
      }
    }

    if (!solicitacao.laudo_anexo_id) {
      return {
        success: false,
        error: 'Anexe o laudo médico antes de enviar a solicitação.',
      }
    }

    const laudo = await db.anexo.findFirst({
      where: {
        id: solicitacao.laudo_anexo_id,
        tenant_id: tenantId,
      },
      select: { confirmado: true },
    })

    if (!laudo?.confirmado) {
      return {
        success: false,
        error: 'O laudo médico precisa estar confirmado no storage antes do envio.',
      }
    }

    const protocolo = solicitacao.processo.protocolo
    const especialidadeNome = solicitacao.especialidade?.nome ?? 'Não informada'
    const urgencia = solicitacao.urgencia

    const resultado = await db.$transaction(async (tx) => {
      await tx.tfdSolicitacao.update({
        where: { id: solicitacao.id },
        data: { status: 'ENVIADO' },
      })

      await tx.processo.update({
        where: { id: solicitacao.processo_id },
        data: { status: 'AGUARDANDO' },
      })

      await registrarTramitacao(
        {
          tenantId,
          processoId: solicitacao.processo_id,
          tipo: 'ENVIO',
          descricao: `Solicitação TFD enviada para regulação. Protocolo ${protocolo}.`,
          usuarioId: session.user.id,
        },
        tx
      )

      return {
        solicitacaoId: solicitacao.id,
        processoId: solicitacao.processo_id,
        statusAnterior: 'RASCUNHO' as const,
      }
    })

    await createAuditLog({
      tenantId,
      userId: session.user.id,
      acao: 'UPDATE',
      entidade: 'saude_tfd_solicitacao',
      entidadeId: resultado.solicitacaoId,
      payloadAntes: { status: resultado.statusAnterior },
      payloadDepois: {
        status: 'ENVIADO',
        processoStatus: 'AGUARDANDO',
        protocolo,
        modulo: MODULO_TFD,
        processoId: resultado.processoId,
      },
    })

    const notificationBase = {
      tenantId,
      modulo: MODULO_TFD,
      processoId: resultado.processoId,
      context: {
        protocolo,
        especialidade: especialidadeNome,
        urgencia,
      },
      excludeUserIds: [session.user.id],
    }

    await dispararNotificacao({
      ...notificationBase,
      evento: NOTIFICATION_EVENTS.SOLICITACAO_TFD_ENVIADA,
    })

    if (urgencia === 'MUITO_URGENTE') {
      await dispararNotificacao({
        ...notificationBase,
        evento: NOTIFICATION_EVENTS.SOLICITACAO_TFD_MUITO_URGENTE,
      })
    }

    revalidatePath('/saude/tfd')

    return { success: true, data: undefined }
  } catch (error) {
    console.error('[enviarSolicitacaoTfd] Erro:', {
      tenantId: session.user.tenantId,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    })
    return {
      success: false,
      error: 'Não foi possível enviar a solicitação. Tente novamente.',
    }
  }
}
