import type { BrazilTimezone } from '@saude/validators'

export const BRAZIL_TIMEZONE_OPTIONS: Array<{ value: BrazilTimezone; label: string }> = [
  { value: 'America/Sao_Paulo', label: 'Brasília (UTC−3) — São Paulo, Rio, BH, Curitiba' },
  { value: 'America/Manaus', label: 'Manaus (UTC−4)' },
  { value: 'America/Belem', label: 'Belém (UTC−3)' },
  { value: 'America/Fortaleza', label: 'Fortaleza (UTC−3)' },
  { value: 'America/Recife', label: 'Recife (UTC−3)' },
  { value: 'America/Noronha', label: 'Fernando de Noronha (UTC−2)' },
  { value: 'America/Campo_Grande', label: 'Campo Grande (UTC−4)' },
  { value: 'America/Cuiaba', label: 'Cuiabá (UTC−4)' },
  { value: 'America/Porto_Velho', label: 'Porto Velho (UTC−4)' },
  { value: 'America/Boa_Vista', label: 'Boa Vista (UTC−4)' },
  { value: 'America/Rio_Branco', label: 'Rio Branco (UTC−5)' },
  { value: 'America/Eirunepe', label: 'Eirunepé / Acre ocidental (UTC−5)' },
]

export const DEFAULT_BRAZIL_TIMEZONE: BrazilTimezone = 'America/Sao_Paulo'
