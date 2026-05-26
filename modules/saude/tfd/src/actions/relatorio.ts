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
  gerarPdfRelatorio,
  gerarUrlDownloadExportTemporario,
  salvarExportTemporarioPdf,
} from '@saude/core-documents'
import type { ActionResponse } from '@saude/validators'
import { z } from 'zod'

import { TFD_PERMISSIONS } from '../permissions'
import { getRelatorioCompetenciaTfd } from '../queries/get-relatorio-competencia'
import { getRelatorioMotoristaTfd } from '../queries/get-relatorio-motorista'
import { getRelatorioPrestadorTfd } from '../queries/get-relatorio-prestador'
import { getRelatorioProducaoMensalTfd } from '../queries/get-relatorio-producao-mensal'
import {
  buscarPacienteRelatorioTfd,
  getRelatorioPacienteTfd,
} from '../queries/get-relatorio-paciente'
import {
  formatCompetenciaLabel,
  formatDataHoraBr,
  formatMoedaBrl,
  labelStatusTfd,
} from '../utils/relatorio-labels'
import { formatPeriodoLabel } from '../utils/relatorio-period'
import type { RelatorioProducaoStatusChave } from '../types/tfd.types'
import {
  relatorioCompetenciaSchema,
  relatorioMotoristaSchema,
  relatorioPacienteSchema,
  relatorioPrestadorSchema,
  relatorioProducaoMensalSchema,
} from '../validators/relatorio.schema'

const PRODUCAO_STATUS_LABEL: Record<RelatorioProducaoStatusChave, string> = {
  APROVADO: 'Aprovadas',
  NEGADO: 'Negadas',
  CONCLUIDO: 'Concluídas',
  CANCELADO: 'Canceladas',
}

export interface GerarRelatorioTfdOutput {
  downloadUrl: string
  expiresAt: string
  totalRegistros: number
}

const buscarPacienteRelatorioSchema = z.object({
  termo: z.string().trim().min(2, 'Informe ao menos 2 caracteres.').max(100),
})

interface TenantRelatorioContext {
  municipioNome: string
  timezone?: string
}

async function getTenantRelatorioContext(tenantId: string): Promise<TenantRelatorioContext> {
  const tenant = await getPrismaAdmin().tenant.findUnique({
    where: { id: tenantId },
    select: { name: true, theme: true, settings: true },
  })

  if (!tenant) {
    return { municipioNome: 'Município' }
  }

  const theme = tenant.theme as Record<string, string> | null
  const settings = tenant.settings as Record<string, unknown> | null
  const timezoneRaw = settings?.timezone
  const timezone =
    typeof timezoneRaw === 'string' && timezoneRaw.trim() !== '' ? timezoneRaw.trim() : undefined

  return {
    municipioNome: theme?.municipalityName ?? theme?.municipality_name ?? tenant.name,
    timezone,
  }
}

function mapExportError(error: unknown): ActionResponse<never> {
  if (error instanceof ExportRateLimitError) {
    return { success: false, error: error.message }
  }
  if (error instanceof ExportStorageConfigError) {
    return { success: false, error: error.message }
  }
  if (error instanceof Error && error.message === 'Paciente não encontrado.') {
    return { success: false, error: error.message }
  }
  console.error('[relatorio TFD] Erro:', {
    error: error instanceof Error ? error.message : 'Erro desconhecido',
  })
  return { success: false, error: 'Não foi possível gerar o relatório.' }
}

export async function buscarPacienteRelatorioTfdAction(
  rawInput: unknown
): Promise<ActionResponse<Array<{ id: string; nome: string }>>> {
  try {
    await assertModuleActive('saude', 'tfd')
    const parsed = buscarPacienteRelatorioSchema.safeParse(rawInput)
    if (!parsed.success) {
      return { success: false, error: 'Termo de busca inválido.' }
    }

    const itens = await buscarPacienteRelatorioTfd(parsed.data.termo)
    return { success: true, data: itens }
  } catch (error) {
    return mapExportError(error)
  }
}

