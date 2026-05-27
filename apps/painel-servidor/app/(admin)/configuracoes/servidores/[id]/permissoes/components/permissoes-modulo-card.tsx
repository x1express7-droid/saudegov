'use client'

import { atualizarPermissoesServidor } from '../../../../../../../lib/actions/permissoes'
import type { ModuloPermissoesGrupo } from '../../../../../../../lib/types/permissoes.types'
import type { PermissaoCatalogoItem } from '../../../../../../../lib/utils/permissoes-catalogo'
import {
  agruparCatalogoPermissoes,
  minRoleLabel,
} from '../../../../../../../lib/utils/permissoes-grupos'
import { Badge, Button, Card, CardFooter, CardHeader, Spinner, cn } from '@saude/ui'
import { CheckCircle2 } from 'lucide-react'
import { useMemo, useState, useTransition } from 'react'

interface PermissoesModuloCardProps {
  servidorId: string
  grupo: ModuloPermissoesGrupo
  disabled?: boolean
}

function countAtivas(valores: Record<string, boolean>, keys: string[]): number {
  return keys.filter((key) => valores[key] === true).length
}

function permissoesIguais(
  a: Record<string, boolean>,
  b: Record<string, boolean>,
  keys: string[]
): boolean {
  return keys.every((key) => a[key] === b[key])
}

interface PermissaoToggleRowProps {
  item: PermissaoCatalogoItem
  ativo: boolean
  disabled: boolean
  onToggle: () => void
}

