'use server'

import {
  assertModuleActive,
  requirePermission,
  requireTenantRole,
} from '@saude/core-auth/server'
import { getPrismaAdmin } from '@saude/core-db'
import {
  assertTenantExportRateLimit,
  createAuditLog,
  ExportRateLimitError,
  ExportStorageConfigError,
  gerarCsvRelatorio,
  gerarUrlDownloadExportTemporario,
  salvarExportTemporarioCsv,
} from '@saude/core-documents'
import type { ActionResponse } from '@saude/validators'

import { ExtratoSaldoError } from '../queries/get-extrato'
import { getExtratoSaldoCompleto } from '../queries/get-extrato-completo'
import { getAgendamentosCompleto } from '../queries/get-agendamentos-completo'
import { getPrestacoesCompleto } from '../queries/get-prestacoes-completo'
import { getSaldosCompleto } from '../queries/get-saldos-completo'
import { getSolicitacoesCompleto } from '../queries/get-solicitacoes-completo'
import { ListagemExportError } from '../queries/listagem-export'
import { TFD_PERMISSIONS } from '../permissions'
import {
  formatCompetenciaPeriodo,
  labelFonteRecursoTfd,
  labelPrestacaoStatusTfd,
  labelTipoAtendimentoTfd,
  labelUrgenciaTfd,
  labelViagemStatusTfd,
} from '../utils/listagem-csv-labels'
import {
  formatDataHoraBr,
  formatMoedaBrl,
  labelStatusTfd,
} from '../utils/relatorio-labels'
import { labelTipoMovimentacao } from '../utils/extrato-labels'
import { filtrosExtratoExportSchema } from '../validators/financeiro.schema'
import {
  exportAgendamentosCsvSchema,
  exportPrestacoesCsvSchema,
  exportSaldosCsvSchema,
  exportSolicitacoesCsvSchema,
} from '../validators/exportacao.schema'

export interface ExportarCsvOutput {
  downloadUrl: string
  expiresAt: string
  totalRegistros: number
}

/** @deprecated Use ExportarCsvOutput */
export type ExportarExtratoSaldoCsvOutput = ExportarCsvOutput

async function resolveTenantTimezone(tenantId: string): Promise<string | undefined> {
  const tenant = await getPrismaAdmin().tenant.findUnique({
    where: { id: tenantId },
    select: { settings: true },
  })

  const settings = tenant?.settings as Record<string, unknown> | null
  const timezoneRaw = settings?.timezone
  return typeof timezoneRaw === 'string' && timezoneRaw.trim() !== ''
    ? timezoneRaw.trim()
    : undefined
}

function mapExportError(error: unknown, contexto: string): ActionResponse<never> {
  if (error instanceof ExportRateLimitError) {
    return { success: false, error: error.message }
  }
  if (error instanceof ExportStorageConfigError) {
    return { success: false, error: error.message }
  }
  if (error instanceof ExtratoSaldoError || error instanceof ListagemExportError) {
    return { success: false, error: error.message }
  }
  console.error(`[${contexto}] Erro:`, {
    error: error instanceof Error ? error.message : 'Erro desconhecido',
  })
  return { success: false, error: 'Não foi possível exportar os dados. Tente novamente.' }
}

function formatDataCsv(iso: string | null, timezone?: string): string {
  if (!iso) {
    return ''
  }
  return formatDataHoraBr(iso, timezone)
}

function formatDataViagemCsv(dataViagem: string, horaSaida: string | null): string {
  const [year, month, day] = dataViagem.split('-')
  const data = `${day}/${month}/${year}`
  return horaSaida ? `${data} ${horaSaida}` : data
}

async function persistirExportCsv(
  tenantId: string,
  csv: string
): Promise<{ downloadUrl: string; expiresAt: Date }> {
  const { exportId } = await salvarExportTemporarioCsv(tenantId, csv)
  const { downloadUrl, expiresAt } = gerarUrlDownloadExportTemporario(tenantId, exportId, {
    formato: 'csv',
  })
  return { downloadUrl, expiresAt }
}

