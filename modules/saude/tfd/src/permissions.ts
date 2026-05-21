import type { UserRole } from '@saude/core-auth'

/** Chaves granulares do módulo TFD — única fonte de permissões do MVP. */
export const TFD_PERMISSIONS = {
  ABRIR_SOLICITACAO: 'saude.tfd.abrir_solicitacao',
  ANALISAR_LAUDO: 'saude.tfd.analisar_laudo',
  SOLICITAR_COMPLEMENTO: 'saude.tfd.solicitar_complemento',
  AGENDAR_VIAGEM: 'saude.tfd.agendar_viagem',
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
    descricao: 'CRUD de especialidades médicas (ADMIN).',
    minRole: 'ADMIN',
  },
  {
    key: TFD_PERMISSIONS.CONFIGURAR_PROCEDIMENTOS,
    label: 'Configurar procedimentos',
    descricao: 'CRUD de procedimentos vinculados a especialidades (ADMIN).',
    minRole: 'ADMIN',
  },
  {
    key: TFD_PERMISSIONS.CONFIGURAR_PRESTADORES,
    label: 'Configurar prestadores',
    descricao: 'CRUD de prestadores externos (ADMIN).',
    minRole: 'ADMIN',
  },
] as const

/** Permissões atribuíveis via toggles (exclui teto ADMIN — papel implícito). */
export const TFD_GRANULAR_PERMISSION_DEFINITIONS = TFD_PERMISSION_DEFINITIONS.filter(
  (item) => item.minRole !== 'ADMIN'
)

export const TFD_PERMISSION_KEYS = TFD_PERMISSION_DEFINITIONS.map((item) => item.key)
