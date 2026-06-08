'use client'

import { criarCidSchema, type TfdCidListItem } from '@saude/mod-saude-tfd/client'
import { atualizarCidTfd, criarCidTfd } from '@saude/mod-saude-tfd/actions/configuracao'
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  Input,
  Spinner,
  Textarea,
} from '@saude/ui'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

const cidFormSchema = criarCidSchema

type CidFormValues = z.infer<typeof cidFormSchema>

interface CidFormProps {
  open: boolean
  mode: 'create' | 'edit'
  cid?: TfdCidListItem
  onOpenChange: (open: boolean) => void
}

export function CidForm({ open, mode, cid, onOpenChange }: CidFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CidFormValues>({
    resolver: zodResolver(cidFormSchema),
    defaultValues: { codigo: '', descricao: '' },
  })

  useEffect(() => {
    if (!open) {
      return
    }
    setServerError(null)
    reset({
      codigo: mode === 'edit' && cid ? cid.codigo : '',
      descricao: mode === 'edit' && cid ? cid.descricao : '',
    })
  }, [open, mode, cid, reset])

  const titulo = mode === 'create' ? 'Novo CID' : 'Editar CID'

  function onSubmit(values: CidFormValues) {
    setServerError(null)

    startTransition(async () => {
      if (mode === 'create') {
        const response = await criarCidTfd(values)
        if (!response.success) {
          setServerError(response.error)
          return
        }
        onOpenChange(false)
        router.refresh()
        return
      }

      if (!cid) {
        setServerError('CID não encontrado.')
        return
      }

      const response = await atualizarCidTfd({
        id: cid.id,
        codigo: values.codigo,
        descricao: values.descricao,
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
            label="Código"
            required
            maxLength={10}
            placeholder="Ex.: I10"
            error={errors.codigo?.message}
            disabled={isPending}
            {...register('codigo')}
          />

          <Textarea
            label="Descrição"
            required
            rows={3}
            maxLength={500}
            placeholder="Descrição do diagnóstico"
            error={errors.descricao?.message}
            disabled={isPending}
            {...register('descricao')}
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
