'use client'

import type { MunicipioDetalhe } from '../../../../../lib/queries/get-municipio'
import { exportarDadosMunicipio } from '../../../../../lib/actions/exportar-dados-municipio'
import { MODULOS_SAUDE_EXPORT } from '../../../../../lib/validators/exportacao-municipio.schema'
import { Download } from 'lucide-react'
import { useMemo, useState, useTransition } from 'react'

const MODULO_LABELS: Record<(typeof MODULOS_SAUDE_EXPORT)[number], string> = {
  tfd: 'TFD — Tratamento Fora de Domicílio',
  regul: 'Regulação',
  visa: 'Vigilância Sanitária',
  farma: 'Farmácia',
  ubs: 'UBS',
  sment: 'Saúde Mental',
  vacin: 'Vacinação',
}

interface MunicipioExportacaoDialogProps {
  municipio: MunicipioDetalhe
}

export function MunicipioExportacaoDialog({ municipio }: MunicipioExportacaoDialogProps) {
  const [open, setOpen] = useState(false)
  const [formato, setFormato] = useState<'csv' | 'json'>('json')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [exportError, setExportError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const modulosAtivos = useMemo(() => {
    const saude = municipio.modules.saude ?? {}
    return MODULOS_SAUDE_EXPORT.filter((key) => saude[key] === true)
  }, [municipio.modules])

  const [modulosSelecionados, setModulosSelecionados] = useState<Set<string>>(
    () => new Set(modulosAtivos)
  )

  function toggleModulo(modulo: string) {
    setModulosSelecionados((prev) => {
      const next = new Set(prev)
      if (next.has(modulo)) {
        next.delete(modulo)
      } else {
        next.add(modulo)
      }
      return next
    })
  }

  function handleExportar() {
    setExportError(null)

    const modulos =
      modulosSelecionados.size === modulosAtivos.length
        ? undefined
        : [...modulosSelecionados]

    startTransition(async () => {
      const response = await exportarDadosMunicipio({
        tenantId: municipio.id,
        formato,
        ...(modulos && modulos.length > 0 ? { modulos } : {}),
        ...(dataInicio ? { dataInicio } : {}),
        ...(dataFim ? { dataFim } : {}),
      })

      if (!response.success) {
        setExportError(response.error)
        return
      }

      window.open(response.data.downloadUrl, '_blank', 'noopener,noreferrer')
      setOpen(false)
    })
  }

  return (
    <section className="flex flex-col gap-4 rounded-lg border border-neutral-200 p-6 dark:border-neutral-800">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-medium">Exportação de dados</h2>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
            Exportação completa do município para backup ou migração. Sem CID, diagnóstico ou
            dados clínicos sensíveis; CPF/CNS mascarados quando presentes.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setExportError(null)
            setOpen((value) => !value)
          }}
          className="inline-flex items-center gap-2 rounded border border-neutral-300 px-4 py-2 text-sm font-medium hover:bg-neutral-50 dark:border-neutral-600 dark:hover:bg-neutral-900"
        >
          <Download className="size-4" aria-hidden="true" />
          {open ? 'Fechar' : 'Exportar dados'}
        </button>
      </div>

      {open ? (
        <div className="flex flex-col gap-4 border-t border-neutral-200 pt-4 dark:border-neutral-800">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label htmlFor="export-formato" className="text-sm font-medium">
                Formato
              </label>
              <select
                id="export-formato"
                value={formato}
                disabled={isPending}
                onChange={(event) => setFormato(event.target.value as 'csv' | 'json')}
                className="rounded border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-950"
              >
                <option value="json">JSON (estruturado)</option>
                <option value="csv">CSV (planilha)</option>
              </select>
            </div>
            <div className="flex flex-col gap-1 text-sm text-neutral-600 dark:text-neutral-400">
              <span className="font-medium text-neutral-900 dark:text-neutral-100">
                Município
              </span>
              <span>{municipio.nome}</span>
              <span className="font-mono text-xs">{municipio.id}</span>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label htmlFor="export-data-inicio" className="text-sm font-medium">
                Data início (opcional)
              </label>
              <input
                id="export-data-inicio"
                type="date"
                value={dataInicio}
                disabled={isPending}
                onChange={(event) => setDataInicio(event.target.value)}
                className="rounded border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-950"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="export-data-fim" className="text-sm font-medium">
                Data fim (opcional)
              </label>
              <input
                id="export-data-fim"
                type="date"
                value={dataFim}
                disabled={isPending}
                onChange={(event) => setDataFim(event.target.value)}
                className="rounded border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-950"
              />
            </div>
          </div>

          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-medium">Módulos ativos</legend>
            {modulosAtivos.length === 0 ? (
              <p className="text-sm text-neutral-500">Nenhum módulo de saúde ativo neste município.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {modulosAtivos.map((modulo) => (
                  <li key={modulo}>
                    <label className="flex cursor-pointer items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={modulosSelecionados.has(modulo)}
                        disabled={isPending}
                        onChange={() => toggleModulo(modulo)}
                        className="size-4 rounded border-neutral-300"
                      />
                      {MODULO_LABELS[modulo]}
                    </label>
                  </li>
                ))}
              </ul>
            )}
            <p className="text-xs text-neutral-500">
              Se todos os módulos ativos estiverem marcados, a exportação inclui todos. Módulos sem
              implementação retornam aviso no arquivo.
            </p>
          </fieldset>

          {exportError ? (
            <p role="alert" className="text-sm text-red-600">
              {exportError}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={isPending || modulosAtivos.length === 0 || modulosSelecionados.size === 0}
              aria-busy={isPending}
              onClick={handleExportar}
              className="rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-neutral-100 dark:text-neutral-900"
            >
              {isPending ? 'Exportando…' : 'Gerar exportação'}
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => setOpen(false)}
              className="rounded border border-neutral-300 px-4 py-2 text-sm dark:border-neutral-600"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : null}
    </section>
  )
}
