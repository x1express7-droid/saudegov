'use server'

import { getSolicitacaoTfd } from '@saude/mod-saude-tfd'

/** Resolve o processo vinculado após `abrirSolicitacaoTfd` (payload não expõe processoId). */
export async function resolverProcessoIdSolicitacaoTfd(
  solicitacaoId: string
): Promise<string | null> {
  const detalhe = await getSolicitacaoTfd(solicitacaoId)
  return detalhe?.processoId ?? null
}
