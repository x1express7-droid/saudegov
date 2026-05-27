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
  ehPab: boolean
  ativo: boolean
  createdAt: string
}

export interface TfdProcedimentoOutput {
  id: string
  tenantId: string
  especialidadeId: string
  nome: string
  codigoSigtap: string | null
  ehPab: boolean
  ativo: boolean
  createdAt: string
  updatedAt: string
}

/** Contexto para vedações na decisão de aprovação (§1.5). */
export interface ContextoDecisaoTfd {
  possuiProcedimentoPab: boolean
  distanciaKmCalculada: number | null
  origemMunicipioConfigurada: boolean
  prestadorCidade: string
  prestadorEstado: string
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

/** Motorista elegível para agendamento na data da viagem (CNH válida). */
export interface TfdMotoristaAgendamentoItem {
  id: string
  nome: string
  cnhNumero: string
  cnhValidade: string
  cnhCategoria: string
}

/** Veículo elegível para agendamento conforme ocupação necessária. */
export interface TfdVeiculoAgendamentoItem {
  id: string
  placa: string
  modelo: string
  capacidadePassageiros: number
}

/** Item da listagem de agendamentos (viagens) com contexto da solicitação. */
export interface TfdAgendamentoListItem {
  id: string
  sequencia: number
  dataViagem: string
  horaSaida: string | null
  status: string
  solicitacao: {
    id: string
    protocolo: string
    paciente: { nome: string }
  }
  motorista: { id: string; nome: string } | null
  veiculo: { id: string; placa: string; modelo: string } | null
  lembrete48hEnviadoAt: string | null
  lembrete48hFalhouAt: string | null
}

/** Registro de comprovante visualizado pelo gestor na análise da PC. */
export interface TfdComprovanteVistoItem {
  comprovanteAnexoId: string
  userId: string
  visualizadoAt: string
}

/** Resumo da prestação de contas vinculada à viagem. */
export interface TfdPrestacaoViagemResumo {
  id: string
  status: string
  prazoEnvioAt: string
  observacoesGestor: string | null
  comprovantesVistos: TfdComprovanteVistoItem[]
}

/** Item de despesa no detalhe da solicitação — sem dados sensíveis. */
export interface TfdItemDespesaResumo {
  id: string
  tipo: string
  valor: number
  descricao: string | null
  comprovanteAnexoId: string | null
  responsavelPagamento: string
}

/** Viagem vinculada a uma solicitação TFD. */
export interface TfdViagemSolicitacaoItem {
  id: string
  sequencia: number
  dataViagem: string
  horaSaida: string | null
  status: string
  motorista: { nome: string } | null
  veiculo: { placa: string; modelo: string } | null
  lembrete48hEnviadoAt: string | null
  lembrete48hFalhouAt: string | null
  prestacao: TfdPrestacaoViagemResumo | null
  itensDespesa: TfdItemDespesaResumo[]
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

/** Referência resumida à movimentação de origem (extrato — sem dados sensíveis). */
export interface ExtratoMovimentacaoOrigemRef {
  tipo: string
  descricaoResumo: string
}

/** Linha do extrato de movimentações de um saldo. @see docs/API_CONTRACTS.md §7.4 */
export interface ExtratoMovimentacaoItem {
  id: string
  tipo: string
  valor: number
  descricao: string
  protocolo: string | null
  usuarioNome: string
  criadoEm: string
  /** Preenchido quando `tipo === 'ESTORNO'`. */
  movimentacaoOrigem: ExtratoMovimentacaoOrigemRef | null
  /** CONSUMO, CREDITO ou LIBERACAO sem estorno registrado. */
  podeEstornar: boolean
  /** Já possui registro ESTORNO vinculado. */
  jaEstornada: boolean
}

// --- Solicitações TFD (Sprint 1.4) ---

/** Item de listagem — sem CID, diagnóstico, CPF ou CNS. @see docs/API_CONTRACTS.md §7.1 */
export interface TfdPacienteVinculadoItem {
  id: string
  nome: string
  cnsMascarado: string | null
  vinculadoEm: string
  ativo: boolean
}

export interface TfdSolicitacaoListItem {
  id: string
  protocolo: string
  status: string
  urgencia: string
  especialidade: string
  prestador: {
    nome: string
    cidade: string
    estado: string
  }
  paciente: {
    nome: string
  }
  tipoAtendimento: string
  criadoEm: string
  posicaoFila: number | null
}

/** Retorno de sucesso de `abrirSolicitacaoTfd`. */
export interface AbrirSolicitacaoOutput {
  solicitacaoId: string
  protocolo: string
}

/** Sucesso de `enviarSolicitacaoTfd` sem payload (`ActionResponse<void>`). */
export type EnviarSolicitacaoOutput = undefined

/** Detalhe de solicitação TFD — campos clínicos opcionais (permissão analisar_laudo). */
export interface TfdSolicitacaoDetalhe {
  id: string
  processoId: string
  protocolo: string
  status: string
  urgencia: string
  tipoAtendimento: string
  createdAt: string
  updatedAt: string
  especialidade: { id: string; nome: string } | null
  procedimentos: Array<{ id: string; nome: string }>
  prestador: { id: string; nome: string; cidade: string; estado: string } | null
  paciente: {
    id: string
    nome: string
    dataNascimento: string | null
    cns: string | null
  }
  acompanhante: { nome: string; relacao: string } | null
  solicitante: { id: string; nome: string }
  tramitacoes: Array<{
    tipo: string
    observacao: string
    createdAt: string
    usuario: { nome: string | null }
  }>
  laudoAnexoId: string | null
  solicitacaoOrigemId: string | null
  reservaSaldo: { id: string; valor: number; status: string } | null
  /** `true` quando status `PENDENTE` e complemento solicitado há ≥ 60 dias (§1.9). */
  elegivelCancelamentoPrazoEsgotado: boolean
  cidPrincipal?: string | null
  diagnostico?: string | null
  observacoesClinicas?: string | null
}

/** Motivo do alerta de prestação de contas na fila TFD (gestor). */
export type AlertaPrestacaoMotivo = 'LEMBRETE_FALHOU' | 'PRAZO_VENCIDO' | 'PRAZO_VENCENDO'

/** Alerta operacional — prestação com prazo vencendo ou lembrete automático falhou (gestor). */
export interface AlertaPrestacaoPrazo {
  id: string
  motivo: AlertaPrestacaoMotivo
  prazoEnvioAt: string
  lembrete48hFalhouAt: string | null
  sequenciaViagem: number
  solicitacao: {
    id: string
    protocolo: string
  }
}

/** Item da listagem de prestações de contas — sem dados clínicos. */
export interface TfdPrestacaoListItem {
  id: string
  status: string
  prazoEnvioAt: string
  valorTotal: number
  quantidadeItens: number
  sequenciaViagem: number
  protocolo: string
  solicitacaoId: string
  paciente: { nome: string }
  especialidade: string
}

/** Alerta operacional — lembrete 48h da viagem não enviado (gestor). */
export interface AlertaLembreteViagemFalhou {
  id: string
  dataViagem: string
  lembrete48hFalhouAt: string
  solicitacao: {
    id: string
    protocolo: string
  }
}

/** Alerta operacional — complemento pendente (gestor). */
export interface AlertaPendenteComplemento {
  id: string
  protocolo: string
  paciente: { nome: string }
  complementoSolicitadoEm: string
  diasPendente: number
}

/** Complemento pendente há mais de 30 dias — dashboard §1.2.1. */
export type AlertaPendente30Dias = AlertaPendenteComplemento

/** Complemento pendente há mais de 60 dias — cancelamento permitido §1.9. */
export type AlertaPendente60Dias = AlertaPendenteComplemento

/** Códigos de vedação Portaria 55/1999 na decisão (§1.5). */
export type TfdVedacaoCodigo =
  | 'PAB'
  | 'DISTANCIA_MINIMA'
  | 'TRATAMENTO_EXPERIMENTAL'
  | 'REGIAO_METROPOLITANA'
  | 'PACIENTE_HOSPITALIZADO'

export type TfdVedacaoSeveridade = 'BLOQUEIO' | 'ALERTA'

export interface TfdVedacaoItem {
  codigo: TfdVedacaoCodigo
  severidade: TfdVedacaoSeveridade
  mensagem: string
}

/** Resultado da avaliação de vedações antes da aprovação. */
export interface TfdVedacoesResultado {
  itens: TfdVedacaoItem[]
  possuiBloqueio: boolean
  possuiAlerta: boolean
  exigeConfirmacao: boolean
  podeAprovar: boolean
}

/** Opção de solicitação anterior para vínculo de RETORNO — sem dados sensíveis. */
export interface TfdSolicitacaoOrigemRetornoItem {
  id: string
  protocolo: string
  especialidade: string
  prestador: {
    nome: string
    cidade: string
    estado: string
  }
  concluidoEm: string
}

// --- Sprint 1.8: Dashboard TFD ---

/** Saldo resumido no dashboard do gestor. @see docs/API_CONTRACTS.md §7.3 */
export interface TfdDashboardSaldoItem {
  id: string
  descricao: string
  fonte: TfdFonteRecursoValor
  valorTotal: number
  valorReservado: number
  valorUtilizado: number
  valorDisponivel: number
  percentualDisponivel: number
  alertaBaixo: boolean
}

/** Movimentação no extrato resumido do bloco financeiro do dashboard. */
export interface TfdDashboardFinanceiroMovimentacao {
  id: string
  criadoEm: string
  tipo: string
  descricao: string
  valor: number
  saldoId: string
  saldoDescricao: string
}

/** Bloco financeiro do dashboard gestor TFD. @see docs/SPRINTS.md Sprint 2.2 */
export interface TfdDashboardFinanceiroOutput {
  totalDisponivelConsolidado: number
  saldosEmAlerta: TfdDashboardSaldoItem[]
  extratoResumido: TfdDashboardFinanceiroMovimentacao[]
  quantidadeSaldosAtivos: number
}

/** KPIs e agregados do dashboard TFD. @see docs/API_CONTRACTS.md §7.3 */
export interface TfdDashboardOutput {
  totalSolicitacoes: number
  porStatus: Record<string, number>
  porUrgencia: Record<string, number>
  tempoMedioAprovacaoDias: number
  prestacoesPendentes: number
  viagensProximos7Dias: number
  saldos: TfdDashboardSaldoItem[]
}

/** Alerta operacional — solicitação MUITO_URGENTE em andamento (dashboard). */
export interface TfdAlertaUrgente {
  solicitacaoId: string
  protocolo: string
  status: string
  urgencia: string
  especialidade: string
  paciente: { nome: string }
  criadoEm: string
}

/** Alerta operacional — saldo com disponível abaixo de 20% do total (dashboard). */
export interface TfdAlertaSaldoBaixo {
  saldoId: string
  descricao: string
  fonte: TfdFonteRecursoValor
  valorTotal: number
  valorDisponivel: number
  percentualDisponivel: number
}

/** Alerta operacional — prestação de contas vencendo ou vencida (dashboard). */
export interface TfdAlertaPC {
  prestacaoId: string
  motivo: AlertaPrestacaoMotivo
  prazoEnvioAt: string
  sequenciaViagem: number
  solicitacao: {
    id: string
    protocolo: string
  }
}

// --- Dashboard operacional (servidor/atendente) ---

export interface TfdDashboardOperacionalKpis {
  pendentes: number
  emAnalise: number
  aprovadasMes: number
  negadasCanceladasMes: number
}

export type TfdAlertaPrazoAnaliseMotivo = 'VENCIDO' | 'PROXIMO_VENCIMENTO'

export interface TfdAlertaPrazoAnalise {
  solicitacaoId: string
  protocolo: string
  urgencia: string
  status: string
  motivo: TfdAlertaPrazoAnaliseMotivo
  diasUteisDecorridos: number
  pacienteNomeParcial: string
}

export interface TfdAlertaUrgenciaSemResposta {
  solicitacaoId: string
  protocolo: string
  urgencia: string
  status: string
  pacienteNomeParcial: string
  criadoEm: string
}

export interface TfdAlertaAgendamentoSemTransporte {
  viagemId: string
  solicitacaoId: string
  protocolo: string
  dataViagem: string
  horaSaida: string | null
  pacienteNomeParcial: string
  faltaMotorista: boolean
  faltaVeiculo: boolean
}

export interface TfdAtividadeRecenteItem {
  id: string
  criadoEm: string
  tipoAcao: string
  descricaoAcao: string
  pacienteNomeParcial: string
  protocolo: string
  solicitacaoId: string
  statusAtual: string
}

export interface TfdDashboardOperacionalOutput {
  kpis: TfdDashboardOperacionalKpis
  alertas: {
    prazoAnalise: TfdAlertaPrazoAnalise[]
    urgenciaSemResposta: TfdAlertaUrgenciaSemResposta[]
    agendamentosSemTransporte: TfdAlertaAgendamentoSemTransporte[]
  }
  atividadeRecente: TfdAtividadeRecenteItem[]
}

// --- Sprint 1.8: Relatórios ---

/** Filtros do relatório por competência (mês/ano). @see relatorioCompetenciaSchema */
export interface RelatorioCompetenciaInput {
  mes: number
  ano: number
}

/** Filtros do relatório por paciente. @see relatorioPacienteSchema */
export interface RelatorioPacienteInput {
  pacienteId: string
}

/** Dados agregados — relatório por competência (sem dados clínicos). */
export interface RelatorioCompetenciaData {
  mes: number
  ano: number
  porStatus: Record<string, number>
  valorTotalReservado: number
  valorTotalConsumido: number
  itens: RelatorioCompetenciaItem[]
}

export interface RelatorioCompetenciaItem {
  protocolo: string
  status: string
  valorReservado: number
  valorConsumido: number
}

/** Dados — relatório histórico por paciente (sem dados clínicos). */
export interface RelatorioPacienteData {
  paciente: { id: string; nome: string }
  itens: RelatorioPacienteItem[]
}

export interface RelatorioPacienteItem {
  protocolo: string
  especialidade: string
  status: string
  criadoEm: string
  decididoEm: string | null
}

export interface PacienteRelatorioBuscaItem {
  id: string
  nome: string
}

/** Período para relatórios por prestador/motorista. @see relatorioPrestadorSchema */
export interface RelatorioPeriodoInput {
  dataInicio: string
  dataFim: string
}

export interface RelatorioPrestadorInput extends RelatorioPeriodoInput {
  prestadorId?: string
}

export interface RelatorioPrestadorGrupoItem {
  prestadorId: string
  prestadorNome: string
  cidade: string
  estado: string
  volume: number
  valorReservado: number
  valorConsumido: number
}

export interface RelatorioPrestadorDetalheItem {
  prestadorNome: string
  protocolo: string
  status: string
  valorReservado: number
  valorConsumido: number
}

export interface RelatorioPrestadorData {
  dataInicio: string
  dataFim: string
  grupos: RelatorioPrestadorGrupoItem[]
  detalhes: RelatorioPrestadorDetalheItem[]
  valorTotalReservado: number
  valorTotalConsumido: number
}

export interface RelatorioMotoristaInput extends RelatorioPeriodoInput {
  motoristaId?: string
}

export interface RelatorioMotoristaGrupoItem {
  motoristaId: string
  motoristaNome: string
  totalViagens: number
  valorDespesas: number
}

export interface RelatorioMotoristaDetalheItem {
  motoristaNome: string
  protocolo: string
  dataViagem: string
  statusViagem: string
  valorDespesas: number
}

export interface RelatorioMotoristaData {
  dataInicio: string
  dataFim: string
  grupos: RelatorioMotoristaGrupoItem[]
  detalhes: RelatorioMotoristaDetalheItem[]
  valorTotalDespesas: number
}

export type RelatorioProducaoStatusChave = 'APROVADO' | 'NEGADO' | 'CONCLUIDO' | 'CANCELADO'

export interface RelatorioProducaoMensalInput {
  mes: number
  ano: number
}

export interface RelatorioProducaoStatusResumo {
  quantidade: number
  valorReservado: number
  valorConsumido: number
}

export interface RelatorioProducaoMensalData {
  mes: number
  ano: number
  porStatus: Record<RelatorioProducaoStatusChave, RelatorioProducaoStatusResumo>
  valorTotalReservado: number
  valorTotalConsumido: number
}

export interface RelatorioSelectOption {
  id: string
  nome: string
}

// --- Sprint 3.1: dados clínicos, perfil do paciente e fila ---

export interface TfdProcessoDadosClinicosOutput {
  processoId: string
  subjetivo: string | null
  objetivo: string | null
  avaliacao: string | null
  plano: string | null
  motivoQuadro: string | null
  observacao: string | null
  registradoPorNome: string | null
  updatedAt: string | null
}

export interface TfdPacientePerfilCadastro {
  id: string
  nome: string
  nomeSocial: string | null
  cpfMascarado: string | null
  cnsMascarado: string | null
  dataNascimento: string | null
  sexo: string | null
  email: string | null
  telefone: string | null
  telefoneCelular: string | null
  telefoneAlternativo: string | null
  racaCor: string | null
  nacionalidade: string | null
  identidadeGenero: string | null
  responsavelLegalNome: string | null
  responsavelLegalCpfMascarado: string | null
  municipio: string | null
  uf: string | null
  ativo: boolean
}

/** Processo TFD no histórico do paciente — sem CID/diagnóstico (LGPD §1.11). */
export interface TfdPacienteProcessoListItem {
  processoId: string
  solicitacaoId: string
  protocolo: string
  statusSolicitacao: string
  statusProcesso: string
  especialidadeNome: string | null
  prestadorNome: string | null
  prestadorCidade: string | null
  prestadorEstado: string | null
  posicaoFila: number | null
  criadoEm: string
  atualizadoEm: string
}

export interface TfdPacienteAgendamentoResumoItem {
  viagemId: string
  protocolo: string
  dataViagem: string
  statusViagem: string
  prestadorNome: string | null
  solicitacaoId: string
}

export interface TfdFilaMovimentacaoHistoricoItem {
  id: string
  tipoMovimentacao: string
  posicaoAnterior: number | null
  posicaoNova: number | null
  justificativa: string | null
  usuarioNome: string
  criadoEm: string
}

export interface TfdPacientePerfilOutput {
  cadastro: TfdPacientePerfilCadastro
  processos: TfdPacienteProcessoListItem[]
  processosTotal: number
  agendamentos: TfdPacienteAgendamentoResumoItem[]
  agendamentosTotal: number
}

// --- Sprint 3.2: entidade agendamento (consulta) ---

export interface AgendamentoProcessoListItem {
  id: string
  sequencia: number
  dataConsulta: string
  horaConsulta: string | null
  tipoAtendimento: string
  status: string
  prestador: {
    id: string | null
    nome: string | null
    cidade: string | null
    estado: string | null
  }
  profissionalNome: string | null
  acompanhante: {
    id: string | null
    nome: string | null
  }
  orientacoes: string | null
  createdAt: string
}

export interface AgendamentoDetalheOutput extends AgendamentoProcessoListItem {
  processoId: string
  solicitacaoId: string
  canceladoAt: string | null
  motivoCancelamento: string | null
  canceladoPor: {
    id: string
    nome: string
  } | null
  realizadoAt: string | null
  prestacaoConta: {
    id: string
    status: string
    prazoEnvioAt: string
  } | null
}

export interface AgendamentoNovoOutput {
  agendamentoId: string
  sequencia: number
}

// --- Outputs de queries (client-safe) ---

export interface TransporteAgendamentoItem {
  id: string
  sequencia: number
  tipoSegmento: string
  status: string
  origemDescricao: string
  destinoDescricao: string
  dataSaida: string
  horaSaida: string | null
  dataChegada: string | null
  horaChegada: string | null
  custoEstimado: number | null
  custoReal: number | null
  responsavelPagamento: string
  observacoes: string | null
  veiculo: {
    id: string
    placa: string
    modelo: string
  } | null
  motorista: {
    id: string
    nome: string
  } | null
  kmSaida: number | null
  kmChegada: number | null
  anexos: Array<{
    id: string
    tipoAnexo: string
    anexoId: string | null
  }>
}

export interface ProcessoTfdListItem {
  processoId: string
  protocolo: string
  statusProcesso: string
  paciente: {
    id: string
    nome: string
  } | null
  totalSolicitacoes: number
  urgenciaMaisCritica: string | null
  statusSolicitacaoMaisRecente: string | null
  ultimaMovimentacaoEm: string
  createdAt: string
}

export interface TfdAgendamentoConsultaListItem {
  id: string
  processoId: string
  solicitacaoId: string
  sequencia: number
  dataConsulta: string
  horaConsulta: string | null
  tipoAtendimento: string
  status: string
  protocolo: string
  pacienteNome: string
  prestador: {
    id: string | null
    nome: string | null
    cidade: string | null
    estado: string | null
  }
}

export interface ProcessoTfdDetalheOutput {
  id: string
  protocolo: string
  status: string
  titulo: string
  paciente: {
    id: string
    nome: string
    nomeSocial: string | null
    cpfMascarado: string | null
    cnsMascarado: string | null
    dataNascimento: string | null
    sexo: string | null
    email: string | null
    telefone: string | null
    telefoneCelular: string | null
    telefoneAlternativo: string | null
    racaCor: string | null
    nacionalidade: string | null
    identidadeGenero: string | null
    responsavelLegalNome: string | null
    responsavelLegalCpfMascarado: string | null
    municipio: string | null
    uf: string | null
    ativo: boolean
  } | null
  dadosClinicos: {
    subjetivo: string | null
    objetivo: string | null
    avaliacao: string | null
    plano: string | null
    motivoQuadro: string | null
    observacao: string | null
    registradoPorNome: string | null
    updatedAt: string | null
  }
  solicitacoes: Array<{
    id: string
    protocolo: string
    status: string
    urgencia: string
    tipoAtendimento: string
    especialidade: string | null
    prestador: string | null
    createdAt: string
  }>
  agendamentos: Array<{
    id: string
    sequencia: number
    dataConsulta: string
    horaConsulta: string | null
    status: string
    prestador: string | null
  }>
  tramitacoes: Array<{
    tipo: string
    descricao: string
    usuarioNome: string | null
    createdAt: string
  }>
  anexos: Array<{
    id: string
    nomeOriginal: string
    mimeType: string
    createdAt: string
    uploaderId: string | null
  }>
}

export interface PerfilServidorOutput {
  id: string
  nome: string
  email: string
  cpfMascarado: string | null
  matricula: string | null
  telefone: string | null
  role: string
  ativo: boolean
  permissions: Record<string, boolean>
  setores: Array<{
    id: string
    setorId: string
    setorNome: string
    cargo: string | null
    principal: boolean
    ativo: boolean
  }>
  motorista: {
    cnh: string
    cnhCategoria: string
    cnhValidade: string
    cnhVencida: boolean
    cnhVencendoEmBreve: boolean
  } | null
  ultimasAcoes: Array<{
    acao: string
    entidade: string
    entidadeId: string | null
    createdAt: string
  }>
}