export async function exportarExtratoSaldoTfdCsv(
  rawInput: unknown
): Promise<ActionResponse<ExportarCsvOutput>> {
  try {
    await assertModuleActive('saude', 'tfd')

    const session = await requireTenantRole('GESTOR')
    await requirePermission(session, TFD_PERMISSIONS.GERENCIAR_SALDO)

    const parsed = filtrosExtratoExportSchema.safeParse(rawInput)
    if (!parsed.success) {
      return { success: false, error: 'Filtros de extrato inválidos.' }
    }

    const tenantId = session.user.tenantId!
    await assertTenantExportRateLimit(tenantId)

    const timezone = await resolveTenantTimezone(tenantId)
    const { items, total, saldo } = await getExtratoSaldoCompleto(parsed.data)
    const geradoEm = new Date()

    const csv = gerarCsvRelatorio({
      colunas: ['Data', 'Tipo', 'Valor', 'Descrição', 'Protocolo', 'Usuário'],
      linhas: items.map((item) => [
        formatDataHoraBr(item.criadoEm, timezone),
        labelTipoMovimentacao(item.tipo),
        formatMoedaBrl(item.valor),
        item.descricao,
        item.protocolo ?? '',
        item.usuarioNome,
      ]),
      rodape: {
        usuarioNome: session.user.name ?? 'Usuário',
        geradoEm,
        timezone,
      },
    })

    const { downloadUrl, expiresAt } = await persistirExportCsv(tenantId, csv)

    await createAuditLog({
      tenantId,
      userId: session.user.id,
      acao: 'EXPORT',
      entidade: 'saude_tfd_extrato_saldo',
      payloadDepois: {
        filtros: {
          saldoId: parsed.data.saldoId,
          dataInicio: parsed.data.dataInicio ?? null,
          dataFim: parsed.data.dataFim ?? null,
          saldoDescricao: saldo.descricao,
        },
        totalRegistros: total,
        formato: 'csv',
        expiresAt: expiresAt.toISOString(),
      },
    })

    return {
      success: true,
      data: {
        downloadUrl,
        expiresAt: expiresAt.toISOString(),
        totalRegistros: total,
      },
    }
  } catch (error) {
    return mapExportError(error, 'exportarExtratoSaldoTfdCsv')
  }
}

export async function exportarSolicitacoesTfdCsv(
  rawInput: unknown
): Promise<ActionResponse<ExportarCsvOutput>> {
  try {
    await assertModuleActive('saude', 'tfd')

    const session = await requireTenantRole('GESTOR')
    await requirePermission(session, TFD_PERMISSIONS.EXPORTAR_RELATORIO)

    const parsed = exportSolicitacoesCsvSchema.safeParse(rawInput)
    if (!parsed.success) {
      return { success: false, error: 'Filtros de exportação da fila inválidos.' }
    }

    const tenantId = session.user.tenantId!
    await assertTenantExportRateLimit(tenantId)

    const timezone = await resolveTenantTimezone(tenantId)
    const { items, total } = await getSolicitacoesCompleto(parsed.data)
    const geradoEm = new Date()

    const csv = gerarCsvRelatorio({
      colunas: [
        'Protocolo',
        'Status',
        'Urgência',
        'Especialidade',
        'Prestador',
        'Tipo de atendimento',
        'Criado em',
        'Decidido em',
        'Cancelado em',
        'Atualizado em',
      ],
      linhas: items.map((item) => [
        item.protocolo,
        labelStatusTfd(item.status),
        labelUrgenciaTfd(item.urgencia),
        item.especialidade,
        item.prestadorNome !== '—'
          ? `${item.prestadorNome} (${item.prestadorCidade}/${item.prestadorEstado})`
          : '—',
        labelTipoAtendimentoTfd(item.tipoAtendimento),
        formatDataCsv(item.criadoEm, timezone),
        formatDataCsv(item.decididoEm, timezone),
        formatDataCsv(item.canceladoEm, timezone),
        formatDataCsv(item.atualizadoEm, timezone),
      ]),
      rodape: {
        usuarioNome: session.user.name ?? 'Usuário',
        geradoEm,
        timezone,
      },
    })

    const { downloadUrl, expiresAt } = await persistirExportCsv(tenantId, csv)

    await createAuditLog({
      tenantId,
      userId: session.user.id,
      acao: 'EXPORT',
      entidade: 'saude_tfd_listagem_solicitacoes',
      payloadDepois: {
        filtros: parsed.data,
        totalRegistros: total,
        formato: 'csv',
        expiresAt: expiresAt.toISOString(),
      },
    })

    return {
      success: true,
      data: {
        downloadUrl,
        expiresAt: expiresAt.toISOString(),
        totalRegistros: total,
      },
    }
  } catch (error) {
    return mapExportError(error, 'exportarSolicitacoesTfdCsv')
  }
}

export async function exportarAgendamentosTfdCsv(
  rawInput: unknown
): Promise<ActionResponse<ExportarCsvOutput>> {
  try {
    await assertModuleActive('saude', 'tfd')

    const session = await requireTenantRole('GESTOR')
    await requirePermission(session, TFD_PERMISSIONS.EXPORTAR_RELATORIO)

    const parsed = exportAgendamentosCsvSchema.safeParse(rawInput)
    if (!parsed.success) {
      return { success: false, error: 'Filtros de exportação de agendamentos inválidos.' }
    }

    const tenantId = session.user.tenantId!
    await assertTenantExportRateLimit(tenantId)

    const { items, total } = await getAgendamentosCompleto(parsed.data)
    const geradoEm = new Date()
    const timezone = await resolveTenantTimezone(tenantId)

    const csv = gerarCsvRelatorio({
      colunas: ['Protocolo', 'Data da viagem', 'Motorista', 'Veículo', 'Destino', 'Status'],
      linhas: items.map((item) => [
        item.protocolo,
        formatDataViagemCsv(item.dataViagem, item.horaSaida),
        item.motoristaNome,
        item.veiculoLabel,
        item.destino,
        labelViagemStatusTfd(item.status),
      ]),
      rodape: {
        usuarioNome: session.user.name ?? 'Usuário',
        geradoEm,
        timezone,
      },
    })

    const { downloadUrl, expiresAt } = await persistirExportCsv(tenantId, csv)

    await createAuditLog({
      tenantId,
      userId: session.user.id,
      acao: 'EXPORT',
      entidade: 'saude_tfd_listagem_agendamentos',
      payloadDepois: {
        filtros: parsed.data,
        totalRegistros: total,
        formato: 'csv',
        expiresAt: expiresAt.toISOString(),
      },
    })

    return {
      success: true,
      data: {
        downloadUrl,
        expiresAt: expiresAt.toISOString(),
        totalRegistros: total,
      },
    }
  } catch (error) {
    return mapExportError(error, 'exportarAgendamentosTfdCsv')
  }
}

