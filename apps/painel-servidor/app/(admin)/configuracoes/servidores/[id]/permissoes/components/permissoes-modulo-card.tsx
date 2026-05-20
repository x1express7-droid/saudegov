'use client'

import { atualizarPermissoesServidor } from '../../../../../../../lib/actions/permissoes'
import type { ModuloPermissoesGrupo } from '../../../../../../../lib/types/permissoes.types'
import { Button, Card, Spinner, cn } from '@saude/ui'
import { useState, useTransition } from 'react'

interface PermissoesModuloCardProps {
  servidorId: string
  grupo: ModuloPermissoesGrupo
  disabled?: boolean
}

export function PermissoesModuloCard({
  servidorId,
  grupo,
  disabled = false,
}: PermissoesModuloCardProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [valores, setValores] = useState<Record<string, boolean>>(() => ({ ...grupo.valores }))

  function toggle(key: string) {
    if (disabled || isPending) {
      return
    }
    setSuccess(false)
    setValores((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  function handleSave() {
    setError(null)
    setSuccess(false)

    startTransition(async () => {
      const payload: Record<string, boolean> = {}
      for (const item of grupo.catalogo) {
        payload[item.key] = valores[item.key] === true
      }

      const res = await atualizarPermissoesServidor({
        servidorId,
        moduloChave: grupo.moduloChave,
        permissions: payload,
      })

      if (!res.success) {
        setError(res.error)
        return
      }

      setSuccess(true)
    })
  }

  return (
    <Card className="flex flex-col gap-[var(--space-4)] p-[var(--space-4)]">
      <div className="flex flex-col gap-[var(--space-1)]">
        <h3 className="text-[length:var(--text-base)] font-semibold text-[var(--color-text)]">
          {grupo.moduloLabel}
        </h3>
        <p className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
          Chave: <code className="text-[length:var(--text-xs)]">{grupo.moduloChave}</code>
        </p>
      </div>

      {error ? (
        <p role="alert" className="text-[length:var(--text-sm)] text-[var(--color-error)]">
          {error}
        </p>
      ) : null}

      {success ? (
        <p className="text-[length:var(--text-sm)] text-[var(--color-success)]">
          Permissões do módulo salvas.
        </p>
      ) : null}

      <ul className="flex flex-col gap-[var(--space-2)]">
        {grupo.catalogo.map((item) => {
          const ativo = valores[item.key] === true
          return (
            <li key={item.key}>
              <label
                className={cn(
                  'flex cursor-pointer items-start gap-[var(--space-3)] rounded-[var(--radius)] border border-[var(--color-border)] px-[var(--space-3)] py-[var(--space-3)]',
                  ativo && 'border-[var(--color-primary)] bg-[var(--color-primary-light)]',
                  (isPending || disabled) && 'cursor-not-allowed opacity-60'
                )}
              >
                <input
                  type="checkbox"
                  className="mt-0.5 size-4 shrink-0 accent-[var(--color-primary)]"
                  checked={ativo}
                  onChange={() => toggle(item.key)}
                  disabled={isPending || disabled}
                />
                <span className="flex min-w-0 flex-1 flex-col gap-[var(--space-1)]">
                  <span className="text-[length:var(--text-sm)] font-medium text-[var(--color-text)]">
                    {item.label}
                  </span>
                  <span className="text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
                    {item.descricao} · mín. {item.minRole === 'GESTOR' ? 'Gestor' : 'Servidor'}
                  </span>
                </span>
              </label>
            </li>
          )
        })}
      </ul>

      <Button
        type="button"
        variant="primary"
        onClick={handleSave}
        disabled={isPending || disabled}
        className="self-start"
      >
        {isPending ? (
          <>
            <Spinner className="size-4" />
            Salvando...
          </>
        ) : (
          `Salvar permissões — ${grupo.moduloLabel}`
        )}
      </Button>
    </Card>
  )
}
