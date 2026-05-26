/** Timezone padrão quando o tenant não informa `settings.timezone`. */
export const DEFAULT_EXPORT_TIMEZONE = 'America/Sao_Paulo'

/**
 * Formata data/hora para exibição em relatórios e exports (pt-BR).
 * Usa o timezone do município quando informado (IANA, ex.: America/Sao_Paulo).
 */
export function formatDataHoraBr(isoOrDate: string | Date, timezone?: string): string {
  const date = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate
  const timeZone = timezone?.trim() || DEFAULT_EXPORT_TIMEZONE

  return date.toLocaleString('pt-BR', {
    timeZone,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
