/** Rótulos para exibição de chaves saude.{modulo} ativas no tenant. */
export const MODULO_LABELS: Record<string, string> = {
  'saude.tfd': 'TFD — Tratamento Fora de Domicílio',
  'saude.regul': 'Regulação',
  'saude.visa': 'Vigilância Sanitária',
  'saude.farma': 'Farmácia',
  'saude.ubs': 'UBS',
  'saude.sment': 'Saúde Mental',
  'saude.vacin': 'Vacinação',
}

export function parseModulosAtivos(
  modules: unknown
): Array<{ chave: string; label: string }> {
  const result: Array<{ chave: string; label: string }> = []

  if (typeof modules !== 'object' || modules === null) {
    return result
  }

  const raw = modules as Record<string, unknown>

  for (const [sistema, modulos] of Object.entries(raw)) {
    if (typeof modulos !== 'object' || modulos === null) {
      continue
    }

    for (const [modulo, ativo] of Object.entries(modulos as Record<string, unknown>)) {
      if (ativo !== true) {
        continue
      }

      const chave = `${sistema}.${modulo}`
      result.push({
        chave,
        label: MODULO_LABELS[chave] ?? chave,
      })
    }
  }

  return result.sort((a, b) => a.chave.localeCompare(b.chave))
}
