'use client'

import type { RegistrarCustoComposicaoSolicitacaoInput } from '@saude/mod-saude-tfd'
import { TFD_PERMISSIONS } from '@saude/mod-saude-tfd/client'
import { registrarCustoComposicaoSolicitacaoTfd } from '@saude/mod-saude-tfd/actions/projecao-financeira'
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
  cn,
  type TfdTipoDespesaConfigKey,
} from '@saude/ui'
import { PermissionGate } from '@saude/ui/permission-gate'
import {
  formatMoedaBrFromNumber,
  formatMoedaBrInput,
  parseMoedaBrInput,
} from '@/app/(servidor)/saude/tfd/saldos/utils/moeda-form-utils'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState, useTransition } from 'react'

const MAX_DESCRICAO_CHARS = 300
const TIPO_DESPESA_PADRAO: TfdTipoDespesaConfigKey = 'TRANSPORTE_TERRESTRE'
const VALOR_DIARIA_SUS_2024 = 41

const TIPOS_DIARIA_TABELA = ['DIARIA_PACIENTE', 'DIARIA_ACOMPANHANTE'] as const
const TIPOS_DIARIA_COM_DIAS = ['DIARIA_PACIENTE', 'DIARIA_ACOMPANHANTE', 'DIARIA_LIVRE'] as const

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

function isDiariaTabelaSus(tipo: string): boolean {
  return TIPOS_DIARIA_TABELA.includes(tipo as (typeof TIPOS_DIARIA_TABELA)[number])
}

function isDiariaComDias(tipo: string): boolean {
  return TIPOS_DIARIA_COM_DIAS.includes(tipo as (typeof TIPOS_DIARIA_COM_DIAS)[number])
}

function valorCalculadoTabelaSus(dias: number): string {
  return formatMoedaBrFromNumber(dias * VALOR_DIARIA_SUS_2024)
}

function normalizarValorMoeda(value: string): string {
  const parsed =
    parseMoedaBrInput(value) ??
    (() => {
      const numero = Number.parseFloat(value.replace(/\./g, '').replace(',', '.'))
      return Number.isFinite(numero) ? numero : undefined
    })()

  if (parsed === undefined) {
    return value
  }

  return formatMoedaBrFromNumber(parsed)
}

function ServerError({ message }: { message: string }) {
  return (
    <p className="text-[length:var(--text-sm)] text-[var(--color-danger)]" role="alert">
      {message}
    </p>
  )
}

export interface DespesaSolicitacaoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  session: SaudeMunicSession
  solicitacaoId: string
  tipoInicial?: TfdTipoDespesaConfigKey
  valorInicial?: string
  quantidadeDiasInicial?: number
}

