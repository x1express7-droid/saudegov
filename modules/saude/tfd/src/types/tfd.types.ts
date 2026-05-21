/** Filtros comuns de listagem paginada do módulo TFD. */
export interface TfdListagemFiltros {
  page?: number
  perPage?: number
  ativo?: boolean
}

export interface TfdPaginatedResult<T> {
  items: T[]
  total: number
  page: number
  perPage: number
}

// --- Especialidades ---

export interface TfdEspecialidadeListItem {
  id: string
  nome: string
  ativa: boolean
  createdAt: string
}

export interface TfdEspecialidadeOutput {
  id: string
  tenantId: string
  nome: string
  ativa: boolean
  createdAt: string
  updatedAt: string
}

// --- Procedimentos ---

export interface TfdProcedimentoListItem {
  id: string
  especialidadeId: string
  especialidadeNome: string
  nome: string
  codigoSigtap: string | null
  ativo: boolean
  createdAt: string
}

export interface TfdProcedimentoOutput {
  id: string
  tenantId: string
  especialidadeId: string
  nome: string
  codigoSigtap: string | null
  ativo: boolean
  createdAt: string
  updatedAt: string
}

// --- Prestadores ---

export interface TfdPrestadorListItem {
  id: string
  nome: string
  cidade: string
  estado: string
  cnpj: string | null
  cnes: string | null
  telefone: string | null
  especialidadeIds: string[]
  especialidadeNomes: string[]
  ativo: boolean
  createdAt: string
}

export interface TfdPrestadorOutput {
  id: string
  tenantId: string
  nome: string
  cnpj: string | null
  cnes: string | null
  cidade: string
  estado: string
  telefone: string | null
  especialidades: string[]
  ativo: boolean
  createdAt: string
  updatedAt: string
}

// --- Veículos ---

export interface TfdVeiculoListItem {
  id: string
  placa: string
  modelo: string
  capacidadePassageiros: number
  ativo: boolean
  createdAt: string
}

export interface TfdVeiculoOutput {
  id: string
  tenantId: string
  placa: string
  modelo: string
  capacidadePassageiros: number
  ativo: boolean
  createdAt: string
  updatedAt: string
}

// --- Motoristas ---

export interface TfdMotoristaListItem {
  id: string
  userId: string
  userNome: string
  userEmail: string
  cnh: string
  cnhCategoria: string
  cnhValidade: string
  cnhVencida: boolean
  cnhVencendoEmBreve: boolean
  ativo: boolean
  createdAt: string
}

export interface TfdMotoristaOutput {
  id: string
  tenantId: string
  userId: string
  userNome: string
  cnh: string
  cnhCategoria: string
  cnhValidade: string
  ativo: boolean
  createdAt: string
  updatedAt: string
}

// --- Saldos financeiros ---

export type TfdFonteRecursoValor =
  | 'FEDERAL_FNS'
  | 'ESTADUAL'
  | 'MUNICIPAL_PROPRIO'
  | 'EMENDA_PARLAMENTAR'

/** Item de listagem de saldos — campos derivados via `calcSaldoDisponivel`. */
export interface SaldoListItem {
  id: string
  descricao: string
  fonte: TfdFonteRecursoValor
  valorTotal: number
  valorReservado: number
  valorUtilizado: number
  valorDisponivel: number
  percentualDisponivel: number
  alertaBaixo: boolean
  competenciaInicio: string
  competenciaFim: string
  ativo: boolean
  createdAt: string
}

/** Linha do extrato de movimentações de um saldo. @see docs/API_CONTRACTS.md §7.4 */
export interface ExtratoMovimentacaoItem {
  tipo: string
  valor: number
  descricao: string
  protocolo: string | null
  usuarioNome: string
  criadoEm: string
}
