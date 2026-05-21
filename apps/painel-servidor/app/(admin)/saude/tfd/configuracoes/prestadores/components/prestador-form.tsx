'use client'

import {
  atualizarPrestadorTfd,
  criarPrestadorSchema,
  criarPrestadorTfd,
  type TfdPrestadorListItem,
} from '@saude/mod-saude-tfd'
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  Input,
  Select,
  Spinner,
} from '@saude/ui'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import {
  EspecialidadesCheckboxGroup,
  type EspecialidadeCheckboxOption,
} from './especialidades-checkbox-group'

const BRAZILIAN_UFS = [
  'AC',
  'AL',
  'AP',
  'AM',
  'BA',
  'CE',
  'DF',
  'ES',
  'GO',
  'MA',
  'MT',
  'MS',
  'MG',
  'PA',
  'PB',
  'PR',
  'PE',
  'PI',
  'RJ',
  'RN',
  'RS',
  'RO',
  'RR',
  'SC',
  'SP',
  'SE',
  'TO',
] as const

const UF_OPTIONS = BRAZILIAN_UFS.map((uf) => ({ value: uf, label: uf }))

const prestadorFormSchema = criarPrestadorSchema.extend({
  especialidades: z.array(z.string().uuid('Especialidade inválida.')),
})

type PrestadorFormValues = z.infer<typeof prestadorFormSchema>

interface PrestadorFormProps {
  open: boolean
  mode: 'create' | 'edit'
  prestador?: TfdPrestadorListItem
  especialidadeOptions: EspecialidadeCheckboxOption[]
  onOpenChange: (open: boolean) => void
}

export function PrestadorForm({
  open,
  mode,
  prestador,
  especialidadeOptions,
  onOpenChange,
}: PrestadorFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<PrestadorFormValues>({
    resolver: zodResolver(prestadorFormSchema),
    defaultValues: {
      nome: '',
      cidade: '',
      estado: 'SP',
      cnpj: '',
      cnes: '',
      telefone: '',
      especialidades: [],
    },
  })

  useEffect(() => {
    if (!open) {
      return
    }
    setServerError(null)

    if (mode === 'edit' && prestador) {
      reset({
        nome: prestador.nome,
        cidade: prestador.cidade,
        estado: prestador.estado as (typeof BRAZILIAN_UFS)[number],
        cnpj: prestador.cnpj ?? '',
        cnes: prestador.cnes ?? '',
        telefone: prestador.telefone ?? '',
        especialidades: prestador.especialidadeIds,
      })
      return
    }

    reset({
      nome: '',
      cidade: '',
      estado: 'SP',
      cnpj: '',
      cnes: '',
      telefone: '',
      especialidades: [],
    })
  }, [open, mode, prestador, reset])

  const titulo = mode === 'create' ? 'Novo prestador externo' : 'Editar prestador externo'

  function onSubmit(values: PrestadorFormValues) {
    setServerError(null)

    startTransition(async () => {
      if (mode === 'create') {
        const response = await criarPrestadorTfd(values)
        if (!response.success) {
          setServerError(response.error)
          return
        }
        onOpenChange(false)
        router.refresh()
        return
      }

      if (!prestador) {
        setServerError('Prestador não encontrado.')
        return
      }

      const response = await atualizarPrestadorTfd({
        id: prestador.id,
        nome: values.nome,
        cidade: values.cidade,
        estado: values.estado,
        cnpj: values.cnpj ?? null,
        cnes: values.cnes ?? null,
        telefone: values.telefone ?? null,
        especialidades: values.especialidades,
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

          <div className="grid gap-[var(--space-4)] sm:grid-cols-2">
            <Input
              label="Cidade"
              required
              maxLength={200}
              error={errors.cidade?.message}
              disabled={isPending}
              {...register('cidade')}
            />
            <Controller
              name="estado"
              control={control}
              render={({ field }) => (
                <Select
                  label="UF"
                  value={field.value}
                  onValueChange={field.onChange}
                  options={UF_OPTIONS}
                  required
                  disabled={isPending}
                  error={errors.estado?.message}
                />
              )}
            />
          </div>

          <div className="grid gap-[var(--space-4)] sm:grid-cols-2">
            <Input
              label="CNPJ"
              hint="Opcional"
              error={errors.cnpj?.message}
              disabled={isPending}
              {...register('cnpj')}
            />
            <Input
              label="CNES"
              maxLength={7}
              hint="Opcional"
              error={errors.cnes?.message}
              disabled={isPending}
              {...register('cnes')}
            />
          </div>

          <Input
            label="Telefone"
            maxLength={20}
            hint="Opcional"
            error={errors.telefone?.message}
            disabled={isPending}
            {...register('telefone')}
          />

          <Controller
            name="especialidades"
            control={control}
            render={({ field }) => (
              <EspecialidadesCheckboxGroup
                options={especialidadeOptions}
                selectedIds={field.value}
                onChange={field.onChange}
                error={errors.especialidades?.message}
                disabled={isPending}
              />
            )}
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
