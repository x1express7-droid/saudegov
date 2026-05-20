export interface ModuloAtivoItem {
  chave: string
  label: string
}

export interface SetorResponsavelItem {
  id: string
  modulo: string
  setorId: string
  setorNome: string
  setorSigla: string | null
  departamentoNome: string
  ativo: boolean
}

export interface SetorSelectOption {
  value: string
  label: string
  departamentoNome: string
}
