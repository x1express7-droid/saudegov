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

/** Linha do extrato de movimentações de um saldo. @see docs/API_CONTRACTS.md §7.4 */
export interface ExtratoMovimentacaoItem {
  tipo: string
  valor: number
  descricao: string
  protocolo: string | null
  usuarioNome: string
  criadoEm: string
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

/** Alerta operacional — complemento pendente há mais de 30 dias (gestor). */
export interface AlertaPendente30Dias {
  id: string
  protocolo: string
  paciente: { nome: string }
  complementoSolicitadoEm: string
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
  alertaBaixo: boolean
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
