'use client'

import { criarSaldoObjectSchema, criarSaldoTfd } from '@saude/mod-saude-tfd'
import { z } from 'zod'
import {
  Alert,
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

const saldoFormSchema = criarSaldoObjectSchema
  .extend({
    valorTotal: z.coerce
      .number({ invalid_type_error: 'Valor total inválido.' })
      .positive('Valor total deve ser positivo.'),
  })
  .refine((data) => data.competenciaFim >= data.competenciaInicio, {
    message: 'Competência final deve ser igual ou posterior à inicial.',
    path: ['competenciaFim'],
  })

const FONTE_OPTIONS = [
  { value: 'FEDERAL_FNS', label: 'Federal (FNS)' },
  { value: 'ESTADUAL', label: 'Estadual' },
  { value: 'MUNICIPAL_PROPRIO', label: 'Municipal próprio' },
  { value: 'EMENDA_PARLAMENTAR', label: 'Emenda parlamentar' },
] as const

const COMPETENCIA_HINT =
  'Selecione o primeiro e o último dia do período de vigência do recurso (formato exibido: dd/mm/aaaa).'

type SaldoFormValues = z.infer<typeof saldoFormSchema>

interface SaldoFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SaldoForm({ open, onOpenChange }: SaldoFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [serverError, setServerError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const [submitSuccess, setSubmitSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<SaldoFormValues>({
    resolver: zodResolver(saldoFormSchema),
    defaultValues: {
      descricao: '',
      fonte: 'MUNICIPAL_PROPRIO',
      competenciaInicio: '',
      competenciaFim: '',
    },
  })

  useEffect(() => {
    if (!open) {
      return
    }
    setServerError(null)
    setFieldErrors({})
    setSubmitSuccess(false)
    reset({
      descricao: '',
      fonte: 'MUNICIPAL_PROPRIO',
      competenciaInicio: '',
      competenciaFim: '',
    })
  }, [open, reset])

  function onSubmit(values: SaldoFormValues) {
    setServerError(null)
    setFieldErrors({})
    setSubmitSuccess(false)

    startTransition(async () => {
      const response = await criarSaldoTfd(values)
      if (!response.success) {
        setServerError(response.error)
        if (response.fieldErrors) {
          setFieldErrors(response.fieldErrors as Record<string, string[]>)
        }
        return
      }

      setSubmitSuccess(true)
      router.refresh()

      window.setTimeout(() => {
        setSubmitSuccess(false)
        onOpenChange(false)
      }, 1800)
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent titulo="Novo saldo financeiro">
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-[var(--space-4)]">
          {submitSuccess ? (
            <Alert variant="success" titulo="Saldo cadastrado com sucesso">
              O crédito inicial foi registrado no extrato. A lista será atualizada ao fechar esta
              janela.
            </Alert>
          ) : null}

          {serverError ? (
            <p role="alert" className="text-[length:var(--text-sm)] text-[var(--color-error)]">
              {serverError}
            </p>
          ) : null}

          <Input
            label="Descrição do saldo"
            required
            maxLength={500}
            hint="Ex.: Recursos TFD 2026 — emenda estadual"
            error={errors.descricao?.message ?? fieldErrors.descricao?.[0]}
            disabled={isPending || submitSuccess}
            {...register('descricao')}
          />

          <Controller
            name="fonte"
            control={control}
            render={({ field }) => (
              <Select
                label="Fonte do recurso"
                required
                options={[...FONTE_OPTIONS]}
                value={field.value}
                onValueChange={field.onChange}
                error={errors.fonte?.message ?? fieldErrors.fonte?.[0]}
                disabled={isPending || submitSuccess}
              />
            )}
          />

          <Input
            label="Valor total do saldo (R$)"
            type="number"
            min={0.01}
            step={0.01}
            required
            hint="Informe o montante total disponibilizado para o período. Será creditado integralmente no extrato."
            error={errors.valorTotal?.message ?? fieldErrors.valorTotal?.[0]}
            disabled={isPending || submitSuccess}
            {...register('valorTotal', { valueAsNumber: true })}
          />

          <div className="grid gap-[var(--space-4)] sm:grid-cols-2">
            <Input
              label="Início da competência"
              type="date"
              required
              hint={COMPETENCIA_HINT}
              error={errors.competenciaInicio?.message ?? fieldErrors.competenciaInicio?.[0]}
              disabled={isPending || submitSuccess}
              {...register('competenciaInicio')}
            />
            <Input
              label="Fim da competência"
              type="date"
              required
              hint={COMPETENCIA_HINT}
              error={errors.competenciaFim?.message ?? fieldErrors.competenciaFim?.[0]}
              disabled={isPending || submitSuccess}
              {...register('competenciaFim')}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending || submitSuccess}>
              {isPending ? (
                <>
                  <Spinner className="size-4" />
                  Salvando…
                </>
              ) : submitSuccess ? (
                'Salvo'
              ) : (
                'Cadastrar saldo'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
