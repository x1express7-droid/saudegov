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
  TfdMotoristaAgendamentoItem,
  TfdVeiculoAgendamentoItem,
  TfdAgendamentoListItem,
  TfdPrestacaoListItem,
  TfdViagemSolicitacaoItem,
  TfdPrestacaoViagemResumo,
  TfdItemDespesaResumo,
  TfdComprovanteVistoItem,
  TfdListagemFiltros,
  TfdPaginatedResult,
  TfdFonteRecursoValor,
  SaldoListItem,
  ExtratoMovimentacaoItem,
  TfdPacienteVinculadoItem,
  TfdSolicitacaoListItem,
  TfdSolicitacaoDetalhe,
  AlertaLembreteViagemFalhou,
  AlertaPrestacaoPrazo,
  AlertaPrestacaoMotivo,
  AlertaPendente30Dias,
  TfdDashboardSaldoItem,
  TfdDashboardOutput,
  TfdDashboardOperacionalOutput,
  TfdDashboardOperacionalKpis,
  TfdAlertaPrazoAnalise,
  TfdAlertaPrazoAnaliseMotivo,
  TfdAlertaUrgenciaSemResposta,
  TfdAlertaAgendamentoSemTransporte,
  TfdAtividadeRecenteItem,
  TfdAlertaUrgente,
  TfdSolicitacaoOrigemRetornoItem,
  AbrirSolicitacaoOutput,
  EnviarSolicitacaoOutput,
} from './types/tfd.types'

export {
  abrirSolicitacaoSchema,
  enviarSolicitacaoSchema,
} from './validators/solicitacao.schema'

export {
  iniciarAnaliseSchema,
  solicitarComplementoSchema,
  enviarComplementoSchema,
} from './validators/regulacao.schema'

export { decidirSolicitacaoSchema } from './validators/decisao.schema'

export { criarAgendamentoSchema, registrarRetornoSchema } from './validators/agendamento.schema'

export type {
  AbrirSolicitacaoInput,
  EnviarSolicitacaoInput,
  TfdTipoAtendimento,
  TfdUrgencia,
  TfdRelacaoAcompanhante,
} from './validators/solicitacao.schema'

export type {
  IniciarAnaliseInput,
  SolicitarComplementoInput,
  EnviarComplementoInput,
} from './validators/regulacao.schema'

export type { DecidirSolicitacaoInput } from './validators/decisao.schema'

export type { CriarAgendamentoInput, RegistrarRetornoInput } from './validators/agendamento.schema'

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

export {
  criarSaldoObjectSchema,
  criarSaldoSchema,
  filtrosExtratoSchema,
} from './validators/financeiro.schema'

export {
  registrarDespesaSchema,
  enviarPrestacaoContasSchema,
  registrarVisualizacaoComprovanteSchema,
  decidirPrestacaoContasSchema,
  MIN_VALOR_COMPROVANTE,
} from './validators/despesa.schema'

export type {
  RegistrarDespesaInput,
  EnviarPrestacaoContasInput,
  RegistrarVisualizacaoComprovanteInput,
  DecidirPrestacaoContasInput,
} from './validators/despesa.schema'

export type {
  CriarSaldoInput,
  FiltrosExtratoInput,
} from './validators/financeiro.schema'

export {
  buscarPacientePorCnsSchema,
  vincularPacienteNovoSchema,
  vincularPacienteExistenteSchema,
} from './validators/paciente.schema'

export type {
  BuscarPacientePorCnsInput,
  VincularPacienteNovoInput,
  VincularPacienteExistenteInput,
} from './validators/paciente.schema'

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
  isCnhVencida,
  isCnhVencendoEmBreve,
  calcMinDataAgendamento72h,
  calcPrazoEnvioPrestacao,
  PRAZO_PRESTACAO_DIAS,
} from './utils/prazos'

export { verificaCapacidadeVeiculo, calcProximaSequenciaViagem } from './utils/viagem'

export { calcSaldoDisponivel } from './utils/saldo'

export type { CalcSaldoDisponivelInput, CalcSaldoDisponivelResult } from './utils/saldo'

export type { TfdServidorMotoristaOption } from './queries/get-servidores-motorista-options'
