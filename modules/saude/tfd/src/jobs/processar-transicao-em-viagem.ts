import { addDays } from 'date-fns'
import { formatInTimeZone } from 'date-fns-tz'
import { getPrismaAdmin } from '@saude/core-db'
import { createAuditLog, registrarTramitacao } from '@saude/core-documents'

const MODULO_TFD = 'saude.tfd'
const DEFAULT_TIMEZONE = 'America/Sao_Paulo'

export interface ProcessarTransicaoEmViagemErro {
  viagemId: string
  mensagem: string
}

export interface ProcessarTransicaoEmViagemResult {
  /** Viagens elegíveis pela data (timezone do tenant) e processadas no lote. */
  processadas: number
  /** Solicitações transicionadas de `AGENDADO` para `EM_VIAGEM`. */
  transicionadas: number
  /** Viagem já processada em corrida paralela ou solicitação já em `EM_VIAGEM`. */
  ignoradas: number
  erros: ProcessarTransicaoEmViagemErro[]
}

type ViagemTransicaoRow = {
  id: string
  tenant_id: string
  data_viagem: Date
  sequencia: number
  solicitacao_id: string
  solicitacao: {
    id: string
    status: string
    processo_id: string
    processo: { protocolo: string }
  }
  tenant: {
    settings: unknown
  }
}

function resolveTenantTimezone(settings: unknown): string {
  if (typeof settings !== 'object' || settings === null) {
    return DEFAULT_TIMEZONE
  }

  const timezone = (settings as Record<string, unknown>).timezone
  return typeof timezone === 'string' && timezone.trim() !== ''
    ? timezone.trim()
    : DEFAULT_TIMEZONE
}

function formatDataViagem(dataViagem: Date): string {
  return dataViagem.toISOString().slice(0, 10)
}

function isDataViagemChegou(
  dataViagem: Date,
  timezone: string,
  referencia: Date
): boolean {
  const dataStr = formatDataViagem(dataViagem)
  const hojeStr = formatInTimeZone(referencia, timezone, 'yyyy-MM-dd')
  return dataStr <= hojeStr
}

/**
 * Job cross-tenant: na data da viagem (timezone do tenant), transiciona solicitação
 * `AGENDADO` → `EM_VIAGEM` e marca `em_viagem_transicionado_at` (idempotente).
 * @see BUSINESS_RULES.md §1.3, §1.6, §1.10
 */
