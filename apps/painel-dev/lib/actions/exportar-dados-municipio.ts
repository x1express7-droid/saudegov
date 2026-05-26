'use server'

import { requireSuperAdmin } from '@saude/core-auth/server'
import { getPrismaAdmin } from '@saude/core-db'
import {
  createAuditLog,
  ExportStorageConfigError,
  formatRodapeExport,
  gerarCsvRelatorio,
  gerarUrlDownloadExportTemporario,
  salvarExportTemporarioCsv,
  salvarExportTemporarioJson,
} from '@saude/core-documents'
import type { ActionResponse } from '@saude/validators'

import {
  coletarDadosMunicipioExport,
  MunicipioExportError,
  type ColetarDadosMunicipioResult,
  type MunicipioExportDados,
} from '../queries/coletar-dados-municipio'
import { exportacaoMunicipioSchema } from '../validators/exportacao-municipio.schema'

export interface ExportarDadosMunicipioOutput {
  downloadUrl: string
  expiresAt: string
  totalRegistros: number
}

const MODULOS_SAUDE_KEYS = [
  'tfd',
  'regul',
  'visa',
  'farma',
  'ubs',
  'sment',
  'vacin',
] as const

function parseModulesRecord(value: unknown): Record<string, Record<string, boolean>> {
  if (typeof value !== 'object' || value === null) {
    return { saude: {} }
  }

  const raw = value as Record<string, unknown>
  const saudeRaw = raw.saude
  const saude: Record<string, boolean> = {}

  if (typeof saudeRaw === 'object' && saudeRaw !== null) {
    for (const [key, val] of Object.entries(saudeRaw)) {
      if (typeof val === 'boolean') {
        saude[key] = val
      }
    }
  }

  return { saude }
}

function resolveModulosAtivos(
  modules: Record<string, Record<string, boolean>>,
  requested?: string[]
): string[] {
  const saude = modules.saude ?? {}
  const ativos = MODULOS_SAUDE_KEYS.filter((key) => saude[key] === true)

  if (!requested || requested.length === 0) {
    return ativos
  }

  return requested.filter((modulo): modulo is (typeof MODULOS_SAUDE_KEYS)[number] =>
    (ativos as readonly string[]).includes(modulo)
  )
}

function resolveTenantTimezone(settings: unknown): string | undefined {
  if (typeof settings !== 'object' || settings === null) {
    return undefined
  }
  const timezoneRaw = (settings as Record<string, unknown>).timezone
  return typeof timezoneRaw === 'string' && timezoneRaw.trim() !== ''
    ? timezoneRaw.trim()
    : undefined
}

function flattenDadosParaCsv(dados: MunicipioExportDados): string[][] {
  const linhas: string[][] = []

  for (const vazio of dados.modulosSemDados) {
    linhas.push([vazio.modulo, 'aviso', '', '', '', vazio.mensagem])
  }

  if (dados.tfd) {
    for (const row of dados.tfd.solicitacoes) {
      linhas.push([
        'tfd',
        'solicitacao',
        row.protocolo,
        row.status,
        row.criadoEm,
        `${row.especialidade} | ${row.prestador} | ${row.tipoAtendimento}`,
      ])
    }
    for (const row of dados.tfd.viagens) {
      linhas.push([
        'tfd',
        'viagem',
        row.protocolo,
        row.status,
        row.dataViagem,
        `seq ${row.sequencia} | ${row.motorista} | ${row.veiculo} | ${row.destino}`,
      ])
    }
    for (const row of dados.tfd.prestacoes) {
      linhas.push([
        'tfd',
        'prestacao',
        row.protocolo,
        row.status,
        row.enviadoEm ?? '',
        String(row.valorTotal),
      ])
    }
    for (const row of dados.tfd.saldos) {
      linhas.push([
        'tfd',
        'saldo',
        row.descricao,
        row.ativo ? 'ATIVO' : 'INATIVO',
        row.competenciaInicio,
        `total ${row.valorTotal} | disp. ${row.valorDisponivel}`,
      ])
    }
    for (const row of dados.tfd.pacientes) {
      linhas.push([
        'tfd',
        'paciente',
        row.nome,
        row.ativo ? 'ATIVO' : 'INATIVO',
        row.dataNascimento ?? '',
        row.cpfMascarado ?? '',
      ])
    }
  }

  return linhas
}