export function DespesaSolicitacaoDialog({
  open,
  onOpenChange,
  session,
  solicitacaoId,
  tipoInicial = TIPO_DESPESA_PADRAO,
  valorInicial,
  quantidadeDiasInicial,
}: DespesaSolicitacaoDialogProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [serverError, setServerError] = useState<string | null>(null)

  const [tipo, setTipo] = useState<TfdTipoDespesaConfigKey>(tipoInicial)
  const [descricao, setDescricao] = useState('')
  const [valor, setValor] = useState('')
  const [quantidadeDias, setQuantidadeDias] = useState('1')

  const valorNumerico = parseMoedaBrInput(valor) ?? Number.NaN
  const diasNumerico = Number.parseInt(quantidadeDias, 10)
  const tipoDespesaOptions = useMemo(() => buildTipoDespesaSelectOptions(), [])

  const diariaTabelaSus = isDiariaTabelaSus(tipo)
  const diariaComDias = isDiariaComDias(tipo)
  const valorBloqueado = diariaTabelaSus
  const mostraAlertaObito = tipo === 'OBITO'

  const valorPorDia =
    diariaTabelaSus && Number.isFinite(valorNumerico) && diasNumerico > 0
      ? valorNumerico / diasNumerico
      : null

  useEffect(() => {
    if (!open) {
      return
    }

    setTipo(tipoInicial)
    setDescricao('')
    setQuantidadeDias(String(quantidadeDiasInicial ?? 1))

    if (valorInicial) {
      setValor(normalizarValorMoeda(valorInicial))
    } else if (isDiariaTabelaSus(tipoInicial) && quantidadeDiasInicial) {
      setValor(valorCalculadoTabelaSus(quantidadeDiasInicial))
    } else if (isDiariaTabelaSus(tipoInicial)) {
      setValor(valorCalculadoTabelaSus(1))
    } else {
      setValor('')
    }
  }, [open, tipoInicial, valorInicial, quantidadeDiasInicial])

  useEffect(() => {
    if (!open || valorInicial || tipo === 'DEVOLUCAO' || !diariaTabelaSus) {
      return
    }

    if (diasNumerico >= 1) {
      setValor(valorCalculadoTabelaSus(diasNumerico))
    }
  }, [open, diariaTabelaSus, diasNumerico, valorInicial, tipo])

  function resetFormulario() {
    setTipo(tipoInicial)
    setDescricao('')
    setValor(valorInicial ? normalizarValorMoeda(valorInicial) : '')
    setQuantidadeDias(String(quantidadeDiasInicial ?? 1))
    setServerError(null)
  }

  function handleOpenChange(next: boolean) {
    if (!next) {
      resetFormulario()
    }
    onOpenChange(next)
  }

  function handleTipoChange(value: string) {
    const novoTipo = value as TfdTipoDespesaConfigKey
    setTipo(novoTipo)

    if (isDiariaTabelaSus(novoTipo)) {
      const dias = Number.parseInt(quantidadeDias, 10)
      setValor(valorCalculadoTabelaSus(Number.isFinite(dias) && dias >= 1 ? dias : 1))
      return
    }

    if (novoTipo !== 'DEVOLUCAO') {
      setValor('')
    }

    if (!isDiariaComDias(novoTipo)) {
      setQuantidadeDias('1')
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setServerError(null)

    if (!Number.isFinite(valorNumerico) || valorNumerico <= 0) {
      setServerError('Informe um valor positivo.')
      return
    }

    if (diariaComDias && (!Number.isFinite(diasNumerico) || diasNumerico < 1)) {
      setServerError('Informe a quantidade de dias (mínimo 1).')
      return
    }

    startTransition(async () => {
      const result = await registrarCustoComposicaoSolicitacaoTfd({
        solicitacaoId,
        tipo: tipo as RegistrarCustoComposicaoSolicitacaoInput['tipo'],
        descricao: descricao.trim() || undefined,
        valor: valorNumerico,
        quantidadeDias: diariaComDias ? diasNumerico : undefined,
      })

      if (!result.success) {
        setServerError(result.error ?? 'Não foi possível registrar o custo.')
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
            <Select
              label="Tipo de despesa"
              value={tipo}
              onValueChange={handleTipoChange}
              options={tipoDespesaOptions}
              disabled={isPending}
            />

            {mostraAlertaObito ? (
              <div
                className="rounded-[var(--radius)] border border-[var(--color-error)] bg-[var(--color-error-light)] p-[var(--space-3)]"
                role="alert"
              >
                <p className="text-[length:var(--text-sm)] font-medium text-[var(--color-text)]">
                  Despesas com óbito (Art. 6º, Portaria 55/1999)
                </p>
                <p className="mt-[var(--space-2)] text-[length:var(--text-sm)] text-[var(--color-text)]">
                  Documente número da certidão de óbito, nota fiscal da funerária e autorização do
                  gestor municipal.
                </p>
              </div>
            ) : null}

            {ajudaTipo && !mostraAlertaObito ? (
              <p className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">{ajudaTipo}</p>
            ) : null}

            {diariaComDias ? (
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
                {diariaTabelaSus ? (
                  <>
                    <p className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
                      {tipo === 'DIARIA_PACIENTE'
                        ? `Diária paciente: R$ ${formatMoedaBrFromNumber(VALOR_DIARIA_SUS_2024)} por dia (tabela SUS 2024). O valor total é calculado automaticamente.`
                        : `Diária acompanhante: R$ ${formatMoedaBrFromNumber(VALOR_DIARIA_SUS_2024)} por dia (tabela SUS 2024). O valor total é calculado automaticamente.`}
                    </p>
                    {valorPorDia !== null ? (
                      <p className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
                        Valor por dia: R$ {formatMoedaBrFromNumber(valorPorDia)}
                      </p>
                    ) : null}
                  </>
                ) : (
                  <p className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
                    Informe o valor total da diária manualmente no campo abaixo.
                  </p>
                )}
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

            <div className="w-full">
              <label
                htmlFor="valor-despesa-solicitacao"
                className="mb-[var(--space-1)] block text-[length:var(--text-sm)] font-medium text-[var(--color-text)]"
              >
                Valor
              </label>
              <div
                className={cn(
                  'flex min-h-[44px] w-full items-center gap-[var(--space-2)] rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] px-[var(--space-3)] py-[var(--space-2)] text-[length:var(--text-sm)] transition-colors focus-within:border-[var(--color-primary)] focus-within:ring-2 focus-within:ring-[var(--color-primary-light)]',
                  (isPending || valorBloqueado) &&
                    'cursor-not-allowed bg-[var(--color-bg)] text-[var(--color-text-muted)]'
                )}
              >
                <span className="shrink-0 font-medium text-[var(--color-text-muted)]">R$</span>
                <input
                  id="valor-despesa-solicitacao"
                  type="text"
                  inputMode="numeric"
                  value={valor}
                  onChange={(event) => setValor(formatMoedaBrInput(event.target.value))}
                  disabled={isPending || valorBloqueado}
                  readOnly={valorBloqueado}
                  placeholder="0,00"
                  className="min-w-0 flex-1 border-0 bg-transparent p-0 font-mono tabular-nums text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-subtle)] disabled:cursor-not-allowed"
                />
              </div>
              <p className="mt-[var(--space-1)] text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
                {valorBloqueado
                  ? 'Valor fixo conforme tabela SUS — altere a quantidade de dias para recalcular.'
                  : 'Digite o valor em reais. Ex.: 1.250,00'}
              </p>
            </div>

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
