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

import { DespesaComprovanteUpload } from '@/app/(servidor)/saude/tfd/[id]/components/despesa-comprovante-upload'
import { labelTipoSegmento } from '@/app/(servidor)/saude/tfd/processos/[id]/agendamentos/[agId]/components/transporte-constants'

/** Radix Select não aceita `value=""` em itens; sentinela para "nenhum segmento". */
const SEGMENTO_NENHUM = '__segmento_nenhum__'

const MAX_DESCRICAO_CHARS = 200
const TIPO_DESPESA_PADRAO: TfdTipoDespesaConfigKey = 'TRANSPORTE_TERRESTRE'

// PC-PARTE-3/4: dialog de lançamento — comprovante, diárias, óbito e devolução
const VALOR_DIARIA_SUS_2024 = 41

const TIPOS_DIARIA = ['DIARIA_PACIENTE', 'DIARIA_ACOMPANHANTE'] as const
const TIPOS_TRANSPORTE = [
  'TRANSPORTE_TERRESTRE',
  'TRANSPORTE_AEREO',
  'TRANSPORTE_FLUVIAL',
] as const

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

function isTipoDiaria(tipo: string): boolean {
  return TIPOS_DIARIA.includes(tipo as (typeof TIPOS_DIARIA)[number])
}

function comprovanteObrigatorio(tipo: string): boolean {
  return isTipoDiaria(tipo) || tipo === 'OBITO'
}

function exibeComprovante(tipo: string): boolean {
  return TFD_TIPO_DESPESA_CONFIG[tipo as TfdTipoDespesaConfigKey]?.ativo === true
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
  processoId: string | null
  segmentos: SegmentoViagemItem[]
  tipoInicial?: TfdTipoDespesaConfigKey
  /** PC-PARTE-4: valor pré-preenchido (ex.: devolução ao erário). */
  valorInicial?: string
  /** PC-PARTE-4: dias pré-calculados (ex.: sugestão de diária). */
  quantidadeDiasInicial?: number
}

