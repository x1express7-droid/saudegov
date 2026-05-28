import { addHours } from 'date-fns'
import { getPrismaAdmin } from '@saude/core-db'
import { createAuditLog } from '@saude/core-documents'
import { dispararNotificacao, NOTIFICATION_EVENTS } from '@saude/core-notifications'

const MODULO_TFD = 'saude.tfd'

export interface ProcessarLembretesPrestacaoResult {
  processadas: number
  enviadas: number
  falhas: number
}

type PrestacaoLembreteRow = {
  id: string
  tenant_id: string
  prazo_envio_at: Date
  viagem: {
    sequencia: number
    solicitacao: {
      processo_id: string
      status: string
      processo: { protocolo: string }
    }
  }
}

function formatPrazoEnvio(prazo: Date): string {
  return prazo.toISOString().slice(0, 10)
}

function isDentroJanelaLembrete48h(prazoEnvioAt: Date, agora: Date): boolean {
  const limiteSuperior = addHours(agora, 48)
  return prazoEnvioAt >= agora && prazoEnvioAt <= limiteSuperior
}

/**
 * Job cross-tenant: lembrete in-app 48h antes do prazo da prestação de contas.
 * Usa getPrismaAdmin (sem RLS) — invocação exclusiva via cron da plataforma.
 */
export async function processarLembretesPrestacao(): Promise<ProcessarLembretesPrestacaoResult> {
  const db = getPrismaAdmin()
  const agora = new Date()
  const prazoLimiteSuperior = addHours(agora, 48)

  const candidatas = await db.tfdPrestacaoConta.findMany({
    where: {
      status: 'PENDENTE',
      lembrete_48h_enviado_at: null,
      prazo_envio_at: {
        gte: agora,
        lte: prazoLimiteSuperior,
      },
      viagem: {
        solicitacao: {
          status: 'AGUARDANDO_PC',
        },
      },
    },
    select: {
      id: true,
      tenant_id: true,
      prazo_envio_at: true,
      viagem: {
        select: {
          sequencia: true,
          solicitacao: {
            select: {
              processo_id: true,
              status: true,
              processo: { select: { protocolo: true } },
            },
          },
        },
      },
    },
    orderBy: [{ prazo_envio_at: 'asc' }],
  })

  const resumo: ProcessarLembretesPrestacaoResult = {
    processadas: 0,
    enviadas: 0,
    falhas: 0,
  }

  for (const prestacao of candidatas as PrestacaoLembreteRow[]) {
    if (!isDentroJanelaLembrete48h(prestacao.prazo_envio_at, agora)) {
      continue
    }

    resumo.processadas += 1

    const prazoEnvioAt = formatPrazoEnvio(prestacao.prazo_envio_at)
    const protocolo = prestacao.viagem.solicitacao.processo.protocolo
    const processoId = prestacao.viagem.solicitacao.processo_id

    const resultadoNotificacao = await dispararNotificacao({
      tenantId: prestacao.tenant_id,
      evento: NOTIFICATION_EVENTS.LEMBRETE_PRESTACAO_48H,
      modulo: MODULO_TFD,
      processoId,
      prestacaoContaId: prestacao.id,
      context: {
        protocolo,
        prazoEnvioAt,
        sequenciaViagem: prestacao.viagem.sequencia,
      },
    })

    const agoraGravacao = new Date()

    if (resultadoNotificacao.ok) {
      await db.tfdPrestacaoConta.update({
        where: { id: prestacao.id },
        data: {
          lembrete_48h_enviado_at: agoraGravacao,
          lembrete_48h_falhou_at: null,
        },
      })
      await createAuditLog({
        tenantId: prestacao.tenant_id,
        userId: null,
        acao: 'UPDATE',
        entidade: 'saude_tfd_prestacao_conta',
        entidadeId: prestacao.id,
        payloadDepois: {
          lembrete_48h_enviado_at: agoraGravacao.toISOString(),
          prazoEnvioAt,
        },
      })
      resumo.enviadas += 1
    } else {
      await db.tfdPrestacaoConta.update({
        where: { id: prestacao.id },
        data: {
          lembrete_48h_falhou_at: agoraGravacao,
        },
      })
      await createAuditLog({
        tenantId: prestacao.tenant_id,
        userId: null,
        acao: 'UPDATE',
        entidade: 'saude_tfd_prestacao_conta',
        entidadeId: prestacao.id,
        payloadDepois: {
          lembrete_48h_falhou_at: agoraGravacao.toISOString(),
        },
      })
      resumo.falhas += 1
    }
  }

  console.info('[processarLembretesPrestacao] Resumo:', {
    processadas: resumo.processadas,
    enviadas: resumo.enviadas,
    falhas: resumo.falhas,
  })

  return resumo
}
