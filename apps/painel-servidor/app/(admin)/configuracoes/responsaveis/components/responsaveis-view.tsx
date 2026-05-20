'use client'

import { definirSetorResponsavelModulo } from '../../../../../lib/actions/responsaveis'
import type { ModuloAtivoItem, SetorResponsavelItem, SetorSelectOption } from '../../../../../lib/types/responsaveis.types'
import { Alert, Button, Card, EmptyState, Select, Spinner } from '@saude/ui'
import { Network } from 'lucide-react'
import { useMemo, useState, useTransition } from 'react'

interface ResponsaveisViewProps {
  modulos: ModuloAtivoItem[]
  responsaveis: SetorResponsavelItem[]
  setoresOpcoes: SetorSelectOption[]
}

export function ResponsaveisView({
  modulos,
  responsaveis,
  setoresOpcoes,
}: ResponsaveisViewProps) {
  const responsavelPorModulo = useMemo(() => {
    const map = new Map<string, string>()
    for (const row of responsaveis) {
      if (!row.ativo) {
        continue
      }
      if (!map.has(row.modulo)) {
        map.set(row.modulo, row.setorId)
      }
    }
    return map
  }, [responsaveis])

  const [selecoes, setSelecoes] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {}
    for (const modulo of modulos) {
      initial[modulo.chave] = responsavelPorModulo.get(modulo.chave) ?? ''
    }
    return initial
  })

  const [erros, setErros] = useState<Record<string, string>>({})
  const [sucesso, setSucesso] = useState<Record<string, boolean>>({})
  const [pendingModulo, setPendingModulo] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const selectOptions = useMemo(
    () => setoresOpcoes.map((s) => ({ value: s.value, label: s.label })),
    [setoresOpcoes]
  )

  function salvarModulo(moduloChave: string) {
    setErros((prev) => {
      const next = { ...prev }
      delete next[moduloChave]
      return next
    })
    setSucesso((prev) => {
      const next = { ...prev }
      delete next[moduloChave]
      return next
    })

    const setorId = selecoes[moduloChave]
    if (!setorId) {
      setErros((prev) => ({ ...prev, [moduloChave]: 'Selecione um setor.' }))
      return
    }

    setPendingModulo(moduloChave)
    startTransition(async () => {
      const response = await definirSetorResponsavelModulo({
        modulo: moduloChave,
        setorId,
      })

      setPendingModulo(null)

      if (!response.success) {
        setErros((prev) => ({
          ...prev,
          [moduloChave]: response.error ?? 'Não foi possível salvar.',
        }))
        return
      }

      setSucesso((prev) => ({ ...prev, [moduloChave]: true }))
      setTimeout(() => {
        setSucesso((prev) => {
          const next = { ...prev }
          delete next[moduloChave]
          return next
        })
      }, 3000)
    })
  }

  if (modulos.length === 0) {
    return (
      <EmptyState
        icon={<Network className="size-10" aria-hidden="true" />}
        titulo="Nenhum módulo ativo"
        descricao="Quando a equipe saudegov habilitar um módulo para o município, ele aparecerá aqui para vincular o setor responsável."
      />
    )
  }

  if (setoresOpcoes.length === 0) {
    return (
      <Alert variant="warning" titulo="Organograma necessário">
        Cadastre pelo menos um setor ativo em{' '}
        <a href="/configuracoes/organograma" className="font-medium text-[var(--color-primary)] underline">
          Organograma
        </a>{' '}
        antes de definir responsáveis por módulo.
      </Alert>
    )
  }

  return (
    <ul className="flex flex-col gap-[var(--space-4)]">
      {modulos.map((modulo) => {
        const erro = erros[modulo.chave]
        const salvou = sucesso[modulo.chave]
        const salvando = isPending && pendingModulo === modulo.chave

        return (
          <li key={modulo.chave}>
            <Card
              header={
                <div className="flex flex-col gap-[var(--space-1)]">
                  <p className="font-semibold text-[var(--color-text)]">{modulo.label}</p>
                  <p className="font-mono text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
                    {modulo.chave}
                  </p>
                </div>
              }
            >
              <div className="flex flex-col gap-[var(--space-4)] sm:flex-row sm:items-end">
                <div className="min-w-0 flex-1">
                  <Select
                    label="Setor responsável"
                    placeholder="Selecione o setor..."
                    value={selecoes[modulo.chave] || undefined}
                    onValueChange={(value) =>
                      setSelecoes((prev) => ({ ...prev, [modulo.chave]: value }))
                    }
                    options={selectOptions}
                    error={erro}
                    required
                  />
                </div>
                <Button
                  type="button"
                  disabled={salvando || !selecoes[modulo.chave]}
                  onClick={() => salvarModulo(modulo.chave)}
                  className="shrink-0"
                >
                  {salvando ? (
                    <>
                      <Spinner className="size-4" />
                      Salvando…
                    </>
                  ) : (
                    'Salvar'
                  )}
                </Button>
              </div>
              {salvou ? (
                <p className="mt-[var(--space-3)] text-[length:var(--text-sm)] text-[var(--color-success)]">
                  Setor responsável atualizado.
                </p>
              ) : null}
            </Card>
          </li>
        )
      })}
    </ul>
  )
}
