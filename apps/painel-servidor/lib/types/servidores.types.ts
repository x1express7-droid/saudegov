export type ServidorRole = 'ADMIN' | 'GESTOR' | 'SERVIDOR'

export const TENANT_STAFF_ROLES = ['ADMIN', 'GESTOR', 'SERVIDOR'] as const

export interface ServidorSetorVinculo {
  setorId: string
  setorNome: string
  setorSigla: string | null
  departamentoNome: string
  cargo: string | null
  principal: boolean
}

export interface ServidorListItem {
  id: string
  name: string
  email: string
  cpfMascarado: string
  matricula: string | null
  role: ServidorRole
  active: boolean
  setores: ServidorSetorVinculo[]
}

export interface ServidorDetail {
  id: string
  name: string
  email: string
  cpf: string
  matricula: string | null
  role: ServidorRole
  active: boolean
  setores: ServidorSetorVinculo[]
}
