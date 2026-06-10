// PC-PARTE-2: tipos de despesa TFD — Portaria SAS/MS nº 55/1999

export const TFD_TIPO_DESPESA_CONFIG = {
  // Tipos novos (fluxo ativo)
  TRANSPORTE_TERRESTRE: {
    label: 'Transporte terrestre',
    descricao:
      'Ônibus, van, táxi ou veículo próprio do município. Inclui combustível e pedágios.',
    icone: 'Bus',
    grupo: 'TRANSPORTE',
    ativo: true,
  },
  TRANSPORTE_AEREO: {
    label: 'Transporte aéreo',
    descricao: 'Passagem aérea. Anexe o bilhete de embarque ou comprovante de compra.',
    icone: 'Plane',
    grupo: 'TRANSPORTE',
    ativo: true,
  },
  TRANSPORTE_FLUVIAL: {
    label: 'Transporte fluvial',
    descricao: 'Barco ou lancha. Anexe o comprovante de passagem.',
    icone: 'Anchor',
    grupo: 'TRANSPORTE',
    ativo: true,
  },
  DIARIA_PACIENTE: {
    label: 'Diária do paciente',
    descricao:
      'Alimentação e hospedagem do paciente durante o tratamento. Valor conforme tabela SUS vigente.',
    icone: 'Hotel',
    grupo: 'DIARIA',
    ativo: true,
  },
  DIARIA_ACOMPANHANTE: {
    label: 'Diária do acompanhante',
    descricao:
      'Alimentação e hospedagem do acompanhante autorizado em laudo médico. Continua sendo paga mesmo durante internação do paciente.',
    icone: 'UserCheck',
    grupo: 'DIARIA',
    ativo: true,
  },
  OBITO: {
    label: 'Despesas com óbito',
    descricao:
      'Traslado do corpo e urna funerária em caso de falecimento no local do tratamento (Art. 6º, Portaria 55/1999). Requer autorização do gestor.',
    icone: 'AlertCircle',
    grupo: 'ESPECIAL',
    ativo: true,
  },
  DEVOLUCAO: {
    label: 'Devolução ao erário',
    descricao:
      'Valor a devolver ao município quando o adiantamento recebido foi maior que o gasto real. Gera guia de recolhimento.',
    icone: 'ArrowLeftRight',
    grupo: 'ESPECIAL',
    ativo: true,
  },
  // Tipos legados (somente leitura — dados históricos)
  TRANSPORTE: {
    label: 'Transporte (histórico)',
    descricao: 'Registro de transporte do modelo anterior.',
    icone: 'Car',
    grupo: 'LEGADO',
    ativo: false,
  },
  ALIMENTACAO: {
    label: 'Alimentação (histórico)',
    descricao: 'Registro de alimentação do modelo anterior.',
    icone: 'Utensils',
    grupo: 'LEGADO',
    ativo: false,
  },
  HOSPEDAGEM: {
    label: 'Hospedagem (histórico)',
    descricao: 'Registro de hospedagem do modelo anterior.',
    icone: 'Bed',
    grupo: 'LEGADO',
    ativo: false,
  },
  OUTRO: {
    label: 'Outro (histórico)',
    descricao: 'Registro de outros gastos do modelo anterior.',
    icone: 'MoreHorizontal',
    grupo: 'LEGADO',
    ativo: false,
  },
} as const

export type TfdTipoDespesaConfigKey = keyof typeof TFD_TIPO_DESPESA_CONFIG

/** Apenas tipos ativos para novos lançamentos. */
export const TFD_TIPOS_DESPESA_ATIVOS = Object.entries(TFD_TIPO_DESPESA_CONFIG)
  .filter(([, config]) => config.ativo)
  .map(([tipo, config]) => ({ tipo: tipo as TfdTipoDespesaConfigKey, ...config }))
