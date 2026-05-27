export interface AcompanhanteSolicitacaoOption {
  id: string
  nome: string
  relacao: string
}

const RELACAO_LABEL: Record<string, string> = {
  CONJUGE: 'Cônjuge',
  FILHO_A: 'Filho(a)',
  PAI_MAE: 'Pai/Mãe',
  RESPONSAVEL_LEGAL: 'Responsável legal',
  CUIDADOR: 'Cuidador',
  OUTRO: 'Outro',
}

export function labelRelacaoAcompanhante(relacao: string): string {
  return RELACAO_LABEL[relacao] ?? relacao
}
