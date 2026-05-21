'use client'

import {
  atualizarProcedimentoTfd,
  criarProcedimentoSchema,
  criarProcedimentoTfd,
  type TfdProcedimentoListItem,
} from '@saude/mod-saude-tfd'
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  Input,
  Select,
  type SelectOption,
  Spinner,
} from '@saude/ui'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'

const procedimentoFormSchema = criarProcedimentoSchema

type ProcedimentoFormValues = z.infer<typeof procedimentoFormSchema>

interface ProcedimentoFormProps {
  open: boolean
  mode: 'create' | 'edit'
  procedimento?: TfdProcedimentoListItem
  especialidadeOptions: SelectOption[]
  defaultEspecialidadeId?: string
  onOpenChange: (open: boolean) => void
}

export function ProcedimentoForm({
  open,
  mode,
  procedimento,
  especialidadeOptions,
  defaultEspecialidadeId,
  onOpenChange,
}: ProcedimentoFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<ProcedimentoFormValues>({
    resolver: zodResolver(procedimentoFormSchema),
    defaultValues: {
      especialidadeId: '',
      nome: '',
      codigoSigtap: '',
    },
  })

  useEffect(() => {
    if (!open) {
      return
    }
    setServerError(null)

    if (mode === 'edit' && procedimento) {
      reset({
        especialidadeId: procedimento.especialidadeId,
        nome: procedimento.nome,
        codigoSigtap: procedimento.codigoSigtap ?? '',
      })
      return
    }

    reset({
      especialidadeId: defaultEspecialidadeId ?? especialidadeOptions[0]?.value ?? '',
      nome: '',
      codigoSigtap: '',
    })
  }, [open, mode, procedimento, defaultEspecialidadeId, especialidadeOptions, reset])

  const titulo = mode === 'create' ? 'Novo procedimento' : 'Editar procedimento'
  const semEspecialidades = especialidadeOptions.length === 0

  function onSubmit(values: ProcedimentoFormValues) {
    setServerError(null)

    startTransition(async () => {
      if (mode === 'create') {
        const response = await criarProcedimentoTfd(values)
        if (!response.success) {
          setServerError(response.error)
          return
        }
        onOpenChange(false)
        router.refresh()
        return
      }

      if (!procedimento) {
        setServerError('Procedimento não encontrado.')
        return
      }

      const response = await atualizarProcedimentoTfd({
        id: procedimento.id,
        especialidadeId: values.especialidadeId,
        nome: values.nome,
        codigoSigtap: values.codigoSigtap ?? null,
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

          {semEspecialidades ? (
            <p className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
              Cadastre ao menos uma especialidade ativa antes de incluir procedimentos.
            </p>
          ) : null}

          <Controller
            name="especialidadeId"
            control={control}
            render={({ field }) => (
              <Select
                label="Especialidade"
                value={field.value}
                onValueChange={field.onChange}
                options={especialidadeOptions}
                required
                disabled={isPending || semEspecialidades}
                error={errors.especialidadeId?.message}
                placeholder="Selecione a especialidade"
              />
            )}
          />

          <Input
            label="Nome do procedimento"
            required
            maxLength={200}
            error={errors.nome?.message}
            disabled={isPending || semEspecialidades}
            {...register('nome')}
          />

          <Input
            label="Código SIGTAP"
            maxLength={20}
            hint="Opcional"
            error={errors.codigoSigtap?.message}
            disabled={isPending || semEspecialidades}
            {...register('codigoSigtap')}
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
            <Button type="submit" disabled={isPending || semEspecialidades}>
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
