'use client'

import type { SegmentoViagemItem } from '@saude/mod-saude-tfd/client'
import { TFD_PERMISSIONS } from '@saude/mod-saude-tfd/client'
import { registrarDespesaViagemNova } from '@saude/mod-saude-tfd/actions/financeiro'
import type { SaudeMunicSession } from '@saude/core-auth/types/session'

import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  Input,
  Select,
  Spinner,
} from '@saude/ui'
import { PermissionGate } from '@saude/ui/permission-gate'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'

import { labelTipoSegmento } from '@/app/(servidor)/saude/tfd/processos/[id]/agendamentos/[agId]/components/transporte-constants'

/** Radix Select não aceita `value=""` em itens; sentinela para "nenhum segmento". */
const SEGMENTO_NENHUM = '__segmento_nenhum__'

const MAX_DESCRICAO_CHARS = 200

function tipoDespesaSugeridoPorSegmento(tipoSegmento: string): string | null {
  if (
    tipoSegmento === 'TERRESTRE_PROPRIO' ||
    tipoSegmento === 'TERRESTRE_TERCEIRO' ||
    tipoSegmento === 'AEREO'
  ) {
    return 'TRANSPORTE'
  }
  return null
}

function labelSegmentoOption(segmento: SegmentoViagemItem): string {
  return `${labelTipoSegmento(segmento.tipoSegmento)} — ${segmento.origemDescricao} → ${segmento.destinoDescricao}`
}

const TIPO_DESPESA_OPTIONS = [
  { value: 'TRANSPORTE', label: 'Transporte' },
  { value: 'ALIMENTACAO', label: 'Alimentação' },
  { value: 'HOSPEDAGEM', label: 'Hospedagem' },
  { value: 'OUTRO', label: 'Outro' },
] as const

const TIPO_DESPESA_AJUDA: Record<string, string> = {
  TRANSPORTE:
    'Passagem terrestre, aérea ou fluvial. Canhoto ou comprovante de compra obrigatório conforme Portaria SAS/MS 55/1999.',
  ALIMENTACAO:
    'Ajuda de custo para alimentação durante o deslocamento. Valor conforme tabela SUS vigente.',
  HOSPEDAGEM:
    'Diária de pernoite quando necessário. Não aplicável para pacientes hospitalizados no destino.',
  OUTRO: 'Outros gastos justificados. Descreva no campo observações.',
}

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

export interface DespesaViagemDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  session: SaudeMunicSession
  viagemNovaId: string
  segmentos: SegmentoViagemItem[]
  tipoInicial?: string
}

export function DespesaViagemDialog({
  open,
  onOpenChange,
  session,
  viagemNovaId,
  segmentos,
  tipoInicial = 'TRANSPORTE',
}: DespesaViagemDialogProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [serverError, setServerError] = useState<string | null>(null)

  const [tipo, setTipo] = useState(tipoInicial)
  const [segmentoId, setSegmentoId] = useState(SEGMENTO_NENHUM)
  const [descricao, setDescricao] = useState('')
  const [valor, setValor] = useState('')
  const [responsavelPagamento, setResponsavelPagamento] = useState('MUNICIPIO')

  const valorNumerico = Number.parseFloat(valor.replace(',', '.'))

  useEffect(() => {
    if (open) {
      setTipo(tipoInicial)
      setSegmentoId(SEGMENTO_NENHUM)
    }
  }, [open, tipoInicial])

  const segmentoOptions = [
    { value: SEGMENTO_NENHUM, label: 'Nenhum (despesa avulsa)' },
    ...segmentos.map((segmento) => ({
      value: segmento.id,
      label: labelSegmentoOption(segmento),
    })),
  ]

  function handleSegmentoChange(value: string) {
    setSegmentoId(value)
    if (value === SEGMENTO_NENHUM) {
      return
    }
    const segmento = segmentos.find((item) => item.id === value)
    if (!segmento) {
      return
    }
    const tipoSugerido = tipoDespesaSugeridoPorSegmento(segmento.tipoSegmento)
    if (tipoSugerido) {
      setTipo(tipoSugerido)
    }
  }

  function resetFormulario() {
    setTipo(tipoInicial)
    setSegmentoId(SEGMENTO_NENHUM)
    setDescricao('')
    setValor('')
    setResponsavelPagamento('MUNICIPIO')
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

    startTransition(async () => {
      const result = await registrarDespesaViagemNova({
        viagemNovaId,
        segmentoId: segmentoId === SEGMENTO_NENHUM ? undefined : segmentoId,
        tipo: tipo as 'TRANSPORTE' | 'ALIMENTACAO' | 'HOSPEDAGEM' | 'OUTRO',
        descricao: descricao.trim() || undefined,
        valor: valorNumerico,
        responsavelPagamento: responsavelPagamento as 'MUNICIPIO' | 'PACIENTE_REEMBOLSO',
      })

      if (!result.success) {
        setServerError(result.error ?? 'Não foi possível registrar a despesa.')
        return
      }

      handleOpenChange(false)
      router.refresh()
    })
  }

  const tipoLabel =
    TIPO_DESPESA_OPTIONS.find((option) => option.value === tipoInicial)?.label ?? 'Despesa'

  const ajudaTipo = TIPO_DESPESA_AJUDA[tipo]

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent titulo={`Lançar despesa — ${tipoLabel}`}>
        <PermissionGate session={session} permission={TFD_PERMISSIONS.REGISTRAR_DESPESA}>
          <form onSubmit={handleSubmit} className="flex flex-col gap-[var(--space-4)]">
            {segmentos.length > 0 ? (
              <Select
                label="Segmento relacionado (opcional)"
                value={segmentoId}
                onValueChange={handleSegmentoChange}
                options={segmentoOptions}
                disabled={isPending}
              />
            ) : null}

            <Select
              label="Tipo de despesa"
              value={tipo}
              onValueChange={setTipo}
              options={[...TIPO_DESPESA_OPTIONS]}
              disabled={isPending}
            />

            {ajudaTipo ? (
              // BLOCO-4: ajuda contextual por tipo de despesa
              <p className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
                {ajudaTipo}
              </p>
            ) : null}

            {/* BLOCO-4: descrição opcional para detalhar a despesa */}
            <Input
              label="Descrição (opcional)"
              value={descricao}
              onChange={(event) => setDescricao(event.target.value.slice(0, MAX_DESCRICAO_CHARS))}
              disabled={isPending}
              maxLength={MAX_DESCRICAO_CHARS}
              placeholder="Ex.: Passagem aérea ida Campo Grande — São Paulo"
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

            <Select
              label="Responsável pelo pagamento"
              value={responsavelPagamento}
              onValueChange={setResponsavelPagamento}
              options={[...RESPONSAVEL_OPTIONS]}
              disabled={isPending}
            />

            {/* TODO BLOCO-4: reativar comprovantes após estabilização do fluxo */}

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
