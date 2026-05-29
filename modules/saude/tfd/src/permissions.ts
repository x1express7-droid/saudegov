import type { UserRole } from '@saude/core-auth'

/** Chaves granulares do módulo TFD — única fonte de permissões do MVP. */
export const TFD_PERMISSIONS = {
  ABRIR_SOLICITACAO: 'saude.tfd.abrir_solicitacao',
  ANALISAR_LAUDO: 'saude.tfd.analisar_laudo',
  SOLICITAR_COMPLEMENTO: 'saude.tfd.solicitar_complemento',
  AGENDAR_VIAGEM: 'saude.tfd.agendar_viagem',
  CRIAR_AGENDAMENTO: 'saude.tfd.criar_agendamento',
  GERENCIAR_TRANSPORTE: 'saude.tfd.gerenciar_transporte',
  REGISTRAR_RETORNO: 'saude.tfd.registrar_retorno',
  REGISTRAR_DESPESA: 'saude.tfd.registrar_despesa',
  ENVIAR_PRESTACAO: 'saude.tfd.enviar_prestacao',
  DECIDIR_SOLICITACAO: 'saude.tfd.decidir_solicitacao',
  APROVAR_PRESTACAO: 'saude.tfd.aprovar_prestacao',
  GERENCIAR_SALDO: 'saude.tfd.gerenciar_saldo',
  GERENCIAR_FROTA: 'saude.tfd.gerenciar_frota',
  CANCELAR_PROCESSO: 'saude.tfd.cancelar_processo',
  VER_DASHBOARD: 'saude.tfd.ver_dashboard',
  EXPORTAR_RELATORIO: 'saude.tfd.exportar_relatorio',
  CONFIGURAR: 'saude.tfd.configurar',
  CONFIGURAR_ESPECIALIDADES: 'saude.tfd.configurar_especialidades',
  CONFIGURAR_PROCEDIMENTOS: 'saude.tfd.configurar_procedimentos',
  CONFIGURAR_PRESTADORES: 'saude.tfd.configurar_prestadores',
  REGISTRAR_DADOS_CLINICOS: 'saude.tfd.registrar_dados_clinicos',
  MOVER_FILA: 'saude.tfd.mover_fila',
  VER_PERFIL_PACIENTE: 'saude.tfd.ver_perfil_paciente',
  GERENCIAR_PROCESSO: 'saude.tfd.gerenciar_processo',
  GERENCIAR_VIAGEM: 'saude.tfd.gerenciar_viagem',
  MONITORAR_VIAGEM: 'saude.tfd.monitorar_viagem',
} as const

export type TfdPermissionKey = (typeof TFD_PERMISSIONS)[keyof typeof TFD_PERMISSIONS]

export type PermissionMinRole = Extract<UserRole, 'SERVIDOR' | 'GESTOR' | 'ADMIN'>

export interface TfdPermissionDefinition {
  key: TfdPermissionKey
  label: string
  descricao: string
  minRole: PermissionMinRole
}

