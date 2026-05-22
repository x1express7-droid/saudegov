/**
 * Verifica se a capacidade de passageiros do veículo comporta paciente e acompanhante.
 * Motorista não ocupa assento (BUSINESS_RULES.md §1.6).
 */
export function verificaCapacidadeVeiculo(
  capacidadePassageiros: number,
  acompanhanteNecessario: boolean
): boolean {
  const ocupacaoNecessaria = 1 + (acompanhanteNecessario ? 1 : 0)
  return capacidadePassageiros >= ocupacaoNecessaria
}

/** Próximo número de sequência para viagens da mesma solicitação. */
export function calcProximaSequenciaViagem(viagensExistentes: number): number {
  return viagensExistentes + 1
}