export async function gerarRelatorioCompetenciaTfd(
  rawInput: unknown
): Promise<ActionResponse<GerarRelatorioTfdOutput>> {
  try {
    await assertModuleActive('saude', 'tfd')
    const session = await requireTenantRole('GESTOR')
    await requirePermission(session, TFD_PERMISSIONS.EXPORTAR_RELATORIO)

    const parsed = relatorioCompetenciaSchema.safeParse(rawInput)
    if (!parsed.success) {
      return { success: false, error: 'Competência inválida.' }
    }

    const tenantId = session.user.tenantId!
    await assertTenantExportRateLimit(tenantId)

    const dados = await getRelatorioCompetenciaTfd(parsed.data)
    const { municipioNome, timezone } = await getTenantRelatorioContext(tenantId)
    const competencia = formatCompetenciaLabel(dados.mes, dados.ano)

    const resumoStatus = Object.entries(dados.porStatus)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([status, total]) => ({
        label: labelStatusTfd(status),
        value: String(total),
      }))

    const buffer = await gerarPdfRelatorio({
      titulo: 'Relatório TFD por competência',
      subtitulo: `Competência ${competencia}`,
      resumo: [
        { label: 'Município', value: municipioNome },
        { label: 'Total de solicitações', value: String(dados.itens.length) },
        ...resumoStatus,
        { label: 'Valor total reservado', value: formatMoedaBrl(dados.valorTotalReservado) },
        { label: 'Valor total consumido', value: formatMoedaBrl(dados.valorTotalConsumido) },
      ],
      colunas: [
        { header: 'Protocolo', key: 'protocolo', width: 110 },
        { header: 'Status', key: 'status', width: 100 },
        { header: 'Reservado', key: 'valorReservado', width: 90 },
        { header: 'Consumido', key: 'valorConsumido', width: 90 },
      ],
      linhas: dados.itens.map((item) => ({
        protocolo: item.protocolo,
        status: labelStatusTfd(item.status),
        valorReservado: item.valorReservado,
        valorConsumido: item.valorConsumido,
      })),
      totais: [
        { label: 'Valor total reservado', value: formatMoedaBrl(dados.valorTotalReservado) },
        { label: 'Valor total consumido', value: formatMoedaBrl(dados.valorTotalConsumido) },
      ],
      rodape: {
        usuarioNome: session.user.name ?? 'Usuário',
        geradoEm: new Date(),
        timezone,
      },
    })

    const { exportId } = await salvarExportTemporarioPdf(tenantId, buffer)
    const { downloadUrl, expiresAt } = gerarUrlDownloadExportTemporario(tenantId, exportId)

    await createAuditLog({
      tenantId,
      userId: session.user.id,
      acao: 'EXPORT',
      entidade: 'saude_tfd_relatorio_competencia',
      payloadDepois: {
        filtros: { mes: parsed.data.mes, ano: parsed.data.ano },
        totalRegistros: dados.itens.length,
        formato: 'pdf',
        expiresAt: expiresAt.toISOString(),
      },
    })

    return {
      success: true,
      data: {
        downloadUrl,
        expiresAt: expiresAt.toISOString(),
        totalRegistros: dados.itens.length,
      },
    }
  } catch (error) {
    return mapExportError(error)
  }
}

