// BLOCO-8-PROCESSOS
import { formatDateOnlyBr, formatDateTimeBr } from '@saude/ui'

import { formatCpfDisplay, formatTelefoneBr } from '../../components/paciente-form-utils'

export function formatPacienteCpf(cpf: string | null | undefined): string {
  if (!cpf || cpf.length !== 11) {
    return '—'
  }
  return formatCpfDisplay(cpf)
}

export function formatPacienteTelefone(telefone: string | null | undefined): string {
  if (!telefone) {
    return '—'
  }
  return formatTelefoneBr(telefone)
}

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

  return formatDateOnlyBr(iso)
}

export function formatDateTimeFull(iso: string): string {
  return formatDateTimeBr(iso)
}

export const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

export function formatValorEstimadoProcesso(valor: number): string {
  if (!Number.isFinite(valor) || valor <= 0) {
    return '—'
  }
  return currencyFormatter.format(valor)
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
