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
import {
  relatorioCompetenciaSchema,
  relatorioPacienteSchema,
} from '../validators/relatorio.schema'

export interface GerarRelatorioTfdOutput {
  downloadUrl: string
  expiresAt: string
  totalRegistros: number
}

const buscarPacienteRelatorioSchema = z.object({
  termo: z.string().trim().min(2, 'Informe ao menos 2 caracteres.').max(100),
})

async function getMunicipioNome(tenantId: string): Promise<string> {
  const tenant = await getPrismaAdmin().tenant.findUnique({
    where: { id: tenantId },
    select: { name: true, theme: true },
  })

  if (!tenant) {
    return 'Município'
  }

  const theme = tenant.theme as Record<string, string> | null
  return theme?.municipalityName ?? theme?.municipality_name ?? tenant.name
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
    const municipio = await getMunicipioNome(tenantId)
    const competencia = formatCompetenciaLabel(dados.mes, dados.ano)
    const dataEmissao = formatDataHoraBr(new Date())

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
        municipio,
        competencia,
        dataEmissao,
        usuario: session.user.name,
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
    const municipio = await getMunicipioNome(tenantId)
    const competencia = `Paciente: ${dados.paciente.nome}`
    const dataEmissao = formatDataHoraBr(new Date())

    const buffer = await gerarPdfRelatorio({
      titulo: 'Relatório TFD por paciente',
      subtitulo: dados.paciente.nome,
      resumo: [{ label: 'Total de solicitações', value: String(dados.itens.length) }],
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
        criadoEm: formatDataHoraBr(item.criadoEm),
        decididoEm: item.decididoEm ? formatDataHoraBr(item.decididoEm) : '—',
      })),
      rodape: {
        municipio,
        competencia,
        dataEmissao,
        usuario: session.user.name,
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
