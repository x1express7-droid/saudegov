'use client'

import type { RegistrarDespesaViagemNovaInput, SegmentoViagemItem } from '@saude/mod-saude-tfd'
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
  type SelectOption,
  Spinner,
  TFD_TIPO_DESPESA_CONFIG,
  TFD_TIPOS_DESPESA_ATIVOS,
  type TfdTipoDespesaConfigKey,
} from '@saude/ui'
import { PermissionGate } from '@saude/ui/permission-gate'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState, useTransition } from 'react'

import { labelTipoSegmento } from '@/app/(servidor)/saude/tfd/processos/[id]/agendamentos/[agId]/components/transporte-constants'

/** Radix Select não aceita `value=""` em itens; sentinela para "nenhum segmento". */
const SEGMENTO_NENHUM = '__segmento_nenhum__'

const MAX_DESCRICAO_CHARS = 200

const TIPO_DESPESA_PADRAO: TfdTipoDespesaConfigKey = 'TRANSPORTE_TERRESTRE'

// PC-PARTE-2: agrupamento de opções no select por grupo de despesa
const GRUPO_DESPESA_LABELS: Record<string, string> = {
  TRANSPORTE: '── TRANSPORTE ──',
  DIARIA: '── DIÁRIAS ──',
  ESPECIAL: '── ESPECIAL ──',
}

const GRUPOS_DESPESA_ORDEM = ['TRANSPORTE', 'DIARIA', 'ESPECIAL'] as const

function buildTipoDespesaSelectOptions(): SelectOption[] {
  const options: SelectOption[] = []

  for (const grupo of GRUPOS_DESPESA_ORDEM) {
    const itensGrupo = TFD_TIPOS_DESPESA_ATIVOS.filter((item) => item.grupo === grupo)
    if (itensGrupo.length === 0) {
      continue
    }

    options.push({
      value: `__grupo_${grupo}__`,
      label: GRUPO_DESPESA_LABELS[grupo] ?? grupo,
      disabled: true,
    })

    for (const item of itensGrupo) {
      options.push({ value: item.tipo, label: item.label })
    }
  }

  return options
}

function tipoDespesaSugeridoPorSegmento(tipoSegmento: string): TfdTipoDespesaConfigKey | null {
  if (tipoSegmento === 'TERRESTRE_PROPRIO' || tipoSegmento === 'TERRESTRE_TERCEIRO') {
    return 'TRANSPORTE_TERRESTRE'
  }
  if (tipoSegmento === 'AEREO') {
    return 'TRANSPORTE_AEREO'
  }
  if (tipoSegmento === 'FLUVIAL') {
    return 'TRANSPORTE_FLUVIAL'
  }
  return null
}

function labelSegmentoOption(segmento: SegmentoViagemItem): string {
  return `${labelTipoSegmento(segmento.tipoSegmento)} — ${segmento.origemDescricao} → ${segmento.destinoDescricao}`
}

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
  tipoInicial?: TfdTipoDespesaConfigKey
}

export function DespesaViagemDialog({
  open,
  onOpenChange,
  session,
  viagemNovaId,
  segmentos,
  tipoInicial = TIPO_DESPESA_PADRAO,
}: DespesaViagemDialogProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [serverError, setServerError] = useState<string | null>(null)

  const [tipo, setTipo] = useState<TfdTipoDespesaConfigKey>(tipoInicial)
  const [segmentoId, setSegmentoId] = useState(SEGMENTO_NENHUM)
  const [descricao, setDescricao] = useState('')
  const [valor, setValor] = useState('')

  const valorNumerico = Number.parseFloat(valor.replace(',', '.'))
  const tipoDespesaOptions = useMemo(() => buildTipoDespesaSelectOptions(), [])

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
        tipo: tipo as RegistrarDespesaViagemNovaInput['tipo'],
        descricao: descricao.trim() || undefined,
        valor: valorNumerico,
        // PC-PARTE-1: responsável fixo no backend; não expor na UI da viagem nova
        responsavelPagamento: 'MUNICIPIO',
      })

      if (!result.success) {
        setServerError(result.error ?? 'Não foi possível registrar a despesa.')
        return
      }

      handleOpenChange(false)
      router.refresh()
    })
  }

  const tipoLabel = TFD_TIPO_DESPESA_CONFIG[tipoInicial]?.label ?? 'Despesa'
  const ajudaTipo = TFD_TIPO_DESPESA_CONFIG[tipo]?.descricao

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
              onValueChange={(value) => setTipo(value as TfdTipoDespesaConfigKey)}
              options={tipoDespesaOptions}
              disabled={isPending}
            />

            {ajudaTipo ? (
              // PC-PARTE-2: ajuda contextual por tipo de despesa (Portaria 55/1999)
              <p className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
                {ajudaTipo}
              </p>
            ) : null}

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
