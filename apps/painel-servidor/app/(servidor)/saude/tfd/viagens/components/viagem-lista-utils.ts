import type { ViagemTfdListItem } from '@saude/mod-saude-tfd/client'
import { formatDateHoraBr, formatDateOnlyBr } from '@saude/ui'

// BLOCO-10-VIAGENS
export const VIAGENS_BASE = '/saude/tfd/viagens'

export function viagemDetalheHref(id: string): string {
  return `${VIAGENS_BASE}/${id}`
}

export function formatDataSaida(data: string, hora: string | null): string {
  return formatDateHoraBr(data, hora)
}

export function formatDataSaidaCurta(data: string): string {
  return formatDateOnlyBr(data)
}

export function labelRota(item: Pick<ViagemTfdListItem, 'origemDescricao' | 'destinoDescricao'>): string {
  return `${item.origemDescricao} → ${item.destinoDescricao}`
}

export function tooltipRota(item: Pick<ViagemTfdListItem, 'origemDescricao' | 'destinoDescricao'>): string {
  return labelRota(item)
}

export function labelVeiculoAbreviado(
  veiculo: ViagemTfdListItem['veiculo']
): string | null {
  if (!veiculo) {
    return null
  }
  const modeloAbrev = veiculo.modelo.trim().split(/\s+/)[0] ?? veiculo.modelo
  return `${veiculo.placa} · ${modeloAbrev}`
}

export function labelVeiculoPlaca(veiculo: ViagemTfdListItem['veiculo']): string | null {
  return veiculo?.placa ?? null
}

export function motoristaNaoAlocado(status: string, motorista: ViagemTfdListItem['motorista']): boolean {
  return !motorista && (status === 'PLANEJADA' || status === 'CONFIRMADA')
}

export function compareDataSaidaAsc(a: ViagemTfdListItem, b: ViagemTfdListItem): number {
  const byDate = a.dataSaida.localeCompare(b.dataSaida)
  if (byDate !== 0) {
    return byDate
  }
  return (a.horaSaida ?? '').localeCompare(b.horaSaida ?? '')
}