export async function processarTransicaoEmViagemTfd(): Promise<ProcessarTransicaoEmViagemResult> {
  const db = getPrismaAdmin()
  const agora = new Date()
  const dataLimitePrefiltro = addDays(agora, 1)

  const candidatas = await db.tfdViagemLegado.findMany({
    where: {
      status: 'AGENDADA',
      em_viagem_transicionado_at: null,
      data_viagem: {
        lte: dataLimitePrefiltro,
      },
    },
    select: {
      id: true,
      tenant_id: true,
      data_viagem: true,
      sequencia: true,
      solicitacao_id: true,
      solicitacao: {
        select: {
          id: true,
          status: true,
          processo_id: true,
          processo: { select: { protocolo: true } },
        },
      },
      tenant: {
        select: { settings: true },
      },
    },
    orderBy: [{ data_viagem: 'asc' }, { sequencia: 'asc' }],
  })

  const resumo: ProcessarTransicaoEmViagemResult = {
    processadas: 0,
    transicionadas: 0,
    ignoradas: 0,
    erros: [],
  }

  for (const viagem of candidatas as ViagemTransicaoRow[]) {
    const timezone = resolveTenantTimezone(viagem.tenant.settings)

    if (!isDataViagemChegou(viagem.data_viagem, timezone, agora)) {
      continue
    }

    resumo.processadas += 1

    try {
      const resultado = await db.$transaction(async (tx) => {
        const viagemLocked = await tx.tfdViagemLegado.findFirst({
          where: {
            id: viagem.id,
            tenant_id: viagem.tenant_id,
            status: 'AGENDADA',
            em_viagem_transicionado_at: null,
          },
          select: {
            id: true,
            data_viagem: true,
            sequencia: true,
            solicitacao: {
              select: {
                id: true,
                status: true,
                processo_id: true,
              },
            },
          },
        })

        if (!viagemLocked) {
          return { tipo: 'ignorada' as const, motivo: 'viagem_ja_processada' }
        }

        const statusSolicitacao = viagemLocked.solicitacao.status
        const transicionadoAt = new Date()
        const dataViagemLabel = formatDataViagem(viagemLocked.data_viagem)

        if (statusSolicitacao !== 'AGENDADO' && statusSolicitacao !== 'EM_VIAGEM') {
          return {
            tipo: 'erro' as const,
            mensagem: `Status da solicitação "${statusSolicitacao}" não permite transição automática.`,
          }
        }

        await tx.tfdViagemLegado.update({
          where: { id: viagemLocked.id },
          data: { em_viagem_transicionado_at: transicionadoAt },
        })

        if (statusSolicitacao === 'EM_VIAGEM') {
          return {
            tipo: 'ignorada' as const,
            motivo: 'solicitacao_ja_em_viagem',
            transicionadoAt,
            sequencia: viagemLocked.sequencia,
            dataViagemLabel,
          }
        }

        await tx.tfdSolicitacao.update({
          where: { id: viagemLocked.solicitacao.id },
          data: { status: 'EM_VIAGEM' },
        })

        await registrarTramitacao(
          {
            tenantId: viagem.tenant_id,
            processoId: viagemLocked.solicitacao.processo_id,
            tipo: 'OBSERVACAO_INTERNA',
            descricao: `Transição automática: solicitação em viagem (viagem ${viagemLocked.sequencia}, data ${dataViagemLabel}).`,
            usuarioId: null,
            visivelServidor: true,
            metadata: {
              viagemId: viagemLocked.id,
              sequencia: viagemLocked.sequencia,
              dataViagem: dataViagemLabel,
              origem: 'job_transicao_em_viagem',
            },
          },
          tx
        )

        return {
          tipo: 'transicionada' as const,
          transicionadoAt,
          sequencia: viagemLocked.sequencia,
          dataViagemLabel,
          statusAnterior: statusSolicitacao,
        }
      })

      if (resultado.tipo === 'ignorada') {
        if (resultado.motivo === 'solicitacao_ja_em_viagem' && resultado.transicionadoAt) {
          await createAuditLog({
            tenantId: viagem.tenant_id,
            userId: null,
            acao: 'UPDATE',
            entidade: 'saude_tfd_viagem',
            entidadeId: viagem.id,
            payloadDepois: {
              em_viagem_transicionado_at: resultado.transicionadoAt.toISOString(),
              solicitacaoJaEmViagem: true,
              sequencia: resultado.sequencia,
            },
          })
        }
        resumo.ignoradas += 1
        continue
      }

      if (resultado.tipo === 'erro') {
        resumo.erros.push({ viagemId: viagem.id, mensagem: resultado.mensagem })
        continue
      }

      await createAuditLog({
        tenantId: viagem.tenant_id,
        userId: null,
        acao: 'UPDATE',
        entidade: 'saude_tfd_solicitacao',
        entidadeId: viagem.solicitacao.id,
        payloadAntes: { status: resultado.statusAnterior },
        payloadDepois: {
          status: 'EM_VIAGEM',
          protocolo: viagem.solicitacao.processo.protocolo,
          modulo: MODULO_TFD,
          viagemId: viagem.id,
          sequencia: resultado.sequencia,
          dataViagem: resultado.dataViagemLabel,
        },
      })

      await createAuditLog({
        tenantId: viagem.tenant_id,
        userId: null,
        acao: 'UPDATE',
        entidade: 'saude_tfd_viagem',
        entidadeId: viagem.id,
        payloadDepois: {
          em_viagem_transicionado_at: resultado.transicionadoAt.toISOString(),
        },
      })

      resumo.transicionadas += 1
    } catch (error) {
      const mensagem =
        error instanceof Error ? error.message : 'Erro desconhecido ao processar viagem.'
      resumo.erros.push({ viagemId: viagem.id, mensagem })
      console.error('[processarTransicaoEmViagemTfd] Erro na viagem:', {
        viagemId: viagem.id,
        tenantId: viagem.tenant_id,
        error: mensagem,
      })
    }
  }

  console.info('[processarTransicaoEmViagemTfd] Resumo:', {
    processadas: resumo.processadas,
    transicionadas: resumo.transicionadas,
    ignoradas: resumo.ignoradas,
    erros: resumo.erros.length,
  })

  return resumo
}
