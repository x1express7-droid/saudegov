'use client'

import { criarMotoristaSchema, type TfdMotoristaListItem, type TfdServidorMotoristaOption } from '@saude/mod-saude-tfd/client'
import { atualizarMotoristaTfd, criarMotoristaTfd } from '@saude/mod-saude-tfd/actions/configuracao'
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

const CNH_CATEGORIA_OPTIONS = [
  { value: 'A', label: 'A' },
  { value: 'B', label: 'B' },
  { value: 'C', label: 'C' },
  { value: 'D', label: 'D' },
  { value: 'E', label: 'E' },
] as const

const motoristaFormSchema = criarMotoristaSchema

type MotoristaFormValues = z.infer<typeof motoristaFormSchema>

interface MotoristaFormProps {
  open: boolean
  mode: 'create' | 'edit'
  motorista?: TfdMotoristaListItem
  servidorOptions: TfdServidorMotoristaOption[]
  onOpenChange: (open: boolean) => void
}

export function MotoristaForm({
  open,
  mode,
  motorista,
  servidorOptions,
  onOpenChange,
}: MotoristaFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [serverError, setServerError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<MotoristaFormValues>({
    resolver: zodResolver(motoristaFormSchema),
    defaultValues: {
      userId: '',
      cnh: '',
      cnhCategoria: 'B',
      cnhValidade: '',
    },
  })

  useEffect(() => {
    if (!open) {
      return
    }
    setServerError(null)
    setFieldErrors({})

    if (mode === 'edit' && motorista) {
      reset({
        userId: motorista.userId,
        cnh: motorista.cnh,
        cnhCategoria: motorista.cnhCategoria as MotoristaFormValues['cnhCategoria'],
        cnhValidade: motorista.cnhValidade,
      })
      return
    }

    reset({
      userId: servidorOptions[0]?.value ?? '',
      cnh: '',
      cnhCategoria: 'B',
      cnhValidade: '',
    })
  }, [open, mode, motorista, servidorOptions, reset])

  const titulo = mode === 'create' ? 'Novo motorista' : 'Editar motorista'
  const semServidores = mode === 'create' && servidorOptions.length === 0

  function onSubmit(values: MotoristaFormValues) {
    setServerError(null)
    setFieldErrors({})

    startTransition(async () => {
      if (mode === 'create') {
        const response = await criarMotoristaTfd(values)
        if (!response.success) {
          setServerError(response.error)
          if (response.fieldErrors) {
            setFieldErrors(response.fieldErrors as Record<string, string[]>)
          }
          return
        }
        onOpenChange(false)
        router.refresh()
        return
      }

      if (!motorista) {
        setServerError('Motorista não encontrado.')
        return
      }

      const response = await atualizarMotoristaTfd({
        id: motorista.id,
        cnh: values.cnh,
        cnhCategoria: values.cnhCategoria,
        cnhValidade: values.cnhValidade,
      })

      if (!response.success) {
        setServerError(response.error)
        if (response.fieldErrors) {
          setFieldErrors(response.fieldErrors as Record<string, string[]>)
        }
        return
      }

      onOpenChange(false)
      router.refresh()
    })
  }

  const userIdError = errors.userId?.message ?? fieldErrors.userId?.[0]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent titulo={titulo}>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-[var(--space-4)]">
          {serverError ? (
            <p role="alert" className="text-[length:var(--text-sm)] text-[var(--color-error)]">
              {serverError}
            </p>
          ) : null}

          {mode === 'create' ? (
            <>
              {semServidores ? (
                <p className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
                  Não há servidores ativos disponíveis para cadastro como motorista.
                </p>
              ) : null}
              <Controller
                name="userId"
                control={control}
                render={({ field }) => (
                  <Select
                    label="Servidor"
                    value={field.value}
                    onValueChange={field.onChange}
                    options={servidorOptions.map((opt) => ({
                      value: opt.value,
                      label: `${opt.label} (${opt.email})`,
                    }))}
                    required
                    disabled={isPending || semServidores}
                    error={userIdError}
                    placeholder="Selecione o servidor"
                  />
                )}
              />
            </>
          ) : motorista ? (
            <div className="rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-bg)] p-[var(--space-3)]">
              <p className="text-[length:var(--text-xs)] font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
                Servidor
              </p>
              <p className="mt-[var(--space-1)] font-medium text-[var(--color-text)]">
                {motorista.userNome}
              </p>
              <p className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
                {motorista.userEmail}
              </p>
            </div>
          ) : null}

          <Input
            label="Número da CNH"
            required
            maxLength={20}
            error={errors.cnh?.message}
            disabled={isPending || semServidores}
            {...register('cnh')}
          />

          <Controller
            name="cnhCategoria"
            control={control}
            render={({ field }) => (
              <Select
                label="Categoria da CNH"
                value={field.value}
                onValueChange={field.onChange}
                options={[...CNH_CATEGORIA_OPTIONS]}
                required
                disabled={isPending || semServidores}
                error={errors.cnhCategoria?.message}
              />
            )}
          />

          <Input
            label="Validade da CNH"
            type="date"
            required
            error={errors.cnhValidade?.message}
            disabled={isPending || semServidores}
            {...register('cnhValidade')}
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
            <Button type="submit" disabled={isPending || semServidores}>
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
