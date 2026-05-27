'use client'

import { MIN_VALOR_COMPROVANTE, TFD_PERMISSIONS } from '@saude/mod-saude-tfd/client'
import {
  registrarDespesaAgendamento,
  registrarDespesaTransporte,
} from '@saude/mod-saude-tfd/actions/financeiro'
import type { SaudeMunicSession } from '@saude/core-auth/types/session'

import { DespesaComprovanteUpload } from '@/app/(servidor)/saude/tfd/[id]/components/despesa-comprovante-upload'
import { Alert, Button, Dialog, DialogContent, DialogFooter, Input, Select, Spinner, Textarea } from '@saude/ui'
import { PermissionGate } from '@saude/ui/permission-gate'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'

import { currencyFormatter } from '../../components/transporte-constants'

const TIPO_DESPESA_OPTIONS = [
  { value: 'TRANSPORTE', label: 'Transporte' },
  { value: 'ALIMENTACAO', label: 'Alimentação' },
  { value: 'HOSPEDAGEM', label: 'Hospedagem' },
  { value: 'OUTRO', label: 'Outro' },
] as const

const RESPONSAVEL_OPTIONS = [
  { value: 'MUNICIPIO', label: 'Município' },
  { value: 'PACIENTE_REEMBOLSO', label: 'Paciente (reembolso)' },
] as const

function ServerError({ message }: { message: string }) {
  return (
    <p className="text-[length:var(--text-sm)] text-[var(--color-danger)]" role="alert">
      {message}
    </p>
  )
}

export interface DespesaLancamentoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  session: SaudeMunicSession
  processoId: string
  agendamentoId: string
  transporteId?: string
  segmentoTitulo?: string
}

export function DespesaLancamentoDialog({
  open,
  onOpenChange,
  session,
  processoId,
  agendamentoId,
  transporteId,
  segmentoTitulo,
}: DespesaLancamentoDialogProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [serverError, setServerError] = useState<string | null>(null)

  const [tipo, setTipo] = useState<string>(transporteId ? 'TRANSPORTE' : 'ALIMENTACAO')
  const [descricao, setDescricao] = useState('')
  const [valor, setValor] = useState('')
  const [responsavelPagamento, setResponsavelPagamento] = useState('MUNICIPIO')
  const [comprovanteAnexoId, setComprovanteAnexoId] = useState<string | null>(null)
  const [uploadKey, setUploadKey] = useState(0)

  const valorNumerico = Number.parseFloat(valor.replace(',', '.'))
  const exigeComprovante =
    Number.isFinite(valorNumerico) && valorNumerico >= MIN_VALOR_COMPROVANTE

  useEffect(() => {
    if (open) {
      setTipo(transporteId ? 'TRANSPORTE' : 'ALIMENTACAO')
    }
  }, [open, transporteId])

  function resetFormulario() {
    setTipo(transporteId ? 'TRANSPORTE' : 'ALIMENTACAO')
    setDescricao('')
    setValor('')
    setResponsavelPagamento('MUNICIPIO')
    setComprovanteAnexoId(null)
    setUploadKey((key) => key + 1)
    setServerError(null)
  }

  function handleOpenChange(next: boolean) {
    if (!next) {
      resetFormulario()
    }
    onOpenChange(next)
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setServerError(null)

    if (!Number.isFinite(valorNumerico) || valorNumerico <= 0) {
      setServerError('Informe um valor positivo.')
      return
    }

    if (exigeComprovante && !comprovanteAnexoId) {
      setServerError(
        `Comprovante obrigatório para valores iguais ou superiores a R$ ${MIN_VALOR_COMPROVANTE},00.`
      )
      return
    }

    const payloadBase = {
      tipo: tipo as 'TRANSPORTE' | 'ALIMENTACAO' | 'HOSPEDAGEM' | 'OUTRO',
      descricao: descricao.trim() || undefined,
      valor: valorNumerico,
      comprovanteAnexoId: comprovanteAnexoId ?? undefined,
      responsavelPagamento: responsavelPagamento as 'MUNICIPIO' | 'PACIENTE_REEMBOLSO',
    }

    startTransition(async () => {
      const result = transporteId
        ? await registrarDespesaTransporte({
            transporteId,
            ...payloadBase,
          })
        : await registrarDespesaAgendamento({
            agendamentoId,
            ...payloadBase,
          })

      if (!result.success) {
        setServerError(result.error ?? 'Não foi possível registrar a despesa.')
        return
      }

      handleOpenChange(false)
      router.refresh()
    })
  }

  const titulo = transporteId
    ? `Lançar despesa — ${segmentoTitulo ?? 'segmento'}`
    : 'Lançar despesa avulsa'

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent titulo={titulo}>
        <PermissionGate session={session} permission={TFD_PERMISSIONS.REGISTRAR_DESPESA}>
          <form onSubmit={handleSubmit} className="flex flex-col gap-[var(--space-4)]">
            <Select
              label="Tipo de despesa"
              value={tipo}
              onValueChange={setTipo}
              options={[...TIPO_DESPESA_OPTIONS]}
              disabled={isPending}
            />

            <Textarea
              label="Descrição (opcional)"
              value={descricao}
              onChange={(event) => setDescricao(event.target.value)}
              rows={2}
              disabled={isPending}
            />

            <Input
              label="Valor (R$)"
              type="text"
              inputMode="decimal"
              value={valor}
              onChange={(event) => setValor(event.target.value)}
              disabled={isPending}
              placeholder="0,00"
            />

            {exigeComprovante ? (
              <Alert variant="warning" role="status">
                Valores a partir de {currencyFormatter.format(MIN_VALOR_COMPROVANTE)} exigem
                comprovante anexado (PDF, JPEG ou PNG, máx. 10 MB).
              </Alert>
            ) : null}

            <Select
              label="Responsável pelo pagamento"
              value={responsavelPagamento}
              onValueChange={setResponsavelPagamento}
              options={[...RESPONSAVEL_OPTIONS]}
              disabled={isPending}
            />

            <DespesaComprovanteUpload
              key={uploadKey}
              processoId={processoId}
              disabled={isPending}
              onUploadComplete={setComprovanteAnexoId}
              onUploadClear={() => setComprovanteAnexoId(null)}
            />

            {serverError ? <ServerError message={serverError} /> : null}

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                disabled={isPending}
                onClick={() => handleOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" variant="primary" disabled={isPending}>
                {isPending ? (
                  <>
                    <Spinner className="mr-[var(--space-2)] size-4" />
                    Registrando…
                  </>
                ) : (
                  'Registrar despesa'
                )}
              </Button>
            </DialogFooter>
          </form>
        </PermissionGate>
      </DialogContent>
    </Dialog>
  )
}
