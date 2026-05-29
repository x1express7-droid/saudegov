import { gerarProtocolo, type PrismaTransactionClient } from '@saude/core-documents'

/** Tipos de entidade TFD com sequência de protocolo independente. */
export const TFD_PROTOCOLO_ENTIDADE = {
  /** Processo TFD — `2025-SAUDE-TFD-000001` */
  PROCESSO: { sistema: 'SAUDE', sigla: 'TFD' },
  /** Solicitação — `2025-SAUDE-TFD-SOL-000001` */
  SOLICITACAO: { sistema: 'SAUDE', sigla: 'TFD-SOL' },
  /** Agendamento (consulta) — `2025-SAUDE-TFD-AGD-000001` */
  AGENDAMENTO: { sistema: 'SAUDE', sigla: 'TFD-AGD' },
  /** Viagem legada — `2025-SAUDE-TFD-VGM-000001` */
  VIAGEM: { sistema: 'SAUDE', sigla: 'TFD-VGM' },
} as const

export type TfdProtocoloEntidade = keyof typeof TFD_PROTOCOLO_ENTIDADE

export async function gerarProtocoloTfd(
  tenantId: string,
  entidade: TfdProtocoloEntidade,
  tx: PrismaTransactionClient
): Promise<string> {
  const { sistema, sigla } = TFD_PROTOCOLO_ENTIDADE[entidade]
  return gerarProtocolo(tenantId, sistema, sigla, tx)
}

/** Nova viagem — formato `VGM-AAAA-XXXXXX` (reutiliza sequência TFD-VGM). */
export async function gerarProtocoloViagemNova(
  tenantId: string,
  tx: PrismaTransactionClient
): Promise<string> {
  const raw = await gerarProtocoloTfd(tenantId, 'VIAGEM', tx)
  const parts = raw.split('-')
  const ano = parts[0]!
  const sequencia = parts[parts.length - 1]!
  return `VGM-${ano}-${sequencia}`
}
