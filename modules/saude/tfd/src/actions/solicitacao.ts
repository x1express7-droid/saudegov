'use server'

import { revalidatePath } from 'next/cache'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import {
  assertModuleActive,
  hasPermission,
  requirePermission,
  requireTenantRole,
  type UserRole,
} from '@saude/core-auth/server'
import { getPrismaForTenant } from '@saude/core-db'
import {
  createAuditLog,
  registrarTramitacao,
  type PrismaTransactionClient,
} from '@saude/core-documents'
import { dispararNotificacao, NOTIFICATION_EVENTS } from '@saude/core-notifications'
import type { ActionResponse } from '@saude/validators'

import { TFD_PERMISSIONS } from '../permissions'
import type { AbrirSolicitacaoOutput, EnviarSolicitacaoOutput } from '../types/tfd.types'
import { cpfsAcompanhanteEDiferenteDoPaciente } from '../validators/cpf-acompanhante'
import {
  mensagemStatusNaoCancelavel,
  TFD_STATUS_BLOQUEIA_CANCELAMENTO,
} from '../utils/cancelamento'
import { registrarEntradaFila, registrarSaidaFila } from '../utils/fila'
import {
  DIAS_CANCELAMENTO_PENDENTE_COMPLEMENTO,
  isElegivelCancelamentoPrazoEsgotado,
} from '../utils/pendente-prazo'
import { gerarProtocoloTfd } from '../utils/gerar-protocolo-tfd'
import {
  abrirSolicitacaoSchema,
  anexarDocumentosSolicitacaoSchema,
  cancelarSolicitacaoSchema,
  enviarSolicitacaoSchema,
  resolveMotivoCancelamentoTexto,
} from '../validators/solicitacao.schema'

const MODULO_TFD = 'saude.tfd'

const MSG_PROCESSO_NAO_ENCONTRADO = 'Processo TFD não encontrado.'
const MSG_PROCESSO_PACIENTE_DIVERGENTE =
  'O paciente da solicitação deve ser o mesmo vinculado ao processo.'
const MSG_PROCESSO_ENCERRADO = 'Não é possível abrir solicitação em processo encerrado.'
const PROCESSO_STATUS_ENCERRADOS = new Set(['CONCLUIDO', 'CANCELADO', 'ARQUIVADO'])
const SOLICITACAO_STATUS_ENCERRADOS = new Set(['CONCLUIDO', 'NEGADO', 'CANCELADO'])

const reclassificarUrgenciaValues = ['NAO_AGUDA', 'BAIXA', 'INTERMEDIARIA', 'GRAVE'] as const

const reclassificarSolicitacaoSchema = z
  .object({
    solicitacaoId: z.string().uuid('ID da solicitação inválido.'),
    novaUrgencia: z.string(),
  })
  .superRefine((data, ctx) => {
    if (data.novaUrgencia === 'MUITO_URGENTE') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Reclassificação não permite urgência Muito Urgente.',
        path: ['novaUrgencia'],
      })
      return
    }

    if (
      !(reclassificarUrgenciaValues as readonly string[]).includes(data.novaUrgencia)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Urgência inválida para reclassificação.',
        path: ['novaUrgencia'],
      })
    }
  })

const URGENCIA_RECLASSIFICACAO_LABEL: Record<string, string> = {
  NAO_AGUDA: 'Não aguda',
  BAIXA: 'Baixa',
  INTERMEDIARIA: 'Intermediária',
  GRAVE: 'Alta',
  MUITO_URGENTE: 'Muito urgente',
}

const STATUS_PERMITE_RECLASSIFICAR = new Set([
  'ENVIADO',
  'EM_ANALISE',
  'PENDENTE',
  'APROVADO',
])

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

async function vincularAnexosSolicitacao(
  tx: PrismaTransactionClient,
  tenantId: string,
  solicitacaoId: string,
  processoId: string,
  anexoIds: string[]
): Promise<void> {
  const ids = [...new Set(anexoIds)]
  if (ids.length === 0) {
    return
  }

  const count = await tx.anexo.count({
    where: {
      tenant_id: tenantId,
      id: { in: ids },
    },
  })

  if (count !== ids.length) {
    throw new SolicitacaoBusinessError('Um ou mais arquivos não foram encontrados.')
  }

  await tx.anexo.updateMany({
    where: {
      id: { in: ids },
      tenant_id: tenantId,
    },
    data: { processo_id: processoId, confirmado: true },
  })

  await tx.tfdSolicitacaoAnexo.createMany({
    data: ids.map((anexoId) => ({
      tenant_id: tenantId,
      solicitacao_id: solicitacaoId,
      anexo_id: anexoId,
    })),
    skipDuplicates: true,
  })
}

