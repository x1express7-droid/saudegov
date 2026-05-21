export {
  TFD_PERMISSIONS,
  TFD_PERMISSION_DEFINITIONS,
  TFD_GRANULAR_PERMISSION_DEFINITIONS,
  TFD_PERMISSION_KEYS,
} from './permissions'

export type {
  TfdPermissionDefinition,
  TfdPermissionKey,
  PermissionMinRole,
} from './permissions'

export type {
  TfdEspecialidadeListItem,
  TfdEspecialidadeOutput,
  TfdProcedimentoListItem,
  TfdProcedimentoOutput,
  TfdPrestadorListItem,
  TfdPrestadorOutput,
  TfdVeiculoListItem,
  TfdVeiculoOutput,
  TfdMotoristaListItem,
  TfdMotoristaOutput,
  TfdListagemFiltros,
  TfdPaginatedResult,
} from './types/tfd.types'

export {
  criarEspecialidadeSchema,
  atualizarEspecialidadeSchema,
  desativarEspecialidadeSchema,
  criarProcedimentoSchema,
  atualizarProcedimentoSchema,
  desativarProcedimentoSchema,
  criarPrestadorSchema,
  atualizarPrestadorSchema,
  desativarPrestadorSchema,
  criarVeiculoSchema,
  atualizarVeiculoSchema,
  desativarVeiculoSchema,
  criarMotoristaSchema,
  atualizarMotoristaSchema,
  desativarMotoristaSchema,
} from './validators/configuracao.schema'

export type {
  CriarEspecialidadeInput,
  AtualizarEspecialidadeInput,
  DesativarEspecialidadeInput,
  CriarProcedimentoInput,
  AtualizarProcedimentoInput,
  DesativarProcedimentoInput,
  CriarPrestadorInput,
  AtualizarPrestadorInput,
  DesativarPrestadorInput,
  CriarVeiculoInput,
  AtualizarVeiculoInput,
  DesativarVeiculoInput,
  CriarMotoristaInput,
  AtualizarMotoristaInput,
  DesativarMotoristaInput,
} from './validators/configuracao.schema'

export {
  criarEspecialidadeTfd,
  atualizarEspecialidadeTfd,
  desativarEspecialidadeTfd,
  criarProcedimentoTfd,
  atualizarProcedimentoTfd,
  desativarProcedimentoTfd,
  criarPrestadorTfd,
  atualizarPrestadorTfd,
  desativarPrestadorTfd,
  criarVeiculoTfd,
  atualizarVeiculoTfd,
  desativarVeiculoTfd,
  criarMotoristaTfd,
  atualizarMotoristaTfd,
  desativarMotoristaTfd,
} from './actions/configuracao'

export { getEspecialidadesTfd } from './queries/get-especialidades'
export { getProcedimentosTfd } from './queries/get-procedimentos'
export type { GetProcedimentosFiltros } from './queries/get-procedimentos'
export { getPrestadoresTfd } from './queries/get-prestadores'
export { getVeiculosTfd } from './queries/get-veiculos'
export { getMotoristasTfd } from './queries/get-motoristas'
export {
  getServidoresMotoristaOptionsTfd,
} from './queries/get-servidores-motorista-options'
export type { TfdServidorMotoristaOption } from './queries/get-servidores-motorista-options'
export { isCnhVencida, isCnhVencendoEmBreve } from './utils/prazos'
