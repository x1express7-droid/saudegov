import type { PermissaoCatalogoItem } from './permissoes-catalogo'

export interface PermissaoGrupo {
  id: string
  label: string
  descricao: string
}

export interface PermissaoGrupoComItens {
  grupo: PermissaoGrupo
  itens: PermissaoCatalogoItem[]
}

const GRUPOS_TFD: Record<string, PermissaoGrupo> = {
  solicitacao: {
    id: 'solicitacao',
    label: 'Solicitação e regulação',
    descricao: 'Entrada de pedidos, análise de laudos e complementação de informações.',
  },
  decisoes: {
    id: 'decisoes',
    label: 'Decisões gerenciais',
    descricao: 'Aprovação, negação e cancelamento de processos TFD.',
  },
  processo: {
    id: 'processo',
    label: 'Processo e prontuário',
    descricao: 'Gestão do processo clínico, fila de regulação e perfil do paciente.',
  },
  agendamento: {
    id: 'agendamento',
    label: 'Agendamento e transporte',
    descricao: 'Consultas agendadas, viagens, frota e registro de retorno.',
  },
  financeiro: {
    id: 'financeiro',
    label: 'Financeiro',
    descricao: 'Despesas, prestação de contas e controle de saldos.',
  },
  relatorios: {
    id: 'relatorios',
    label: 'Relatórios e indicadores',
    descricao: 'Dashboards operacionais e exportação de relatórios.',
  },
  cadastros: {
    id: 'cadastros',
    label: 'Cadastros do módulo',
    descricao: 'Especialidades, procedimentos e prestadores vinculados ao TFD.',
  },
}

const ORDEM_GRUPOS_TFD = [
  'solicitacao',
  'decisoes',
  'processo',
  'agendamento',
  'financeiro',
  'relatorios',
  'cadastros',
] as const

const KEY_GRUPO_TFD: Record<string, (typeof ORDEM_GRUPOS_TFD)[number]> = {
  'saude.tfd.abrir_solicitacao': 'solicitacao',
  'saude.tfd.analisar_laudo': 'solicitacao',
  'saude.tfd.solicitar_complemento': 'solicitacao',
  'saude.tfd.decidir_solicitacao': 'decisoes',
  'saude.tfd.cancelar_processo': 'decisoes',
  'saude.tfd.gerenciar_processo': 'processo',
  'saude.tfd.registrar_dados_clinicos': 'processo',
  'saude.tfd.ver_perfil_paciente': 'processo',
  'saude.tfd.mover_fila': 'processo',
  'saude.tfd.criar_agendamento': 'agendamento',
  'saude.tfd.agendar_viagem': 'agendamento',
  'saude.tfd.gerenciar_transporte': 'agendamento',
  'saude.tfd.registrar_retorno': 'agendamento',
  'saude.tfd.gerenciar_frota': 'agendamento',
  'saude.tfd.registrar_despesa': 'financeiro',
  'saude.tfd.enviar_prestacao': 'financeiro',
  'saude.tfd.aprovar_prestacao': 'financeiro',
  'saude.tfd.gerenciar_saldo': 'financeiro',
  'saude.tfd.ver_dashboard': 'relatorios',
  'saude.tfd.exportar_relatorio': 'relatorios',
  'saude.tfd.configurar_especialidades': 'cadastros',
  'saude.tfd.configurar_procedimentos': 'cadastros',
  'saude.tfd.configurar_prestadores': 'cadastros',
}

function agruparCatalogoTfd(catalogo: PermissaoCatalogoItem[]): PermissaoGrupoComItens[] {
  const buckets = new Map<string, PermissaoCatalogoItem[]>()

  for (const item of catalogo) {
    const grupoId = KEY_GRUPO_TFD[item.key] ?? 'processo'
    const list = buckets.get(grupoId) ?? []
    list.push(item)
    buckets.set(grupoId, list)
  }

  return ORDEM_GRUPOS_TFD.flatMap((grupoId) => {
    const itens = buckets.get(grupoId)
    if (!itens?.length) {
      return []
    }
    return [{ grupo: GRUPOS_TFD[grupoId]!, itens }]
  })
}

export function agruparCatalogoPermissoes(
  moduloChave: string,
  catalogo: PermissaoCatalogoItem[]
): PermissaoGrupoComItens[] {
  if (moduloChave === 'saude.tfd') {
    return agruparCatalogoTfd(catalogo)
  }

  return [
    {
      grupo: {
        id: 'geral',
        label: 'Permissões do módulo',
        descricao: 'Selecione as ações que este servidor poderá executar.',
      },
      itens: catalogo,
    },
  ]
}

export function minRoleLabel(minRole: PermissaoCatalogoItem['minRole']): string {
  return minRole === 'GESTOR' ? 'Gestor' : 'Servidor'
}
