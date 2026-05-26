/** Limite de segurança para exportação CSV de listagens TFD. */
export const LISTAGEM_EXPORT_MAX_REGISTROS = 50_000

export class ListagemExportError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ListagemExportError'
  }
}

export function assertListagemExportWithinLimit(total: number, contexto: string): void {
  if (total > LISTAGEM_EXPORT_MAX_REGISTROS) {
    throw new ListagemExportError(
      `A exportação de ${contexto} possui ${total.toLocaleString('pt-BR')} registros. Refine os filtros (máximo ${LISTAGEM_EXPORT_MAX_REGISTROS.toLocaleString('pt-BR')} por exportação).`
    )
  }
}
