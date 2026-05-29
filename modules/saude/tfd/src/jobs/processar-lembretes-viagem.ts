import { addHours } from 'date-fns'
import { fromZonedTime } from 'date-fns-tz'
import { getPrismaAdmin } from '@saude/core-db'
import { createAuditLog } from '@saude/core-documents'
import { dispararNotificacao, NOTIFICATION_EVENTS } from '@saude/core-notifications'

const MODULO_TFD = 'saude.tfd'
const DEFAULT_TIMEZONE = 'America/Sao_Paulo'

export interface ProcessarLembretesViagemResult {
  processadas: number
  enviadas: number
  falhas: number
}

type ViagemLembreteRow = {
  id: string
  tenant_id: string
  data_viagem: Date
  hora_saida: Date | null
  solicitacao: {
    processo_id: string
    paciente: { nome: string }
    processo: { protocolo: string }
  }
  motorista: {
    user: { name: string }
  } | null
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

function formatHoraSaida(hora: Date | null): string | null {
  if (!hora) {
    return null
  }

  const horas = hora.getUTCHours().toString().padStart(2, '0')
  const minutos = hora.getUTCMinutes().toString().padStart(2, '0')
  return `${horas}:${minutos}`
}

function buildInicioViagemInstant(
  dataViagem: Date,
  horaSaida: Date | null,
  timezone: string
): Date {
  const dataStr = formatDataViagem(dataViagem)
  const horaStr = formatHoraSaida(horaSaida) ?? '00:00'
  const [year, month, day] = dataStr.split('-').map(Number) as [number, number, number]
  const [hours, minutes] = horaStr.split(':').map(Number) as [number, number]
  return fromZonedTime(new Date(year, month - 1, day, hours, minutes, 0, 0), timezone)
}

function isDentroJanelaLembrete48h(
  dataViagem: Date,
  horaSaida: Date | null,
  timezone: string,
  agora: Date
): boolean {
  const inicioViagem = buildInicioViagemInstant(dataViagem, horaSaida, timezone)
  const limiteSuperior = addHours(agora, 48)
  return inicioViagem <= limiteSuperior
}

/**
 * Job cross-tenant: lembrete in-app 48h antes da viagem.
 * Usa getPrismaAdmin (sem RLS) — invocação exclusiva via cron da plataforma.
 */
export async function processarLembretesViagem(): Promise<ProcessarLembretesViagemResult> {
  const db = getPrismaAdmin()
  const agora = new Date()
  const dataLimitePrefiltro = addHours(agora, 48)

  const candidatas = await db.tfdViagemLegado.findMany({
    where: {
      status: 'AGENDADA',
      lembrete_48h_enviado_at: null,
      data_viagem: {
        lte: dataLimitePrefiltro,
      },
    },
    select: {
      id: true,
      tenant_id: true,
      data_viagem: true,
      hora_saida: true,
      solicitacao: {
        select: {
          processo_id: true,
          paciente: { select: { nome: true } },
          processo: { select: { protocolo: true } },
        },
      },
      motorista: {
        select: {
          user: { select: { name: true } },
        },
      },
      tenant: {
        select: { settings: true },
      },
    },
    orderBy: [{ data_viagem: 'asc' }, { sequencia: 'asc' }],
  })

  const resumo: ProcessarLembretesViagemResult = {
    processadas: 0,
    enviadas: 0,
    falhas: 0,
  }

  for (const viagem of candidatas as ViagemLembreteRow[]) {
    const timezone = resolveTenantTimezone(viagem.tenant.settings)

    if (!isDentroJanelaLembrete48h(viagem.data_viagem, viagem.hora_saida, timezone, agora)) {
      continue
    }

    resumo.processadas += 1

    const dataViagem = formatDataViagem(viagem.data_viagem)
    const horaSaida = formatHoraSaida(viagem.hora_saida)

    const resultadoNotificacao = await dispararNotificacao({
      tenantId: viagem.tenant_id,
      evento: NOTIFICATION_EVENTS.LEMBRETE_VIAGEM_48H,
      modulo: MODULO_TFD,
      processoId: viagem.solicitacao.processo_id,
      viagemId: viagem.id,
      context: {
        protocolo: viagem.solicitacao.processo.protocolo,
        pacienteNome: viagem.solicitacao.paciente.nome,
        dataViagem,
        horaSaida,
        motoristaNome: viagem.motorista?.user.name ?? 'Não informado',
      },
    })

    const agoraGravacao = new Date()

    if (resultadoNotificacao.ok) {
      await db.tfdViagemLegado.update({
        where: { id: viagem.id },
        data: {
          lembrete_48h_enviado_at: agoraGravacao,
          lembrete_48h_falhou_at: null,
        },
      })
      await createAuditLog({
        tenantId: viagem.tenant_id,
        userId: null,
        acao: 'UPDATE',
        entidade: 'saude_tfd_viagem',
        entidadeId: viagem.id,
        payloadDepois: {
          lembrete_48h_enviado_at: agoraGravacao.toISOString(),
        },
      })
      resumo.enviadas += 1
    } else {
      await db.tfdViagemLegado.update({
        where: { id: viagem.id },
        data: {
          lembrete_48h_falhou_at: agoraGravacao,
        },
      })
      await createAuditLog({
        tenantId: viagem.tenant_id,
        userId: null,
        acao: 'UPDATE',
        entidade: 'saude_tfd_viagem',
        entidadeId: viagem.id,
        payloadDepois: {
          lembrete_48h_falhou_at: agoraGravacao.toISOString(),
        },
      })
      resumo.falhas += 1
    }
  }

  console.info('[processarLembretesViagem] Resumo:', {
    processadas: resumo.processadas,
    enviadas: resumo.enviadas,
    falhas: resumo.falhas,
  })

  return resumo
}