function PermissaoToggleRow({ item, ativo, disabled, onToggle }: PermissaoToggleRowProps) {
  return (
    <label
      className={cn(
        'flex cursor-pointer items-start gap-[var(--space-3)] px-[var(--space-4)] py-[var(--space-3)] transition-colors',
        'hover:bg-[var(--color-bg)]',
        ativo && 'bg-[color-mix(in_srgb,var(--color-primary-light)_35%,transparent)]',
        disabled && 'cursor-not-allowed opacity-60 hover:bg-transparent'
      )}
    >
      <input
        type="checkbox"
        className="mt-0.5 size-4 shrink-0 accent-[var(--color-primary)]"
        checked={ativo}
        onChange={onToggle}
        disabled={disabled}
        aria-describedby={`perm-desc-${item.key}`}
      />
      <span className="flex min-w-0 flex-1 flex-col gap-[var(--space-1)] sm:flex-row sm:items-start sm:justify-between sm:gap-[var(--space-4)]">
        <span className="min-w-0 flex-1">
          <span className="text-[length:var(--text-sm)] font-medium text-[var(--color-text)]">
            {item.label}
          </span>
          <p
            id={`perm-desc-${item.key}`}
            className="mt-[var(--space-1)] text-[length:var(--text-xs)] leading-relaxed text-[var(--color-text-muted)]"
          >
            {item.descricao}
          </p>
        </span>
        <Badge
          variant={item.minRole === 'GESTOR' ? 'purple' : 'gray'}
          size="sm"
          className="shrink-0 self-start"
        >
          mín. {minRoleLabel(item.minRole)}
        </Badge>
      </span>
    </label>
  )
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

  const catalogoKeys = useMemo(
    () => grupo.catalogo.map((item) => item.key),
    [grupo.catalogo]
  )

  const grupos = useMemo(
    () => agruparCatalogoPermissoes(grupo.moduloChave, grupo.catalogo),
    [grupo.moduloChave, grupo.catalogo]
  )

  const totalAtivas = countAtivas(valores, catalogoKeys)
  const hasChanges = !permissoesIguais(valores, grupo.valores, catalogoKeys)
  const isInteractionDisabled = disabled || isPending

  function toggle(key: string) {
    if (isInteractionDisabled) {
      return
    }
    setSuccess(false)
    setValores((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  function setGrupoValores(keys: string[], value: boolean) {
    if (isInteractionDisabled) {
      return
    }
    setSuccess(false)
    setValores((prev) => {
      const next = { ...prev }
      for (const key of keys) {
        next[key] = value
      }
      return next
    })
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
    <Card
      className="overflow-hidden"
      header={
        <div className="flex flex-col gap-[var(--space-3)] sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <CardHeader className="text-[length:var(--text-base)]">{grupo.moduloLabel}</CardHeader>
            <p className="mt-[var(--space-1)] text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
              {totalAtivas} de {catalogoKeys.length} permissões ativas
              {hasChanges ? ' · alterações não salvas' : null}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-[var(--space-2)]">
            <Button
              type="button"
              variant="secondary"
              className="min-h-0 min-w-0 py-[var(--space-1)] text-[length:var(--text-xs)]"
              onClick={() => setGrupoValores(catalogoKeys, true)}
              disabled={isInteractionDisabled || totalAtivas === catalogoKeys.length}
            >
              Marcar todas
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="min-h-0 min-w-0 py-[var(--space-1)] text-[length:var(--text-xs)]"
              onClick={() => setGrupoValores(catalogoKeys, false)}
              disabled={isInteractionDisabled || totalAtivas === 0}
            >
              Limpar todas
            </Button>
          </div>
        </div>
      }
      bodyClassName="p-0"
      footer={
        <CardFooter className="flex-col items-stretch gap-[var(--space-3)] sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1 text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
            {error ? (
              <p role="alert" className="text-[var(--color-error)]">
                {error}
              </p>
            ) : success ? (
              <p className="flex items-center gap-[var(--space-2)] text-[var(--color-success)]">
                <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
                Permissões salvas. O servidor precisará entrar novamente para aplicá-las.
              </p>
            ) : (
              <p>Salve ao concluir os ajustes deste módulo.</p>
            )}
          </div>
          <Button
            type="button"
            variant="primary"
            onClick={handleSave}
            disabled={isInteractionDisabled || !hasChanges}
            className="shrink-0"
          >
            {isPending ? (
              <>
                <Spinner className="size-4" />
                Salvando...
              </>
            ) : (
              'Salvar permissões'
            )}
          </Button>
        </CardFooter>
      }
    >
      <div className="flex flex-col gap-[var(--space-6)] px-[var(--space-4)] py-[var(--space-5)] sm:px-[var(--space-5)]">
        {grupos.map(({ grupo: secao, itens }) => {
          const secaoKeys = itens.map((item) => item.key)
          const secaoAtivas = countAtivas(valores, secaoKeys)
          const todasSecaoAtivas = secaoAtivas === secaoKeys.length

          return (
            <section key={secao.id} aria-labelledby={`grupo-${secao.id}`}>
              <div className="mb-[var(--space-3)] flex flex-col gap-[var(--space-2)] sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <h4
                    id={`grupo-${secao.id}`}
                    className="text-[length:var(--text-sm)] font-semibold text-[var(--color-text)]"
                  >
                    {secao.label}
                  </h4>
                  {secao.descricao ? (
                    <p className="mt-[var(--space-1)] text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
                      {secao.descricao}
                    </p>
                  ) : null}
                  <p className="mt-[var(--space-1)] text-[length:var(--text-xs)] text-[var(--color-text-subtle)]">
                    {secaoAtivas} de {secaoKeys.length} ativas nesta seção
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  className="min-h-0 min-w-0 shrink-0 self-start py-[var(--space-1)] text-[length:var(--text-xs)]"
                  onClick={() => setGrupoValores(secaoKeys, !todasSecaoAtivas)}
                  disabled={isInteractionDisabled}
                >
                  {todasSecaoAtivas ? 'Limpar seção' : 'Marcar seção'}
                </Button>
              </div>

              <ul className="divide-y divide-[var(--color-border)] overflow-hidden rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)]">
                {itens.map((item) => (
                  <li key={item.key}>
                    <PermissaoToggleRow
                      item={item}
                      ativo={valores[item.key] === true}
                      disabled={isInteractionDisabled}
                      onToggle={() => toggle(item.key)}
                    />
                  </li>
                ))}
              </ul>
            </section>
          )
        })}
      </div>
    </Card>
  )
}