/** Metadados para UI e validação de teto por papel (AUTH_PERMISSIONS.md §3.1). */
export const TFD_PERMISSION_DEFINITIONS: readonly TfdPermissionDefinition[] = [
  {
    key: TFD_PERMISSIONS.ABRIR_SOLICITACAO,
    label: 'Abrir solicitação',
    descricao: 'Registrar nova solicitação de TFD.',
    minRole: 'SERVIDOR',
  },
  {
    key: TFD_PERMISSIONS.ANALISAR_LAUDO,
    label: 'Analisar laudo',
    descricao: 'Ver CID/diagnóstico e iniciar análise médica.',
    minRole: 'SERVIDOR',
  },
  {
    key: TFD_PERMISSIONS.SOLICITAR_COMPLEMENTO,
    label: 'Solicitar complemento',
    descricao: 'Solicitar informações adicionais ao solicitante.',
    minRole: 'SERVIDOR',
  },
  {
    key: TFD_PERMISSIONS.AGENDAR_VIAGEM,
    label: 'Agendar viagem',
    descricao: 'Definir data, veículo e motorista.',
    minRole: 'SERVIDOR',
  },
  {
    key: TFD_PERMISSIONS.CRIAR_AGENDAMENTO,
    label: 'Criar agendamento',
    descricao: 'Registrar consulta ou atendimento agendado no processo TFD.',
    minRole: 'SERVIDOR',
  },
  {
    key: TFD_PERMISSIONS.GERENCIAR_TRANSPORTE,
    label: 'Gerenciar transporte',
    descricao: 'Criar e operar segmentos de transporte vinculados a agendamentos TFD.',
    minRole: 'SERVIDOR',
  },
  {
    key: TFD_PERMISSIONS.REGISTRAR_RETORNO,
    label: 'Registrar retorno',
    descricao: 'Registrar retorno após viagem realizada.',
    minRole: 'SERVIDOR',
  },
  {
    key: TFD_PERMISSIONS.REGISTRAR_DESPESA,
    label: 'Registrar despesa',
    descricao: 'Lançar itens de despesa com comprovante.',
    minRole: 'SERVIDOR',
  },
  {
    key: TFD_PERMISSIONS.ENVIAR_PRESTACAO,
    label: 'Enviar prestação de contas',
    descricao: 'Enviar prestação de contas para aprovação.',
    minRole: 'SERVIDOR',
  },
  {
    key: TFD_PERMISSIONS.DECIDIR_SOLICITACAO,
    label: 'Decidir solicitação',
    descricao: 'Aprovar ou negar solicitação TFD.',
    minRole: 'GESTOR',
  },
  {
    key: TFD_PERMISSIONS.APROVAR_PRESTACAO,
    label: 'Aprovar prestação',
    descricao: 'Aprovar prestação de contas financeira.',
    minRole: 'GESTOR',
  },
  {
    key: TFD_PERMISSIONS.GERENCIAR_SALDO,
    label: 'Gerenciar saldo',
    descricao: 'Cadastrar e visualizar saldos financeiros.',
    minRole: 'GESTOR',
  },
  {
    key: TFD_PERMISSIONS.GERENCIAR_FROTA,
    label: 'Gerenciar frota',
    descricao: 'Cadastrar veículos e motoristas.',
    minRole: 'GESTOR',
  },
  {
    key: TFD_PERMISSIONS.CANCELAR_PROCESSO,
    label: 'Cancelar processo',
    descricao: 'Cancelar solicitação com motivo obrigatório.',
    minRole: 'GESTOR',
  },
  {
    key: TFD_PERMISSIONS.VER_DASHBOARD,
    label: 'Ver dashboard',
    descricao: 'Acessar dashboard financeiro e KPIs.',
    minRole: 'GESTOR',
  },
  {
    key: TFD_PERMISSIONS.EXPORTAR_RELATORIO,
    label: 'Exportar relatório',
    descricao: 'Gerar e baixar relatórios.',
    minRole: 'GESTOR',
  },
  {
    key: TFD_PERMISSIONS.CONFIGURAR,
    label: 'Configurar módulo TFD',
    descricao: 'Configurações gerais do módulo (ADMIN).',
    minRole: 'ADMIN',
  },
  {
    key: TFD_PERMISSIONS.CONFIGURAR_ESPECIALIDADES,
    label: 'Configurar especialidades',
    descricao: 'CRUD de especialidades médicas.',
    minRole: 'GESTOR',
  },
  {
    key: TFD_PERMISSIONS.CONFIGURAR_PROCEDIMENTOS,
    label: 'Configurar procedimentos',
    descricao: 'CRUD de procedimentos vinculados a especialidades.',
    minRole: 'GESTOR',
  },
  {
    key: TFD_PERMISSIONS.CONFIGURAR_PRESTADORES,
    label: 'Configurar prestadores',
    descricao: 'CRUD de prestadores externos.',
    minRole: 'GESTOR',
  },
  {
    key: TFD_PERMISSIONS.REGISTRAR_DADOS_CLINICOS,
    label: 'Registrar dados clínicos',
    descricao: 'Preencher dados SOAP do processo TFD.',
    minRole: 'SERVIDOR',
  },
  {
    key: TFD_PERMISSIONS.MOVER_FILA,
    label: 'Mover na fila',
    descricao: 'Alterar posição do paciente na fila de regulação com justificativa.',
    minRole: 'GESTOR',
  },
  {
    key: TFD_PERMISSIONS.VER_PERFIL_PACIENTE,
    label: 'Ver perfil do paciente',
    descricao: 'Acessar perfil completo do paciente com histórico de processos TFD.',
    minRole: 'SERVIDOR',
  },
  {
    key: TFD_PERMISSIONS.GERENCIAR_PROCESSO,
    label: 'Gerenciar processos TFD',
    descricao: 'Criar e editar processos TFD.',
    minRole: 'SERVIDOR',
  },
  {
    key: TFD_PERMISSIONS.GERENCIAR_VIAGEM,
    label: 'Gerenciar viagens',
    descricao: 'Criar e editar viagens TFD.',
    minRole: 'SERVIDOR',
  },
  {
    key: TFD_PERMISSIONS.MONITORAR_VIAGEM,
    label: 'Monitorar viagens',
    descricao: 'Visualizar detalhes e acompanhar viagens.',
    minRole: 'SERVIDOR',
  },
] as const

/** Permissões atribuíveis via toggles (exclui teto ADMIN — papel implícito). */
export const TFD_GRANULAR_PERMISSION_DEFINITIONS = TFD_PERMISSION_DEFINITIONS.filter(
  (item) => item.minRole !== 'ADMIN'
)

export const TFD_PERMISSION_KEYS = TFD_PERMISSION_DEFINITIONS.map((item) => item.key)