export async function gerarRelatorioPacienteTfd(
  rawInput: unknown
): Promise<ActionResponse<GerarRelatorioTfdOutput>> {
  try {
    await assertModuleActive('saude', 'tfd')
    const session = await requireTenantRole('GESTOR')
    await requirePermission(session, TFD_PERMISSIONS.EXPORTAR_RELATORIO)

    const parsed = relatorioPacienteSchema.safeParse(rawInput)
    if (!parsed.success) {
      return { success: false, error: 'Paciente inválido.' }
    }

    const tenantId = session.user.tenantId!
    await assertTenantExportRateLimit(tenantId)

    const dados = await getRelatorioPacienteTfd(parsed.data)
    const { municipioNome, timezone } = await getTenantRelatorioContext(tenantId)

    const buffer = await gerarPdfRelatorio({
      titulo: 'Relatório TFD por paciente',
      subtitulo: dados.paciente.nome,
      resumo: [
        { label: 'Município', value: municipioNome },
        { label: 'Total de solicitações', value: String(dados.itens.length) },
      ],
      colunas: [
        { header: 'Protocolo', key: 'protocolo', width: 100 },
        { header: 'Especialidade', key: 'especialidade', width: 120 },
        { header: 'Status', key: 'status', width: 90 },
        { header: 'Abertura', key: 'criadoEm', width: 95 },
        { header: 'Decisão', key: 'decididoEm', width: 95 },
      ],
      linhas: dados.itens.map((item) => ({
        protocolo: item.protocolo,
        especialidade: item.especialidade,
        status: labelStatusTfd(item.status),
        criadoEm: formatDataHoraBr(item.criadoEm, timezone),
        decididoEm: item.decididoEm ? formatDataHoraBr(item.decididoEm, timezone) : '—',
      })),
      rodape: {
        usuarioNome: session.user.name ?? 'Usuário',
        geradoEm: new Date(),
        timezone,
      },
    })

    const { exportId } = await salvarExportTemporarioPdf(tenantId, buffer)
    const { downloadUrl, expiresAt } = gerarUrlDownloadExportTemporario(tenantId, exportId)

    await createAuditLog({
      tenantId,
      userId: session.user.id,
      acao: 'EXPORT',
      entidade: 'saude_tfd_relatorio_paciente',
      payloadDepois: {
        filtros: { pacienteId: parsed.data.pacienteId },
        totalRegistros: dados.itens.length,
        formato: 'pdf',
        expiresAt: expiresAt.toISOString(),
      },
    })

    return {
      success: true,
      data: {
        downloadUrl,
        expiresAt: expiresAt.toISOString(),
        totalRegistros: dados.itens.length,
      },
    }
  } catch (error) {
    return mapExportError(error)
  }
}

export async function gerarRelatorioPrestadorTfd(
  rawInput: unknown
): Promise<ActionResponse<GerarRelatorioTfdOutput>> {
  try {
    await assertModuleActive('saude', 'tfd')
    const session = await requireTenantRole('GESTOR')
    await requirePermission(session, TFD_PERMISSIONS.EXPORTAR_RELATORIO)

    const parsed = relatorioPrestadorSchema.safeParse(rawInput)
    if (!parsed.success) {
      return { success: false, error: 'Período ou filtros inválidos.' }
    }

    const tenantId = session.user.tenantId!
    await assertTenantExportRateLimit(tenantId)

    const dados = await getRelatorioPrestadorTfd(parsed.data)
    const { municipioNome, timezone } = await getTenantRelatorioContext(tenantId)
    const periodo = formatPeriodoLabel(dados.dataInicio, dados.dataFim)

    const buffer = await gerarPdfRelatorio({
      titulo: 'Relatório TFD por prestador',
      subtitulo: periodo,
      resumo: [
        { label: 'Município', value: municipioNome },
        { label: 'Prestadores', value: String(dados.grupos.length) },
        { label: 'Total de solicitações', value: String(dados.detalhes.length) },
        { label: 'Valor total reservado', value: formatMoedaBrl(dados.valorTotalReservado) },
        { label: 'Valor total consumido', value: formatMoedaBrl(dados.valorTotalConsumido) },
      ],
      colunas: [
        { header: 'Prestador', key: 'prestador', width: 120 },
        { header: 'Cidade/UF', key: 'local', width: 90 },
        { header: 'Volume', key: 'volume', width: 50 },
        { header: 'Reservado', key: 'valorReservado', width: 80 },
        { header: 'Consumido', key: 'valorConsumido', width: 80 },
      ],
      linhas: dados.grupos.map((grupo) => ({
        prestador: grupo.prestadorNome,
        local: `${grupo.cidade}/${grupo.estado}`,
        volume: grupo.volume,
        valorReservado: grupo.valorReservado,
        valorConsumido: grupo.valorConsumido,
      })),
      totais: [
        { label: 'Valor total reservado', value: formatMoedaBrl(dados.valorTotalReservado) },
        { label: 'Valor total consumido', value: formatMoedaBrl(dados.valorTotalConsumido) },
      ],
      rodape: {
        usuarioNome: session.user.name ?? 'Usuário',
        geradoEm: new Date(),
        timezone,
      },
    })

    const { exportId } = await salvarExportTemporarioPdf(tenantId, buffer)
    const { downloadUrl, expiresAt } = gerarUrlDownloadExportTemporario(tenantId, exportId)

    await createAuditLog({
      tenantId,
      userId: session.user.id,
      acao: 'EXPORT',
      entidade: 'saude_tfd_relatorio_prestador',
      payloadDepois: {
        filtros: parsed.data,
        totalRegistros: dados.detalhes.length,
        formato: 'pdf',
        expiresAt: expiresAt.toISOString(),
      },
    })

    return {
      success: true,
      data: {
        downloadUrl,
        expiresAt: expiresAt.toISOString(),
        totalRegistros: dados.detalhes.length,
      },
    }
  } catch (error) {
    return mapExportError(error)
  }
}