export function DespesaViagemDialog({
  open,
  onOpenChange,
  session,
  viagemNovaId,
  processoId,
  segmentos,
  tipoInicial = TIPO_DESPESA_PADRAO,
  valorInicial,
  quantidadeDiasInicial,
}: DespesaViagemDialogProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [serverError, setServerError] = useState<string | null>(null)

  const [tipo, setTipo] = useState<TfdTipoDespesaConfigKey>(tipoInicial)
  const [segmentoId, setSegmentoId] = useState(SEGMENTO_NENHUM)
  const [descricao, setDescricao] = useState('')
  const [valor, setValor] = useState('')
  const [quantidadeDias, setQuantidadeDias] = useState('1')
  const [comprovanteAnexoId, setComprovanteAnexoId] = useState<string | null>(null)

  const valorNumerico = Number.parseFloat(valor.replace(',', '.'))
  const diasNumerico = Number.parseInt(quantidadeDias, 10)
  const tipoDespesaOptions = useMemo(() => buildTipoDespesaSelectOptions(), [])

  const mostraDiaria = isTipoDiaria(tipo)
  // PC-UPLOAD-FIX: upload visível para tipos ativos, independente de processoId
  const mostraComprovante = exibeComprovante(tipo)
  const comprovanteRequired = comprovanteObrigatorio(tipo)
  const mostraAlertaObito = tipo === 'OBITO'

  const valorPorDia =
    mostraDiaria && Number.isFinite(valorNumerico) && diasNumerico > 0
      ? valorNumerico / diasNumerico
      : null

  useEffect(() => {
    if (!open) {
      return
    }

    setTipo(tipoInicial)
    setSegmentoId(SEGMENTO_NENHUM)
    setComprovanteAnexoId(null)
    setDescricao('')
    setQuantidadeDias(String(quantidadeDiasInicial ?? 1))

    if (valorInicial) {
      setValor(valorInicial)
    } else if (isTipoDiaria(tipoInicial) && quantidadeDiasInicial) {
      setValor((quantidadeDiasInicial * VALOR_DIARIA_SUS_2024).toFixed(2).replace('.', ','))
    } else {
      setValor('')
    }
  }, [open, tipoInicial, valorInicial, quantidadeDiasInicial])

  useEffect(() => {
    if (!open || valorInicial || tipo === 'DEVOLUCAO') {
      return
    }

    if (mostraDiaria && diasNumerico >= 1) {
      setValor((diasNumerico * VALOR_DIARIA_SUS_2024).toFixed(2).replace('.', ','))
    }
  }, [open, mostraDiaria, diasNumerico, valorInicial, tipo])

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
    setValor(valorInicial ?? '')
    setQuantidadeDias(String(quantidadeDiasInicial ?? 1))
    setComprovanteAnexoId(null)
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

    if (mostraDiaria && (!Number.isFinite(diasNumerico) || diasNumerico < 1)) {
      setServerError('Informe a quantidade de dias (mínimo 1).')
      return
    }

    if (comprovanteRequired && !comprovanteAnexoId) {
      setServerError(
        tipo === 'OBITO'
          ? 'Comprovante obrigatório para despesas com óbito.'
          : 'Comprovante obrigatório para diárias de paciente e acompanhante.'
      )
      return
    }

    startTransition(async () => {
      const result = await registrarDespesaViagemNova({
        viagemNovaId,
        segmentoId: segmentoId === SEGMENTO_NENHUM ? undefined : segmentoId,
        tipo: tipo as RegistrarDespesaViagemNovaInput['tipo'],
        descricao: descricao.trim() || undefined,
        valor: valorNumerico,
        comprovanteAnexoId: comprovanteAnexoId ?? undefined,
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
              onValueChange={(value) => {
                setTipo(value as TfdTipoDespesaConfigKey)
                setComprovanteAnexoId(null)
                if (!isTipoDiaria(value)) {
                  if (value !== 'DEVOLUCAO') {
                    setValor('')
                  }
                  setQuantidadeDias('1')
                }
              }}
              options={tipoDespesaOptions}
              disabled={isPending}
            />

            {mostraAlertaObito ? (
              <div
                className="rounded-[var(--radius)] border border-[var(--color-error)] bg-[var(--color-error-light)] p-[var(--space-3)]"
                role="alert"
              >
                <p className="text-[length:var(--text-sm)] font-medium text-[var(--color-text)]">
                  ⚠ Despesas com óbito (Art. 6º, Portaria 55/1999)
                </p>
                <p className="mt-[var(--space-2)] text-[length:var(--text-sm)] text-[var(--color-text)]">
                  Documente: número da certidão de óbito, nota fiscal da funerária e autorização do
                  gestor municipal. Estes documentos são obrigatórios para aprovação.
                </p>
              </div>
            ) : null}

            {ajudaTipo && !mostraAlertaObito ? (
              <p className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
                {ajudaTipo}
              </p>
            ) : null}

            {mostraDiaria ? (
              <>
                <Input
                  label="Quantidade de dias"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  value={quantidadeDias}
                  onChange={(event) => setQuantidadeDias(event.target.value)}
                  disabled={isPending}
                />
                <p className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
                  {tipo === 'DIARIA_PACIENTE'
                    ? `Diária paciente: R$ ${VALOR_DIARIA_SUS_2024.toFixed(2).replace('.', ',')} por dia (tabela SUS 2024).`
                    : `Diária acompanhante: R$ ${VALOR_DIARIA_SUS_2024.toFixed(2).replace('.', ',')} por dia (tabela SUS 2024).`}
                </p>
                {valorPorDia !== null ? (
                  <p className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
                    Valor por dia: R$ {valorPorDia.toFixed(2).replace('.', ',')}
                  </p>
                ) : null}
              </>
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
              disabled={isPending || mostraDiaria}
              placeholder="0,00"
            />

            {mostraComprovante ? (
              <DespesaComprovanteUpload
                processoId={processoId}
                viagemId={viagemNovaId}
                disabled={isPending}
                onUploadComplete={setComprovanteAnexoId}
                onUploadClear={() => setComprovanteAnexoId(null)}
              />
            ) : null}

            {mostraComprovante && !comprovanteRequired ? (
              <p className="text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
                {TIPOS_TRANSPORTE.includes(tipo as (typeof TIPOS_TRANSPORTE)[number])
                  ? 'Comprovante recomendado para despesas de transporte.'
                  : 'Comprovante opcional para este tipo de despesa.'}
              </p>
            ) : null}

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
