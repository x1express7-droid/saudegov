/** Secretaria Municipal de Saúde — registro fixo por tenant (somente leitura na UI). */
export interface SecretariaSaudeItem {
  id: string
  nome: string
  sigla: string | null
  ativa: boolean
}

export interface DepartamentoListItem {
  id: string
  secretariaId: string
  nome: string
  sigla: string | null
  ativo: boolean
  setoresAtivos: number
  createdAt: string
}

export interface SetorListItem {
  id: string
  departamentoId: string
  nome: string
  sigla: string | null
  emailSetor: string | null
  ativo: boolean
  createdAt: string
}
