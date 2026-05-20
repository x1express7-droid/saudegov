'use client'

import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  Input,
  Select,
  Spinner,
} from '@saude/ui'
import { useEffect, useState, useTransition } from 'react'

export type EntityKind = 'departamento' | 'setor'

export interface EntityFormValues {
  nome: string
  sigla: string
  emailSetor?: string
  parentId?: string
}

interface EntityFormDialogProps {
  open: boolean
  kind: EntityKind
  mode: 'create' | 'edit'
  initialValues?: EntityFormValues
  parentOptions?: { value: string; label: string }[]
  parentLabel?: string
  onOpenChange: (open: boolean) => void
  onSubmit: (values: EntityFormValues) => Promise<{ success: boolean; error?: string }>
}

export function EntityFormDialog({
  open,
  kind,
  mode,
  initialValues,
  parentOptions = [],
  parentLabel,
  onOpenChange,
  onSubmit,
}: EntityFormDialogProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [nome, setNome] = useState('')
  const [sigla, setSigla] = useState('')
  const [emailSetor, setEmailSetor] = useState('')
  const [parentId, setParentId] = useState('')

  useEffect(() => {
    if (!open) {
      return
    }
    setError(null)
    setNome(initialValues?.nome ?? '')
    setSigla(initialValues?.sigla ?? '')
    setEmailSetor(initialValues?.emailSetor ?? '')
    setParentId(initialValues?.parentId ?? parentOptions[0]?.value ?? '')
  }, [open, initialValues, parentOptions])

  const titulo =
    mode === 'create'
      ? `Novo ${kind === 'departamento' ? 'departamento' : 'setor'}`
      : `Editar ${kind === 'departamento' ? 'departamento' : 'setor'}`

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)

    startTransition(async () => {
      const result = await onSubmit({
        nome,
        sigla,
        emailSetor: kind === 'setor' ? emailSetor : undefined,
        parentId: mode === 'create' && kind === 'setor' ? parentId : undefined,
      })

      if (!result.success) {
        setError(result.error ?? 'Não foi possível salvar.')
        return
      }

      onOpenChange(false)
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent titulo={titulo}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-[var(--space-4)]">
          {error ? (
            <p role="alert" className="text-[length:var(--text-sm)] text-[var(--color-error)]">
              {error}
            </p>
          ) : null}

          {mode === 'create' && kind === 'setor' && parentOptions.length > 0 ? (
            <Select
              label={parentLabel ?? 'Departamento'}
              value={parentId}
              onValueChange={setParentId}
              options={parentOptions}
              required
            />
          ) : null}

          <Input
            label="Nome"
            value={nome}
            onChange={(event) => setNome(event.target.value)}
            required
            maxLength={200}
          />

          <Input
            label="Sigla"
            value={sigla}
            onChange={(event) => setSigla(event.target.value)}
            maxLength={20}
            hint="Opcional"
          />

          {kind === 'setor' ? (
            <Input
              label="E-mail do setor"
              type="email"
              value={emailSetor}
              onChange={(event) => setEmailSetor(event.target.value)}
              maxLength={255}
              hint="Opcional"
            />
          ) : null}

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <>
                  <Spinner className="size-4" />
                  Salvando…
                </>
              ) : (
                'Salvar'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
