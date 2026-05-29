'use client'

import { criarProcedimentoSchema, type TfdProcedimentoListItem } from '@saude/mod-saude-tfd/client'
import { atualizarProcedimentoTfd, criarProcedimentoTfd } from '@saude/mod-saude-tfd/actions/configuracao'
import {
  Button,
  Combobox,
  Dialog,
  DialogContent,
  DialogFooter,
  Input,
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
      ehPab: false,
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
        ehPab: procedimento.ehPab,
      })
      return
    }

    reset({
      especialidadeId: defaultEspecialidadeId ?? especialidadeOptions[0]?.value ?? '',
      nome: '',
      codigoSigtap: '',
      ehPab: false,
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
        ehPab: values.ehPab,
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
              <Combobox
                label="Especialidade"
                value={field.value}
                onChange={field.onChange}
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

          <label className="flex cursor-pointer items-start gap-[var(--space-2)] text-[length:var(--text-sm)]">
            <input
              type="checkbox"
              className="mt-[var(--space-1)] size-4 accent-[var(--color-primary)]"
              disabled={isPending || semEspecialidades}
              {...register('ehPab')}
            />
            <span>
              <span className="font-medium text-[var(--color-text)]">
                Procedimento do Piso de Atenção Básica (PAB)
              </span>
              <span className="mt-[var(--space-1)] block text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
                Procedimentos PAB não podem ser aprovados para TFD (Portaria 55/1999).
              </span>
            </span>
          </label>

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