export async function gerarRelatorioMotoristaTfd(
  rawInput: unknown
): Promise<ActionResponse<GerarRelatorioTfdOutput>> {
  try {
    await assertModuleActive('saude', 'tfd')
    const session = await requireTenantRole('GESTOR')
    await requirePermission(session, TFD_PERMISSIONS.EXPORTAR_RELATORIO)

    const parsed = relatorioMotoristaSchema.safeParse(rawInput)
    if (!parsed.success) {
      return { success: false, error: 'Período ou filtros inválidos.' }
    }

    const tenantId = session.user.tenantId!
    await assertTenantExportRateLimit(tenantId)

    const dados = await getRelatorioMotoristaTfd(parsed.data)
    const { municipioNome, timezone } = await getTenantRelatorioContext(tenantId)
    const periodo = formatPeriodoLabel(dados.dataInicio, dados.dataFim)

    const buffer = await gerarPdfRelatorio({
      titulo: 'Relatório TFD por motorista',
      subtitulo: periodo,
      resumo: [
        { label: 'Município', value: municipioNome },
        { label: 'Motoristas', value: String(dados.grupos.length) },
        { label: 'Total de viagens', value: String(dados.detalhes.length) },
        { label: 'Total despesas (município)', value: formatMoedaBrl(dados.valorTotalDespesas) },
      ],
      colunas: [
        { header: 'Motorista', key: 'motorista', width: 110 },
        { header: 'Viagens', key: 'viagens', width: 55 },
        { header: 'Despesas', key: 'despesas', width: 85 },
      ],
      linhas: dados.grupos.map((grupo) => ({
        motorista: grupo.motoristaNome,
        viagens: grupo.totalViagens,
        despesas: grupo.valorDespesas,
      })),
      totais: [
        {
          label: 'Total despesas (município)',
          value: formatMoedaBrl(dados.valorTotalDespesas),
        },
      ],
      rodape: {
        usuarioNome: session.user.name ?? 'Usuário',
        geradoEm: new Date(),
        timezone,
      },
    })

    const { exportId } = await salvarExportTemporarioPdf(tenantId, buffer)
    const { downloadUrl, expiresAt } = gerarUrlDownloadExportTemporario(tenantId, exportId)

    await createAuditLog({
      tenantId,
      userId: session.user.id,
      acao: 'EXPORT',
      entidade: 'saude_tfd_relatorio_motorista',
      payloadDepois: {
        filtros: parsed.data,
        totalRegistros: dados.detalhes.length,
        formato: 'pdf',
        expiresAt: expiresAt.toISOString(),
      },
    })

    return {
      success: true,
      data: {
        downloadUrl,
        expiresAt: expiresAt.toISOString(),
        totalRegistros: dados.detalhes.length,
      },
    }
  } catch (error) {
    return mapExportError(error)
  }
}

