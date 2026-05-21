import { validarCNS } from '@saude/validators'

import type { CadsusResult, CadsusService } from './types'

const NOMES_MOCK = [
  'Maria Silva Santos',
  'João Batista Lima',
  'Ana Paula Souza',
  'Pedro Henrique Costa',
  'Francisca Alves Ribeiro',
] as const

export class CadsusStub implements CadsusService {
  async buscarPorCns(cns: string): Promise<CadsusResult> {
    await new Promise((resolve) => setTimeout(resolve, 300))

    if (!this.validarCns(cns)) {
      return { encontrado: false }
    }

    const seed = parseInt(cns.slice(-3), 10)

    return {
      encontrado: true,
      nome: NOMES_MOCK[seed % NOMES_MOCK.length],
      dataNascimento: `19${60 + (seed % 40)}-${String((seed % 12) + 1).padStart(2, '0')}-15`,
      nomeMae: 'Dados CADSUS Stub',
      municipioNascimento: 'Campo Grande',
      sexo: seed % 2 === 0 ? 'FEMININO' : 'MASCULINO',
    }
  }

  private validarCns(cns: string): boolean {
    return validarCNS(cns)
  }
}