function buildJsonExportBody(input: {
  tenantId: string
  tenantNome: string
  modulosExportados: string[]
  dataInicio?: string
  dataFim?: string
  coleta: ColetarDadosMunicipioResult
  rodapeTexto: string
  geradoEm: Date
}): string {
  return JSON.stringify(
    {
      rodape: input.rodapeTexto,
      metadados: {
        tenantId: input.tenantId,
        tenantNome: input.tenantNome,
        modulos: input.modulosExportados,
        dataInicio: input.dataInicio ?? null,
        dataFim: input.dataFim ?? null,
        totalRegistros: input.coleta.totalRegistros,
        exportadoEm: input.geradoEm.toISOString(),
        observacao:
          'Exportação sem CID, diagnóstico ou dados clínicos sensíveis. CPF/CNS mascarados quando presentes.',
      },
      dados: input.coleta.dados,
    },
    null,
    2
  )
}

export async function exportarDadosMunicipio(
  rawInput: unknown
): Promise<ActionResponse<ExportarDadosMunicipioOutput>> {
  try {
    const adminDb = getPrismaAdmin()

    const parsed = exportacaoMunicipioSchema.safeParse(rawInput)
    if (!parsed.success) {
      return {
        success: false,
        error: 'Parâmetros de exportação inválidos.',
        fieldErrors: parsed.error.flatten().fieldErrors,
      }
    }

    const { tenantId, formato, modulos: modulosInput, dataInicio, dataFim } = parsed.data

    const tenant = await adminDb.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        active: true,
        modules: true,
        settings: true,
      },
    })

    if (!tenant) {
      return { success: false, error: 'Município não encontrado.' }
    }

    if (!tenant.active) {
      return {
        success: false,
        error: 'Município suspenso. Reative o município antes de exportar os dados.',
      }
    }

    const session = await requireSuperAdmin()

    const modules = parseModulesRecord(tenant.modules)
    const modulosExportar = resolveModulosAtivos(modules, modulosInput)

    if (modulosExportar.length === 0) {
      return {
        success: false,
        error: 'Nenhum módulo ativo selecionado para exportação.',
      }
    }

    const coleta = await coletarDadosMunicipioExport({
      tenantId,
      modulos: modulosExportar,
      dataInicio,
      dataFim,
    })

    const geradoEm = new Date()
    const timezone = resolveTenantTimezone(tenant.settings)
    const rodape = {
      usuarioNome: session.user.name ?? 'SUPERADMIN',
      geradoEm,
      timezone,
    }
    const rodapeTexto = formatRodapeExport(rodape)

    let downloadUrl: string
    let expiresAt: Date

    if (formato === 'json') {
      const jsonBody = buildJsonExportBody({
        tenantId,
        tenantNome: tenant.name,
        modulosExportados: coleta.modulosExportados,
        dataInicio,
        dataFim,
        coleta,
        rodapeTexto,
        geradoEm,
      })

      const { exportId } = await salvarExportTemporarioJson(tenantId, jsonBody)
      const urlResult = gerarUrlDownloadExportTemporario(tenantId, exportId, {
        formato: 'json',
      })
      downloadUrl = urlResult.downloadUrl
      expiresAt = urlResult.expiresAt
    } else {
      const csv = gerarCsvRelatorio({
        colunas: ['Módulo', 'Entidade', 'Referência', 'Status', 'Data', 'Detalhe'],
        linhas: flattenDadosParaCsv(coleta.dados),
        rodape,
      })

      const { exportId } = await salvarExportTemporarioCsv(tenantId, csv)
      const urlResult = gerarUrlDownloadExportTemporario(tenantId, exportId, {
        formato: 'csv',
      })
      downloadUrl = urlResult.downloadUrl
      expiresAt = urlResult.expiresAt
    }

    await createAuditLog({
      tenantId,
      userId: session.user.id,
      acao: 'EXPORT',
      entidade: 'plataforma_exportacao_municipio',
      payloadDepois: {
        tenantId,
        tenantNome: tenant.name,
        modulos: coleta.modulosExportados,
        formato,
        dataInicio: dataInicio ?? null,
        dataFim: dataFim ?? null,
        totalRegistros: coleta.totalRegistros,
        expiresAt: expiresAt.toISOString(),
        solicitadoPorSuperAdmin: true,
      },
    })

    return {
      success: true,
      data: {
        downloadUrl,
        expiresAt: expiresAt.toISOString(),
        totalRegistros: coleta.totalRegistros,
      },
    }
  } catch (error) {
    if (error instanceof MunicipioExportError) {
      return { success: false, error: error.message }
    }
    if (error instanceof ExportStorageConfigError) {
      return { success: false, error: error.message }
    }

    console.error('[exportarDadosMunicipio] Erro:', {
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    })

    return {
      success: false,
      error: 'Não foi possível exportar os dados do município. Tente novamente.',
    }
  }
}