export async function gerarRelatorioProducaoMensalTfd(
  rawInput: unknown
): Promise<ActionResponse<GerarRelatorioTfdOutput>> {
  try {
    await assertModuleActive('saude', 'tfd')
    const session = await requireTenantRole('GESTOR')
    await requirePermission(session, TFD_PERMISSIONS.EXPORTAR_RELATORIO)

    const parsed = relatorioProducaoMensalSchema.safeParse(rawInput)
    if (!parsed.success) {
      return { success: false, error: 'Competência inválida.' }
    }

    const tenantId = session.user.tenantId!
    await assertTenantExportRateLimit(tenantId)

    const dados = await getRelatorioProducaoMensalTfd(parsed.data)
    const { municipioNome, timezone } = await getTenantRelatorioContext(tenantId)
    const competencia = formatCompetenciaLabel(dados.mes, dados.ano)

    const statusOrdem: RelatorioProducaoStatusChave[] = [
      'APROVADO',
      'NEGADO',
      'CONCLUIDO',
      'CANCELADO',
    ]

    const totalSolicitacoes = statusOrdem.reduce(
      (acc, status) => acc + dados.porStatus[status].quantidade,
      0
    )

    const buffer = await gerarPdfRelatorio({
      titulo: 'Relatório TFD — produção mensal',
      subtitulo: `Competência ${competencia}`,
      resumo: [
        { label: 'Município', value: municipioNome },
        { label: 'Total de registros', value: String(totalSolicitacoes) },
        { label: 'Valor total reservado', value: formatMoedaBrl(dados.valorTotalReservado) },
        { label: 'Valor total consumido', value: formatMoedaBrl(dados.valorTotalConsumido) },
      ],
      colunas: [
        { header: 'Situação', key: 'situacao', width: 100 },
        { header: 'Quantidade', key: 'quantidade', width: 70 },
        { header: 'Reservado', key: 'valorReservado', width: 90 },
        { header: 'Consumido', key: 'valorConsumido', width: 90 },
      ],
      linhas: statusOrdem.map((status) => ({
        situacao: PRODUCAO_STATUS_LABEL[status],
        quantidade: dados.porStatus[status].quantidade,
        valorReservado: dados.porStatus[status].valorReservado,
        valorConsumido: dados.porStatus[status].valorConsumido,
      })),
      totais: [
        { label: 'Valor total reservado', value: formatMoedaBrl(dados.valorTotalReservado) },
        { label: 'Valor total consumido', value: formatMoedaBrl(dados.valorTotalConsumido) },
      ],
      rodape: {
        usuarioNome: session.user.name ?? 'Usuário',
        geradoEm: new Date(),
        timezone,
      },
    })

    const { exportId } = await salvarExportTemporarioPdf(tenantId, buffer)
    const { downloadUrl, expiresAt } = gerarUrlDownloadExportTemporario(tenantId, exportId)

    await createAuditLog({
      tenantId,
      userId: session.user.id,
      acao: 'EXPORT',
      entidade: 'saude_tfd_relatorio_producao_mensal',
      payloadDepois: {
        filtros: { mes: parsed.data.mes, ano: parsed.data.ano },
        totalRegistros: totalSolicitacoes,
        formato: 'pdf',
        expiresAt: expiresAt.toISOString(),
      },
    })

    return {
      success: true,
      data: {
        downloadUrl,
        expiresAt: expiresAt.toISOString(),
        totalRegistros: totalSolicitacoes,
      },
    }
  } catch (error) {
    return mapExportError(error)
  }
}