type ReservaLockedRow = {
  id: string
  saldo_id: string
  valor_estimado: Prisma.Decimal
}

function revalidateSolicitacaoPaths(solicitacaoId: string): void {
  revalidatePath('/saude/tfd')
  revalidatePath(`/saude/tfd/${solicitacaoId}`)
  revalidatePath('/saude/tfd/dashboard')
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100
}

async function lockReservaAtivaForUpdate(
  tx: PrismaTransactionClient,
  tenantId: string,
  solicitacaoId: string
): Promise<ReservaLockedRow | null> {
  const rows = await tx.$queryRaw<ReservaLockedRow[]>(
    Prisma.sql`
      SELECT id, saldo_id, valor_estimado
      FROM saude_tfd.reservas_saldo
      WHERE solicitacao_id = ${solicitacaoId}::uuid
        AND tenant_id = ${tenantId}::uuid
        AND status = 'ATIVA'
      FOR UPDATE
    `
  )

  return rows[0] ?? null
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
    especialidadeId?: string
    procedimentos: string[]
    tipoAtendimento: 'CONSULTA' | 'RETORNO' | 'EXAME' | 'CIRURGIA'
    solicitacaoOrigemId?: string
    laudoAnexoIds?: string[]
    cidPrincipal?: string
    acompanhanteNecessario: boolean
    acompanhante?: {
      pacienteId: string
      cpf?: string
      relacao: 'CONJUGE' | 'FILHO_A' | 'PAI_MAE' | 'RESPONSAVEL_LEGAL' | 'CUIDADOR' | 'OUTRO'
      telefone?: string
    }
  }
): Promise<{ especialidadeNome: string | null }> {
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

  if (data.cidPrincipal) {
    const cid = await tx.tfdCid.findFirst({
      where: {
        tenant_id: tenantId,
        codigo: data.cidPrincipal,
        ativo: true,
      },
      select: { codigo: true },
    })

    if (!cid) {
      throw new SolicitacaoBusinessError('CID inválido ou inativo.')
    }
  }

  if (data.acompanhanteNecessario && data.acompanhante) {
    if (data.acompanhante.pacienteId === data.pacienteId) {
      throw new SolicitacaoBusinessError(
        'O acompanhante deve ser diferente do paciente da solicitação.'
      )
    }

    const pacienteAcompanhante = await tx.paciente.findFirst({
      where: {
        id: data.acompanhante.pacienteId,
        tenant_id: tenantId,
        ativo: true,
      },
      select: {
        id: true,
        cpf: true,
      },
    })

    if (!pacienteAcompanhante) {
      throw new SolicitacaoBusinessError('Paciente acompanhante não encontrado ou inativo.')
    }

    if (data.acompanhante.cpf) {
      if (!paciente.cpf) {
        throw new SolicitacaoBusinessError(
          'Paciente sem CPF cadastrado. Atualize o cadastro antes de informar CPF do acompanhante.'
        )
      }

      if (!cpfsAcompanhanteEDiferenteDoPaciente(paciente.cpf, data.acompanhante.cpf)) {
        throw new SolicitacaoBusinessError(
          'CPF do acompanhante deve ser diferente do CPF do paciente.'
        )
      }
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

  let especialidadeNome: string | null = null

  if (data.especialidadeId) {
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

    especialidadeNome = especialidade.nome
  }

  const procedimentosUnicos = [...new Set(data.procedimentos)]
  if (procedimentosUnicos.length > 0) {
    if (!data.especialidadeId) {
      throw new SolicitacaoBusinessError(
        'Informe a especialidade para validar os procedimentos selecionados.'
      )
    }

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
  }

  if (data.laudoAnexoIds && data.laudoAnexoIds.length > 0) {
    const idsUnicos = [...new Set(data.laudoAnexoIds)]
    for (const laudoAnexoId of idsUnicos) {
      const anexo = await tx.anexo.findFirst({
        where: {
          id: laudoAnexoId,
          tenant_id: tenantId,
        },
        select: { id: true },
      })

      if (!anexo) {
        throw new SolicitacaoBusinessError('Laudo médico não encontrado.')
      }
    }
  }

  return { especialidadeNome }
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
      const procedimentos = data.procedimentos ?? []

      const { especialidadeNome } = await validarReferenciasAbertura(tx, tenantId, {
        pacienteId: data.pacienteId,
        especialidadeId: data.especialidadeId,
        procedimentos,
        tipoAtendimento: data.tipoAtendimento,
        solicitacaoOrigemId: data.solicitacaoOrigemId,
        laudoAnexoIds: data.laudoAnexoIds,
        cidPrincipal: data.cidPrincipal,
        acompanhanteNecessario: data.acompanhanteNecessario,
        acompanhante: data.acompanhante,
      })

      let processoId: string

      if (data.processoId) {
        const processoExistente = await tx.processo.findFirst({
          where: {
            id: data.processoId,
            tenant_id: tenantId,
            modulo: MODULO_TFD,
          },
          select: {
            id: true,
            paciente_id: true,
            status: true,
            setor_id: true,
          },
        })

        if (!processoExistente) {
          throw new SolicitacaoBusinessError(MSG_PROCESSO_NAO_ENCONTRADO)
        }

        if (
          session.user.role === 'SERVIDOR' &&
          session.user.setorId &&
          processoExistente.setor_id !== session.user.setorId
        ) {
          throw new SolicitacaoBusinessError(MSG_PROCESSO_NAO_ENCONTRADO)
        }

        if (processoExistente.paciente_id !== data.pacienteId) {
          throw new SolicitacaoBusinessError(MSG_PROCESSO_PACIENTE_DIVERGENTE)
        }

        if (PROCESSO_STATUS_ENCERRADOS.has(processoExistente.status)) {
          throw new SolicitacaoBusinessError(MSG_PROCESSO_ENCERRADO)
        }

        processoId = processoExistente.id
      } else {
        const protocoloProcesso = await gerarProtocoloTfd(tenantId, 'PROCESSO', tx)

        const moduloResponsavel = await tx.moduloSetorResponsavel.findFirst({
          where: {
            tenant_id: tenantId,
            modulo: MODULO_TFD,
            ativo: true,
          },
          select: { setor_id: true },
        })

        const processoNovo = await tx.processo.create({
          data: {
            tenant_id: tenantId,
            protocolo: protocoloProcesso,
            modulo: MODULO_TFD,
            status: 'ABERTO',
            titulo: especialidadeNome ? `TFD — ${especialidadeNome}` : 'TFD',
            setor_id: moduloResponsavel?.setor_id ?? null,
            aberto_por_id: session.user.id,
            paciente_id: data.pacienteId,
          },
        })

        processoId = processoNovo.id
      }

      const protocolo = await gerarProtocoloTfd(tenantId, 'SOLICITACAO', tx)

      const solicitacao = await tx.tfdSolicitacao.create({
        data: {
          tenant_id: tenantId,
          processo_id: processoId,
          protocolo,
          paciente_id: data.pacienteId,
          solicitante_id: session.user.id,
          especialidade_id: data.especialidadeId ?? null,
          prestador_id: null,
          procedimentos,
          tipo_atendimento: data.tipoAtendimento,
          solicitacao_origem_id: data.solicitacaoOrigemId ?? null,
          urgencia: data.urgencia,
          status: 'RASCUNHO',
          cid_principal: data.cidPrincipal ?? null,
          diagnostico: data.diagnostico.trim(),
          tipo_transporte_recomendado: data.tipoTransporteRecomendado ?? null,
          laudo_anexo_id: data.laudoAnexoIds[0] ?? null,
          acompanhante_necessario: data.acompanhanteNecessario,
          observacoes_abertura: data.observacoesAbertura?.trim() || null,
        },
      })

      const laudoIdsUnicos = [...new Set(data.laudoAnexoIds ?? [])]
      await vincularAnexosSolicitacao(
        tx,
        tenantId,
        solicitacao.id,
        processoId,
        laudoIdsUnicos
      )

      if (data.acompanhanteNecessario && data.acompanhante) {
        const pacienteAcompanhante = await tx.paciente.findFirst({
          where: {
            id: data.acompanhante.pacienteId,
            tenant_id: tenantId,
            ativo: true,
          },
          select: {
            nome: true,
            cpf: true,
            telefone: true,
            telefone_celular: true,
          },
        })

        if (!pacienteAcompanhante) {
          throw new SolicitacaoBusinessError('Paciente acompanhante não encontrado ou inativo.')
        }

        await tx.tfdAcompanhante.create({
          data: {
            tenant_id: tenantId,
            solicitacao_id: solicitacao.id,
            paciente_id: data.acompanhante.pacienteId,
            nome: pacienteAcompanhante.nome,
            cpf: data.acompanhante.cpf ?? pacienteAcompanhante.cpf ?? null,
            relacao: data.acompanhante.relacao,
            telefone:
              data.acompanhante.telefone ??
              pacienteAcompanhante.telefone_celular ??
              pacienteAcompanhante.telefone ??
              null,
          },
        })
      }

      await registrarTramitacao(
        {
          tenantId,
          processoId,
          tipo: 'ABERTURA',
          descricao: `Solicitação TFD registrada em rascunho. Protocolo ${protocolo}.`,
          usuarioId: session.user.id,
        },
        tx
      )

      const posicaoFila = await registrarEntradaFila(tx, {
        tenantId,
        solicitacaoId: solicitacao.id,
        usuarioId: session.user.id,
      })

      return {
        solicitacaoId: solicitacao.id,
        protocolo,
        processoId,
        posicaoFila,
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

export async function anexarDocumentosSolicitacaoTfd(
  rawInput: unknown
): Promise<ActionResponse<void>> {
  await assertModuleActive('saude', 'tfd')

  const session = await requireTenantRole('SERVIDOR')

  const parsed = anexarDocumentosSolicitacaoSchema.safeParse(rawInput)
  if (!parsed.success) {
    return {
      success: false,
      error: 'Dados inválidos.',
      fieldErrors: parsed.error.flatten().fieldErrors,
    }
  }

  const { solicitacaoId, anexoIds } = parsed.data
  const tenantId = session.user.tenantId!

  try {
    const db = await getPrismaForTenant(tenantId)

    const solicitacao = await db.tfdSolicitacao.findFirst({
      where: {
        id: solicitacaoId,
        tenant_id: tenantId,
        ...(session.user.role === 'SERVIDOR' && session.user.setorId
          ? { processo: { setor_id: session.user.setorId } }
          : {}),
      },
      select: {
        id: true,
        processo_id: true,
        status: true,
        solicitante_id: true,
        laudo_anexo_id: true,
      },
    })

    if (!solicitacao) {
      return { success: false, error: 'Solicitação não encontrada.' }
    }

    if (SOLICITACAO_STATUS_ENCERRADOS.has(solicitacao.status)) {
      return {
        success: false,
        error: 'Não é possível anexar documentos em solicitação encerrada.',
      }
    }

    const podeAnexar =
      hasPermission(session, TFD_PERMISSIONS.ABRIR_SOLICITACAO) ||
      hasPermission(session, TFD_PERMISSIONS.ANALISAR_LAUDO) ||
      session.user.id === solicitacao.solicitante_id

    if (!podeAnexar) {
      return { success: false, error: 'Sem permissão para anexar documentos nesta solicitação.' }
    }

    await db.$transaction(async (tx) => {
      await vincularAnexosSolicitacao(
        tx,
        tenantId,
        solicitacao.id,
        solicitacao.processo_id,
        anexoIds
      )

      if (!solicitacao.laudo_anexo_id && anexoIds.length > 0) {
        await tx.tfdSolicitacao.update({
          where: { id: solicitacao.id, tenant_id: tenantId },
          data: { laudo_anexo_id: anexoIds[0] },
        })
      }
    })

    revalidateSolicitacaoPaths(solicitacaoId)
    return { success: true, data: undefined }
  } catch (error) {
    if (error instanceof SolicitacaoBusinessError) {
      return { success: false, error: error.message }
    }

    console.error('[anexarDocumentosSolicitacaoTfd] Erro:', {
      tenantId,
      solicitacaoId,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    })
    return {
      success: false,
      error: 'Não foi possível anexar os documentos. Tente novamente.',
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
        protocolo: true,
        solicitante_id: true,
        processo_id: true,
        laudo_anexo_id: true,
        urgencia: true,
        especialidade: {
          select: { nome: true },
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

    const protocolo = solicitacao.protocolo
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

export async function cancelarSolicitacaoTfd(
  rawInput: unknown
): Promise<ActionResponse<void>> {
  await assertModuleActive('saude', 'tfd')

  const session = await requireTenantRole('GESTOR')

  await requirePermission(session, TFD_PERMISSIONS.CANCELAR_PROCESSO)

  const parsed = cancelarSolicitacaoSchema.safeParse(rawInput)
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
        protocolo: true,
        solicitante_id: true,
        processo_id: true,
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

    if (
      TFD_STATUS_BLOQUEIA_CANCELAMENTO.includes(
        solicitacao.status as (typeof TFD_STATUS_BLOQUEIA_CANCELAMENTO)[number]
      )
    ) {
      return { success: false, error: mensagemStatusNaoCancelavel(solicitacao.status) }
    }

    if (solicitacao.status === 'CANCELADO' || solicitacao.status === 'NEGADO') {
      return { success: false, error: mensagemStatusNaoCancelavel(solicitacao.status) }
    }

    const motivoPreset = data.motivoPreset ?? 'OUTRO'

    if (solicitacao.status === 'PENDENTE') {
      const tramitacaoComplemento = await db.tramitacao.findFirst({
        where: {
          tenant_id: tenantId,
          processo_id: solicitacao.processo_id,
          tipo: 'COMPLEMENTO_SOLICITADO',
        },
        orderBy: { created_at: 'desc' },
        select: { created_at: true },
      })

      if (
        !isElegivelCancelamentoPrazoEsgotado(tramitacaoComplemento?.created_at ?? null)
      ) {
        return {
          success: false,
          error: `Cancelamento permitido apenas após ${DIAS_CANCELAMENTO_PENDENTE_COMPLEMENTO} dias sem retorno do complemento solicitado.`,
        }
      }
    } else if (motivoPreset === 'PRAZO_ESGOTADO') {
      return {
        success: false,
        error:
          'O motivo "prazo esgotado" só se aplica a solicitações pendentes há 60 dias ou mais.',
      }
    }

    const protocolo = solicitacao.protocolo
    const especialidadeNome = solicitacao.especialidade?.nome ?? 'Não informada'
    const canceladoAt = new Date()
    const motivo = resolveMotivoCancelamentoTexto({
      motivoPreset,
      motivo: data.motivo,
    })

    const resultado = await db.$transaction(async (tx) => {
      const reservaLocked = await lockReservaAtivaForUpdate(tx, tenantId, solicitacao.id)

      await tx.tfdSolicitacao.update({
        where: { id: solicitacao.id },
        data: {
          status: 'CANCELADO',
          motivo_cancelamento: motivo,
          cancelado_por_id: session.user.id,
          cancelado_at: canceladoAt,
        },
      })

      await tx.processo.update({
        where: { id: solicitacao.processo_id },
        data: { status: 'CANCELADO' },
      })

      if (reservaLocked) {
        const valorLiberado = roundMoney(Number(reservaLocked.valor_estimado))

        await tx.tfdReservaSaldo.update({
          where: { id: reservaLocked.id },
          data: { status: 'LIBERADA' },
        })

        await tx.tfdMovimentacaoSaldo.create({
          data: {
            tenant_id: tenantId,
            saldo_id: reservaLocked.saldo_id,
            tipo: 'LIBERACAO',
            valor: valorLiberado,
            solicitacao_id: solicitacao.id,
            descricao: 'Liberação — cancelamento da solicitação TFD',
            usuario_id: session.user.id,
          },
        })
      }

      await registrarTramitacao(
        {
          tenantId,
          processoId: solicitacao.processo_id,
          tipo: 'CANCELAMENTO',
          descricao: `Solicitação cancelada. Motivo: ${motivo}`,
          usuarioId: session.user.id,
          metadata: {
            statusAnterior: solicitacao.status,
            reservaLiberada: reservaLocked !== null,
          },
        },
        tx
      )

      await registrarSaidaFila(tx, {
        tenantId,
        solicitacaoId: solicitacao.id,
        usuarioId: session.user.id,
        justificativa: `Saída da fila — cancelamento da solicitação. Motivo: ${motivo}`,
      })

      return {
        solicitacaoId: solicitacao.id,
        processoId: solicitacao.processo_id,
        statusAnterior: solicitacao.status,
        solicitanteId: solicitacao.solicitante_id,
        reservaLiberada: reservaLocked !== null,
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
        status: 'CANCELADO',
        processoStatus: 'CANCELADO',
        protocolo,
        modulo: MODULO_TFD,
        processoId: resultado.processoId,
        reservaLiberada: resultado.reservaLiberada,
      },
    })

    await dispararNotificacao({
      tenantId,
      evento: NOTIFICATION_EVENTS.PROCESSO_CANCELADO,
      modulo: MODULO_TFD,
      processoId: resultado.processoId,
      context: {
        protocolo,
        especialidade: especialidadeNome,
        urgencia: solicitacao.urgencia,
      },
      recipientUserIds: [resultado.solicitanteId],
      excludeUserIds: [session.user.id],
    })

    revalidateSolicitacaoPaths(resultado.solicitacaoId)

    return { success: true, data: undefined }
  } catch (error) {
    if (error instanceof SolicitacaoBusinessError) {
      return { success: false, error: error.message }
    }

    console.error('[cancelarSolicitacaoTfd] Erro:', {
      tenantId: session.user.tenantId,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    })
    return {
      success: false,
      error: 'Não foi possível cancelar a solicitação. Tente novamente.',
    }
  }
}

function urgenciaReclassificacaoLabel(valor: string): string {
  return URGENCIA_RECLASSIFICACAO_LABEL[valor] ?? valor
}

export async function reclassificarSolicitacaoTfd(
  rawInput: unknown
): Promise<
  ActionResponse<{
    solicitacaoId: string
    urgenciaAnterior: string
    urgenciaNova: string
  }>
> {
  await assertModuleActive('saude', 'tfd')

  const session = await requireTenantRole('SERVIDOR')

  await requirePermission(session, TFD_PERMISSIONS.DECIDIR_SOLICITACAO)

  const parsed = reclassificarSolicitacaoSchema.safeParse(rawInput)
  if (!parsed.success) {
    const primeiraMensagem = parsed.error.issues[0]?.message
    if (primeiraMensagem === 'Reclassificação não permite urgência Muito Urgente.') {
      return { success: false, error: primeiraMensagem }
    }

    return {
      success: false,
      error: 'Dados inválidos.',
      fieldErrors: parsed.error.flatten().fieldErrors,
    }
  }
  const data = parsed.data
  const novaUrgencia = data.novaUrgencia as (typeof reclassificarUrgenciaValues)[number]

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
        urgencia: true,
        processo_id: true,
      },
    })

    if (!solicitacao) {
      return { success: false, error: 'Solicitação não encontrada.' }
    }

    if (!STATUS_PERMITE_RECLASSIFICAR.has(solicitacao.status)) {
      const statusLabel =
        STATUS_SOLICITACAO_LABEL[solicitacao.status] ?? solicitacao.status
      return {
        success: false,
        error: `Não é possível reclassificar a urgência no status "${statusLabel}".`,
      }
    }

    const urgenciaAnterior = solicitacao.urgencia
    const urgenciaNova = novaUrgencia

    if (urgenciaAnterior === urgenciaNova) {
      return {
        success: true,
        data: {
          solicitacaoId: solicitacao.id,
          urgenciaAnterior,
          urgenciaNova,
        },
      }
    }

    const labelAnterior = urgenciaReclassificacaoLabel(urgenciaAnterior)
    const labelNova = urgenciaReclassificacaoLabel(urgenciaNova)

    const resultado = await db.$transaction(async (tx) => {
      await tx.tfdSolicitacao.update({
        where: { id: solicitacao.id },
        data: { urgencia: urgenciaNova },
      })

      await registrarTramitacao(
        {
          tenantId,
          processoId: solicitacao.processo_id,
          tipo: 'RECLASSIFICACAO',
          descricao: `Urgência reclassificada de ${labelAnterior} para ${labelNova}.`,
          usuarioId: session.user.id,
          metadata: {
            urgenciaAnterior,
            urgenciaNova,
          },
        },
        tx
      )

      return {
        solicitacaoId: solicitacao.id,
        processoId: solicitacao.processo_id,
      }
    })

    await createAuditLog({
      tenantId,
      userId: session.user.id,
      acao: 'UPDATE',
      entidade: 'saude_tfd_solicitacao',
      entidadeId: resultado.solicitacaoId,
      payloadAntes: { urgencia: urgenciaAnterior },
      payloadDepois: { urgencia: urgenciaNova, modulo: MODULO_TFD },
    })

    revalidateSolicitacaoPaths(resultado.solicitacaoId)

    return {
      success: true,
      data: {
        solicitacaoId: resultado.solicitacaoId,
        urgenciaAnterior,
        urgenciaNova,
      },
    }
  } catch (error) {
    if (error instanceof SolicitacaoBusinessError) {
      return { success: false, error: error.message }
    }

    console.error('[reclassificarSolicitacaoTfd] Erro:', {
      tenantId: session.user.tenantId,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    })
    return {
      success: false,
      error: 'Não foi possível reclassificar a urgência da solicitação.',
    }
  }
}
