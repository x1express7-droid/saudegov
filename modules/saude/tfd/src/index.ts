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
  TfdSolicitacaoListItem,
  TfdSolicitacaoDetalhe,
  AlertaLembreteViagemFalhou,
  AlertaPrestacaoPrazo,
  AlertaPrestacaoMotivo,
  AlertaPendente30Dias,
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
  criarSaldoTfd,
  buscarExtratoSaldoTfd,
} from './actions/configuracao'

export { buscarPacientePorCns, vincularPaciente } from './actions/paciente'
export { abrirSolicitacaoTfd, enviarSolicitacaoTfd } from './actions/solicitacao'
export {
  iniciarAnaliseTfd,
  solicitarComplementoTfd,
  enviarComplementoTfd,
} from './actions/regulacao'
export { decidirSolicitacaoTfd } from './actions/decisao'
export {
  registrarDespesa,
  enviarPrestacaoContas,
  registrarVisualizacaoComprovante,
  decidirPrestacaoContas,
} from './actions/financeiro'
export {
  criarAgendamentoTfd,
  listarMotoristasAgendamentoTfd,
  registrarRetornoTfd,
} from './actions/viagem'
export { processarLembretesViagem } from './jobs/processar-lembretes-viagem'
export type { ProcessarLembretesViagemResult } from './jobs/processar-lembretes-viagem'
export { processarLembretesPrestacao } from './jobs/processar-lembretes-prestacao'
export type { ProcessarLembretesPrestacaoResult } from './jobs/processar-lembretes-prestacao'

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
export { getSaldosTfd, getSaldoListItemById } from './queries/get-saldos'
export type { GetSaldosFiltros } from './queries/get-saldos'
export { getExtratoSaldo, ExtratoSaldoError } from './queries/get-extrato'
export type { GetExtratoSaldoResult } from './queries/get-extrato'
export { getSolicitacoesTfd } from './queries/get-solicitacoes'
export type { GetSolicitacoesFiltros } from './queries/get-solicitacoes'
export { getSolicitacaoTfd } from './queries/get-solicitacao'
export { getMotoristasAgendamentoTfd } from './queries/get-motoristas-agendamento'
export { getVeiculosAgendamentoTfd } from './queries/get-veiculos-agendamento'
export { getViagensSolicitacaoTfd } from './queries/get-viagens-solicitacao'
export { getAgendamentosTfd } from './queries/get-agendamentos'
export type { GetAgendamentosFiltros } from './queries/get-agendamentos'
export { getAlertasPendente30Dias } from './queries/get-alertas-regulacao'
export { getAlertasLembreteViagemTfd } from './queries/get-alertas-lembrete-viagem'
export { getAlertasPrestacaoTfd } from './queries/get-alertas-prestacao'
export { getPrestacoesTfd } from './queries/get-prestacoes'
export type { GetPrestacoesFiltros } from './queries/get-prestacoes'
export { getSolicitacoesOrigemRetornoTfd } from './queries/get-solicitacoes-origem-retorno'
export type { GetSolicitacoesOrigemRetornoInput } from './queries/get-solicitacoes-origem-retorno'
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
