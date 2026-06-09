import type { ViagemTfdListItem } from '@saude/mod-saude-tfd/client'

// BLOCO-10-VIAGENS
export const VIAGENS_BASE = '/saude/tfd/viagens'

// ViagemTfdListItem não expõe nomes de passageiros — apenas totalPassageiros.
// Filtro por paciente omitido conforme especificação do bloco.

export function viagemDetalheHref(id: string): string {
  return `${VIAGENS_BASE}/${id}`
}

export function formatDataSaida(data: string, hora: string | null): string {
  const parsed = data.length === 10 ? `${data}T12:00:00` : data
  const label = new Date(parsed).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  })
  return hora ? `${label} às ${hora}` : label
}

export function formatDataSaidaCurta(data: string): string {
  const parsed = data.length === 10 ? `${data}T12:00:00` : data
  return new Date(parsed).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  })
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
