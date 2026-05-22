'use client'

import { criarVeiculoSchema, type TfdVeiculoListItem } from '@saude/mod-saude-tfd/client'
import { atualizarVeiculoTfd, criarVeiculoTfd } from '@saude/mod-saude-tfd/actions/configuracao'
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

const veiculoFormSchema = criarVeiculoSchema.extend({
  capacidadePassageiros: z.coerce
    .number()
    .int('Capacidade deve ser um número inteiro.')
    .min(1, 'Capacidade mínima é 1.')
    .max(99, 'Capacidade máxima é 99.'),
})

type VeiculoFormValues = z.infer<typeof veiculoFormSchema>

interface VeiculoFormProps {
  open: boolean
  mode: 'create' | 'edit'
  veiculo?: TfdVeiculoListItem
  onOpenChange: (open: boolean) => void
}

export function VeiculoForm({ open, mode, veiculo, onOpenChange }: VeiculoFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [serverError, setServerError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<VeiculoFormValues>({
    resolver: zodResolver(veiculoFormSchema),
    defaultValues: {
      placa: '',
      modelo: '',
      capacidadePassageiros: 1,
    },
  })

  useEffect(() => {
    if (!open) {
      return
    }
    setServerError(null)
    setFieldErrors({})

    if (mode === 'edit' && veiculo) {
      reset({
        placa: veiculo.placa,
        modelo: veiculo.modelo,
        capacidadePassageiros: veiculo.capacidadePassageiros,
      })
      return
    }

    reset({
      placa: '',
      modelo: '',
      capacidadePassageiros: 1,
    })
  }, [open, mode, veiculo, reset])

  const titulo = mode === 'create' ? 'Novo veículo' : 'Editar veículo'

  function onSubmit(values: VeiculoFormValues) {
    setServerError(null)
    setFieldErrors({})

    const payload = {
      ...values,
      placa: values.placa.trim().toUpperCase(),
    }

    startTransition(async () => {
      if (mode === 'create') {
        const response = await criarVeiculoTfd(payload)
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

      if (!veiculo) {
        setServerError('Veículo não encontrado.')
        return
      }

      const response = await atualizarVeiculoTfd({
        id: veiculo.id,
        placa: payload.placa,
        modelo: payload.modelo,
        capacidadePassageiros: payload.capacidadePassageiros,
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

  const placaError = errors.placa?.message ?? fieldErrors.placa?.[0]

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
            label="Placa"
            required
            maxLength={10}
            error={placaError}
            disabled={isPending}
            className="uppercase"
            {...register('placa', {
              onChange: (event) => {
                const upper = event.target.value.toUpperCase()
                setValue('placa', upper, { shouldValidate: true })
              },
            })}
          />

          <Input
            label="Modelo"
            required
            maxLength={100}
            error={errors.modelo?.message}
            disabled={isPending}
            {...register('modelo')}
          />

          <Input
            label="Capacidade de passageiros"
            type="number"
            min={1}
            max={99}
            required
            error={errors.capacidadePassageiros?.message}
            disabled={isPending}
            {...register('capacidadePassageiros', { valueAsNumber: true })}
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
