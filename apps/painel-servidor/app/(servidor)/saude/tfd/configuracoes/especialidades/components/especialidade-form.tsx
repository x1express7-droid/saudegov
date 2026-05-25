'use client'

import { criarEspecialidadeSchema, type TfdEspecialidadeListItem } from '@saude/mod-saude-tfd/client'
import { atualizarEspecialidadeTfd, criarEspecialidadeTfd } from '@saude/mod-saude-tfd/actions/configuracao'
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  Input,
  Spinner,
} from '@saude/ui'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

const especialidadeFormSchema = criarEspecialidadeSchema

type EspecialidadeFormValues = z.infer<typeof especialidadeFormSchema>

interface EspecialidadeFormProps {
  open: boolean
  mode: 'create' | 'edit'
  especialidade?: TfdEspecialidadeListItem
  onOpenChange: (open: boolean) => void
}

export function EspecialidadeForm({
  open,
  mode,
  especialidade,
  onOpenChange,
}: EspecialidadeFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EspecialidadeFormValues>({
    resolver: zodResolver(especialidadeFormSchema),
    defaultValues: { nome: '' },
  })

  useEffect(() => {
    if (!open) {
      return
    }
    setServerError(null)
    reset({ nome: mode === 'edit' && especialidade ? especialidade.nome : '' })
  }, [open, mode, especialidade, reset])

  const titulo = mode === 'create' ? 'Nova especialidade' : 'Editar especialidade'

  function onSubmit(values: EspecialidadeFormValues) {
    setServerError(null)

    startTransition(async () => {
      if (mode === 'create') {
        const response = await criarEspecialidadeTfd(values)
        if (!response.success) {
          setServerError(response.error)
          return
        }
        onOpenChange(false)
        router.refresh()
        return
      }

      if (!especialidade) {
        setServerError('Especialidade não encontrada.')
        return
      }

      const response = await atualizarEspecialidadeTfd({
        id: especialidade.id,
        nome: values.nome,
      })

      if (!response.success) {
        setServerError(response.error)
        return
      }

      onOpenChange(false)
      router.refresh()
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent titulo={titulo}>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-[var(--space-4)]">
          {serverError ? (
            <p role="alert" className="text-[length:var(--text-sm)] text-[var(--color-error)]">
              {serverError}
            </p>
          ) : null}

          <Input
            label="Nome"
            required
            maxLength={200}
            error={errors.nome?.message}
            disabled={isPending}
            {...register('nome')}
          />

          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
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