export async function exportarPrestacoesTfdCsv(
  rawInput: unknown
): Promise<ActionResponse<ExportarCsvOutput>> {
  try {
    await assertModuleActive('saude', 'tfd')

    const session = await requireTenantRole('GESTOR')
    await requirePermission(session, TFD_PERMISSIONS.EXPORTAR_RELATORIO)

    const parsed = exportPrestacoesCsvSchema.safeParse(rawInput)
    if (!parsed.success) {
      return { success: false, error: 'Filtros de exportação de prestações inválidos.' }
    }

    const tenantId = session.user.tenantId!
    await assertTenantExportRateLimit(tenantId)

    const timezone = await resolveTenantTimezone(tenantId)
    const { items, total } = await getPrestacoesCompleto(parsed.data)
    const geradoEm = new Date()

    const csv = gerarCsvRelatorio({
      colunas: [
        'Protocolo',
        'Status da prestação',
        'Valor total',
        'Data de envio',
        'Data de aprovação',
      ],
      linhas: items.map((item) => [
        item.protocolo,
        labelPrestacaoStatusTfd(item.status),
        formatMoedaBrl(item.valorTotal),
        formatDataCsv(item.enviadoEm, timezone),
        formatDataCsv(item.aprovadoEm, timezone),
      ]),
      rodape: {
        usuarioNome: session.user.name ?? 'Usuário',
        geradoEm,
        timezone,
      },
    })

    const { downloadUrl, expiresAt } = await persistirExportCsv(tenantId, csv)

    await createAuditLog({
      tenantId,
      userId: session.user.id,
      acao: 'EXPORT',
      entidade: 'saude_tfd_listagem_prestacoes',
      payloadDepois: {
        filtros: parsed.data,
        totalRegistros: total,
        formato: 'csv',
        expiresAt: expiresAt.toISOString(),
      },
    })

    return {
      success: true,
      data: {
        downloadUrl,
        expiresAt: expiresAt.toISOString(),
        totalRegistros: total,
      },
    }
  } catch (error) {
    return mapExportError(error, 'exportarPrestacoesTfdCsv')
  }
}

export async function exportarSaldosTfdCsv(
  rawInput: unknown
): Promise<ActionResponse<ExportarCsvOutput>> {
  try {
    await assertModuleActive('saude', 'tfd')

    const session = await requireTenantRole('GESTOR')
    await requirePermission(session, TFD_PERMISSIONS.EXPORTAR_RELATORIO)

    const parsed = exportSaldosCsvSchema.safeParse(rawInput)
    if (!parsed.success) {
      return { success: false, error: 'Filtros de exportação de saldos inválidos.' }
    }

    const tenantId = session.user.tenantId!
    await assertTenantExportRateLimit(tenantId)

    const timezone = await resolveTenantTimezone(tenantId)
    const { items, total } = await getSaldosCompleto(parsed.data)
    const geradoEm = new Date()

    const csv = gerarCsvRelatorio({
      colunas: [
        'Fonte',
        'Competência',
        'Valor total',
        'Reservado',
        'Consumido',
        'Disponível',
        'Status',
      ],
      linhas: items.map((item) => [
        labelFonteRecursoTfd(item.fonte),
        formatCompetenciaPeriodo(item.competenciaInicio, item.competenciaFim),
        formatMoedaBrl(item.valorTotal),
        formatMoedaBrl(item.valorReservado),
        formatMoedaBrl(item.valorUtilizado),
        formatMoedaBrl(item.valorDisponivel),
        item.ativo ? 'Ativo' : 'Inativo',
      ]),
      rodape: {
        usuarioNome: session.user.name ?? 'Usuário',
        geradoEm,
        timezone,
      },
    })

    const { downloadUrl, expiresAt } = await persistirExportCsv(tenantId, csv)

    await createAuditLog({
      tenantId,
      userId: session.user.id,
      acao: 'EXPORT',
      entidade: 'saude_tfd_listagem_saldos',
      payloadDepois: {
        filtros: parsed.data,
        totalRegistros: total,
        formato: 'csv',
        expiresAt: expiresAt.toISOString(),
      },
    })

    return {
      success: true,
      data: {
        downloadUrl,
        expiresAt: expiresAt.toISOString(),
        totalRegistros: total,
      },
    }
  } catch (error) {
    return mapExportError(error, 'exportarSaldosTfdCsv')
  }
}
