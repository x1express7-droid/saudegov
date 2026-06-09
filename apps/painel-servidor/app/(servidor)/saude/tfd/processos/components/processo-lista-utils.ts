// BLOCO-8-PROCESSOS
export function formatRelativeTime(iso: string): string {
  const date = new Date(iso)
  const diffMs = Date.now() - date.getTime()
  const diffMinutes = Math.floor(diffMs / 60_000)

  if (diffMinutes < 1) {
    return 'agora'
  }
  if (diffMinutes < 60) {
    return `há ${diffMinutes} min`
  }

  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) {
    return `há ${diffHours} h`
  }

  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 30) {
    return `há ${diffDays} dia${diffDays === 1 ? '' : 's'}`
  }

  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function formatDateTimeFull(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function labelSolicitacoes(count: number): string {
  if (count === 0) {
    return 'Nenhuma solicitação'
  }
  if (count === 1) {
    return '1 solicitação'
  }
  return `${count} solicitações`
}
