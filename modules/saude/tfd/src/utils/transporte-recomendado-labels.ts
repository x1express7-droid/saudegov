export const TFD_TIPO_TRANSPORTE_RECOMENDADO_OPTIONS = [
  {
    value: 'TERRESTRE_ONIBUS_LINHA',
    label: 'Terrestre (ônibus de linha)',
  },
  {
    value: 'TERRESTRE_CARRO_OFICIAL',
    label: 'Terrestre (carro oficial)',
  },
  {
    value: 'AMBULANCIA',
    label: 'Ambulância (paciente necessita de suporte)',
  },
  {
    value: 'AEREO',
    label: 'Aéreo (com justificativa médica detalhada)',
  },
] as const

export type TfdTipoTransporteRecomendado =
  (typeof TFD_TIPO_TRANSPORTE_RECOMENDADO_OPTIONS)[number]['value']

export function labelTipoTransporteRecomendado(value: string): string {
  const item = TFD_TIPO_TRANSPORTE_RECOMENDADO_OPTIONS.find((option) => option.value === value)
  return item?.label ?? value
}
