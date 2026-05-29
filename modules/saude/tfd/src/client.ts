export {
  TFD_PERMISSIONS,
  TFD_PERMISSION_DEFINITIONS,
  TFD_GRANULAR_PERMISSION_DEFINITIONS,
  TFD_PERMISSION_KEYS,
} from './permissions'

export { TFD_CATALOGO_OPCOES_PER_PAGE } from './constants'

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
  ExtratoMovimentacaoOrigemRef,
  TfdPacienteVinculadoItem,
  TfdSolicitacaoListItem,
  TfdSolicitacaoDetalhe,
  AlertaLembreteViagemFalhou,
  AlertaPrestacaoPrazo,
  AlertaPrestacaoMotivo,
  AlertaPendente30Dias,
  AlertaPendente60Dias,
  AlertaPendenteComplemento,
  TfdVedacaoCodigo,
  TfdVedacaoSeveridade,
  TfdVedacaoItem,
  TfdVedacoesResultado,
  ContextoDecisaoTfd,
  TfdDashboardSaldoItem,
  TfdDashboardFinanceiroOutput,
  TfdDashboardFinanceiroMovimentacao,
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
  RelatorioSelectOption,
  AgendamentoProcessoListItem,
  TfdProcessoDadosClinicosOutput,
  TfdPacienteProcessoListItem,
  TfdPacientePerfilCadastro,
  TfdFilaMovimentacaoHistoricoItem,
  TfdPacienteAgendamentoResumoItem,
  TransporteAgendamentoItem,
  ViagemPorAgendamentoItem,
  ProcessoTfdListItem,
  TfdAgendamentoConsultaListItem,
  ProcessoTfdDetalheOutput,
  PerfilServidorOutput,
} from './types/tfd.types'

export type { ViagemTfdListItem } from './queries/get-viagens-tfd'
export type { ViagemDetalheOutput, ViagemPassageiroDetalhe } from './queries/get-viagem-detalhe'
export type { SegmentoViagemItem } from './queries/get-segmentos-viagem'
export type { VeiculoDetalheOutput } from './queries/get-veiculo-detalhe'
export type { MotoristaDetalheOutput } from './queries/get-motorista-detalhe'
export type { AgendamentoDisponivelViagemItem } from './queries/get-agendamentos-disponiveis-para-viagem'
export type { VagasViagemOutput } from './queries/get-vagas-viagem'

export type { AcompanhanteSolicitacaoOption } from './utils/acompanhante-labels'
export { labelRelacaoAcompanhante } from './utils/acompanhante-labels'

export { MIN_JUSTIFICATIVA_FILA_CHARS } from './validators/fila-movimentacao.schema'

export { formatExtratoOrigemLabel, labelTipoMovimentacao } from './utils/extrato-labels'

export {
  abrirSolicitacaoSchema,
  enviarSolicitacaoSchema,
  cancelarSolicitacaoSchema,
  motivoCancelamentoPresetValues,
  TEXTO_MOTIVO_CANCELAMENTO_PRAZO_ESGOTADO,
  resolveMotivoCancelamentoTexto,
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
  CancelarSolicitacaoInput,
  MotivoCancelamentoPreset,
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
  CNH_CATEGORIA_LETTERS,
  serializeCnhCategorias,
  parseCnhCategorias,
  formatCnhCategorias,
} from './validators/configuracao.schema'

export type { CnhCategoriaLetter } from './validators/configuracao.schema'

export {
  criarSaldoObjectSchema,
  criarSaldoSchema,
  estornarMovimentacaoSaldoSchema,
  MIN_TEXTO_JUSTIFICATIVA_CHARS,
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
  EstornarMovimentacaoSaldoInput,
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
  AtualizarPacienteCompletoInput,
} from './validators/paciente.schema'

export type {
  TfdPacienteAtendimentoBuscaItem,
  TfdPacienteAtendimentoDetalhe,
} from './types/paciente-atendimento.types'

export type {
  BuscarPacientesAtendimentoInput,
  SalvarPacienteAtendimentoInput,
} from './validators/paciente-atendimento.schema'

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

export {
  MIN_DISTANCIA_TFD_KM,
  avaliarVedacoesTfd,
} from './utils/vedacoes-tfd'
export type { AvaliarVedacoesTfdInput } from './utils/vedacoes-tfd'
export {
  DIAS_ALERTA_PENDENTE_30,
  DIAS_CANCELAMENTO_PENDENTE_COMPLEMENTO,
  isComplementoPendenteHaPeloMenosDias,
  buildAlertasPendenteComplemento,
} from './utils/pendente-prazo'
export {
  parseMunicipioOrigemFromSettings,
  calcDistanciaTfdKm,
} from './utils/calc-distancia-tfd'
export type {
  TenantMunicipioOrigem,
  TfdPrestadorDestinoLocal,
} from './utils/calc-distancia-tfd'

export type { TfdServidorMotoristaOption } from './queries/get-servidores-motorista-options'
