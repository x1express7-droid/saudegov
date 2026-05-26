'use client'

import { decidirSolicitacaoTfd } from '@saude/mod-saude-tfd/actions/decisao'
import {
  MIN_DISTANCIA_TFD_KM,
  avaliarVedacoesTfd,
  type ContextoDecisaoTfd,
  type SaldoListItem,
} from '@saude/mod-saude-tfd/client'
import { Alert, Badge, Button, Input, Select, Spinner, Textarea } from '@saude/ui'
import { useMemo, useState, useTransition } from 'react'

const MIN_TEXTO = 20

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

interface DecisaoFormProps {
  solicitacaoId: string
  saldosAtivos: SaldoListItem[]
  canLoadSaldos: boolean
  contextoVedacoes: ContextoDecisaoTfd | null
  onSuccess: () => void
  onError: (message: string) => void
  onCancel: () => void
}

function CheckboxField({
  id,
  label,
  hint,
  checked,
  onChange,
  disabled,
}: {
  id: string
  label: string
  hint?: string
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
}) {
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-start gap-[var(--space-2)] text-[length:var(--text-sm)]"
    >
      <input
        id={id}
        type="checkbox"
        className="mt-[var(--space-1)] size-4 shrink-0 accent-[var(--color-primary)]"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        disabled={disabled}
      />
      <span>
        <span className="font-medium text-[var(--color-text)]">{label}</span>
        {hint ? (
          <span className="mt-[var(--space-1)] block text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
            {hint}
          </span>
        ) : null}
      </span>
    </label>
  )
}

export function DecisaoForm({
  solicitacaoId,
  saldosAtivos,
  canLoadSaldos,
  contextoVedacoes,
  onSuccess,
  onError,
  onCancel,
}: DecisaoFormProps) {
  const [isPending, startTransition] = useTransition()
  const [decisao, setDecisao] = useState<'APROVADO' | 'NEGADO'>('APROVADO')
  const [saldoId, setSaldoId] = useState('')
  const [valorEstimado, setValorEstimado] = useState('')
  const [fundamentacao, setFundamentacao] = useState('')
  const [distanciaKmManual, setDistanciaKmManual] = useState('')
  const [tratamentoExperimental, setTratamentoExperimental] = useState(false)
  const [regiaoMetropolitana, setRegiaoMetropolitana] = useState(false)
  const [pacienteHospitalizadoDestino, setPacienteHospitalizadoDestino] = useState(false)
  const [confirmTratamento, setConfirmTratamento] = useState(false)
  const [confirmRegiao, setConfirmRegiao] = useState(false)
  const [confirmHospitalizado, setConfirmHospitalizado] = useState(false)

  const saldoOptions = saldosAtivos.map((saldo) => ({
    value: saldo.id,
    label: `${saldo.descricao} — disponível ${currencyFormatter.format(saldo.valorDisponivel)}`,
  }))

  const distanciaKmEfetiva = useMemo(() => {
    const manual = distanciaKmManual.trim()
    if (manual !== '') {
      const parsed = Number.parseFloat(manual.replace(',', '.'))
      return Number.isFinite(parsed) ? parsed : null
    }
    return contextoVedacoes?.distanciaKmCalculada ?? null
  }, [contextoVedacoes?.distanciaKmCalculada, distanciaKmManual])

  const confirmacaoVedacoes =
    (!tratamentoExperimental || confirmTratamento) &&
    (!regiaoMetropolitana || confirmRegiao) &&
    (!pacienteHospitalizadoDestino || confirmHospitalizado)

  const vedacoes = useMemo(() => {
    if (decisao !== 'APROVADO' || !contextoVedacoes) {
      return null
    }
    return avaliarVedacoesTfd({
      possuiProcedimentoPab: contextoVedacoes.possuiProcedimentoPab,
      distanciaKm: distanciaKmEfetiva,
      tratamentoExperimental,
      regiaoMetropolitana,
      pacienteHospitalizadoDestino,
      confirmacaoVedacoes,
    })
  }, [
    decisao,
    contextoVedacoes,
    distanciaKmEfetiva,
    tratamentoExperimental,
    regiaoMetropolitana,
    pacienteHospitalizadoDestino,
    confirmacaoVedacoes,
  ])

  const podeConfirmarAprovacao =
    decisao === 'NEGADO' ||
    (vedacoes !== null && vedacoes.podeAprovar && !vedacoes.possuiBloqueio)

  function handleSubmit() {
    if (fundamentacao.trim().length < MIN_TEXTO) {
      onError('A fundamentação deve ter pelo menos 20 caracteres.')
      return
    }

    onError('')

    startTransition(async () => {
      if (decisao === 'NEGADO') {
        const result = await decidirSolicitacaoTfd({
          solicitacaoId,
          decisao: 'NEGADO',
          fundamentacao: fundamentacao.trim(),
        })
        if (!result.success) {
          onError(result.error ?? 'Não foi possível registrar a decisão.')
          return
        }
        onSuccess()
        return
      }

      const valor = Number.parseFloat(valorEstimado.replace(',', '.'))
      if (!saldoId) {
        onError('Selecione o saldo financeiro.')
        return
      }
      if (!Number.isFinite(valor) || valor <= 0) {
        onError('Informe um valor estimado positivo.')
        return
      }

      const distanciaKm =
        distanciaKmManual.trim() !== ''
          ? Number.parseFloat(distanciaKmManual.replace(',', '.'))
          : undefined

      if (distanciaKmManual.trim() !== '' && (!Number.isFinite(distanciaKm!) || distanciaKm! < 0)) {
        onError('Informe uma distância válida em quilômetros.')
        return
      }

      const result = await decidirSolicitacaoTfd({
        solicitacaoId,
        decisao: 'APROVADO',
        fundamentacao: fundamentacao.trim(),
        saldoId,
        valorEstimado: valor,
        ...(distanciaKm !== undefined ? { distanciaKm } : {}),
        tratamentoExperimental,
        regiaoMetropolitana,
        pacienteHospitalizadoDestino,
        confirmacaoVedacoes,
      })

      if (!result.success) {
        onError(result.error ?? 'Não foi possível registrar a decisão.')
        return
      }

      onSuccess()
    })
  }

  return (
    <div className="flex flex-col gap-[var(--space-3)]">
      <Select
        label="Decisão"
        value={decisao}
        onValueChange={(value) => setDecisao(value as 'APROVADO' | 'NEGADO')}
        options={[
          { value: 'APROVADO', label: 'Aprovar' },
          { value: 'NEGADO', label: 'Negar' },
        ]}
        disabled={isPending}
      />

      {decisao === 'APROVADO' ? (
        <>
          {canLoadSaldos && saldoOptions.length > 0 ? (
            <Select
              label="Saldo financeiro"
              value={saldoId || undefined}
              placeholder="Selecione um saldo"
              onValueChange={setSaldoId}
              options={saldoOptions}
              disabled={isPending}
            />
          ) : (
            <p className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
              Nenhum saldo ativo disponível. Cadastre um saldo em configurações financeiras.
            </p>
          )}

          <Input
            label="Valor estimado (R$)"
            type="text"
            inputMode="decimal"
            value={valorEstimado}
            onChange={(event) => setValorEstimado(event.target.value)}
            disabled={isPending}
            placeholder="0,00"
          />

          <div className="flex flex-col gap-[var(--space-3)] rounded-[var(--radius-sm)] border border-[var(--color-border)] p-[var(--space-3)]">
            <div className="flex flex-wrap items-center gap-[var(--space-2)]">
              <p className="text-[length:var(--text-sm)] font-medium text-[var(--color-text)]">
                Vedações (Portaria 55/1999)
              </p>
              {contextoVedacoes?.possuiProcedimentoPab ? (
                <Badge variant="red" size="sm">
                  Procedimento PAB
                </Badge>
              ) : null}
            </div>

            {contextoVedacoes ? (
              <p className="text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
                Destino: {contextoVedacoes.prestadorCidade}/{contextoVedacoes.prestadorEstado}
                {!contextoVedacoes.origemMunicipioConfigurada
                  ? ' — configure o município de origem em Configurações do município para cálculo automático de distância.'
                  : null}
              </p>
            ) : (
              <Alert variant="warning" role="alert">
                Não foi possível carregar o contexto de vedações para esta solicitação.
              </Alert>
            )}

            {contextoVedacoes &&
            contextoVedacoes.distanciaKmCalculada !== null &&
            distanciaKmManual.trim() === '' ? (
              <div className="flex flex-wrap items-center gap-[var(--space-2)]">
                <span className="text-[length:var(--text-sm)] text-[var(--color-text)]">
                  Distância estimada (mesmo município):{' '}
                  <strong>{contextoVedacoes.distanciaKmCalculada} km</strong>
                </span>
                {contextoVedacoes.distanciaKmCalculada < MIN_DISTANCIA_TFD_KM ? (
                  <Badge variant="red" size="sm">
                    Abaixo de {MIN_DISTANCIA_TFD_KM} km
                  </Badge>
                ) : null}
              </div>
            ) : null}

            {contextoVedacoes?.distanciaKmCalculada === null ? (
              <Input
                label="Distância origem → destino (km)"
                type="text"
                inputMode="decimal"
                value={distanciaKmManual}
                onChange={(event) => setDistanciaKmManual(event.target.value)}
                disabled={isPending}
                hint="Informe a distância em km quando o sistema não conseguir calculá-la automaticamente."
              />
            ) : null}

            {distanciaKmEfetiva !== null &&
            distanciaKmEfetiva < MIN_DISTANCIA_TFD_KM &&
            distanciaKmManual.trim() !== '' ? (
              <Alert variant="error" role="alert">
                Distância informada ({distanciaKmEfetiva} km) é inferior ao mínimo de{' '}
                {MIN_DISTANCIA_TFD_KM} km exigido para TFD.
              </Alert>
            ) : null}

            <fieldset className="flex flex-col gap-[var(--space-3)]">
              <legend className="sr-only">Indicadores subjetivos de vedação</legend>
              <CheckboxField
                id="vedacao-tratamento-experimental"
                label="Tratamento experimental"
                checked={tratamentoExperimental}
                onChange={(checked) => {
                  setTratamentoExperimental(checked)
                  if (!checked) {
                    setConfirmTratamento(false)
                  }
                }}
                disabled={isPending || vedacoes?.possuiBloqueio}
              />
              {tratamentoExperimental ? (
                <CheckboxField
                  id="confirm-tratamento-experimental"
                  label="Confirmo que analisei esta vedação e a fundamentação cobre o caso"
                  checked={confirmTratamento}
                  onChange={setConfirmTratamento}
                  disabled={isPending}
                />
              ) : null}

              <CheckboxField
                id="vedacao-regiao-metropolitana"
                label="Deslocamento em região metropolitana"
                checked={regiaoMetropolitana}
                onChange={(checked) => {
                  setRegiaoMetropolitana(checked)
                  if (!checked) {
                    setConfirmRegiao(false)
                  }
                }}
                disabled={isPending || vedacoes?.possuiBloqueio}
              />
              {regiaoMetropolitana ? (
                <CheckboxField
                  id="confirm-regiao-metropolitana"
                  label="Confirmo que analisei esta vedação e a fundamentação cobre o caso"
                  checked={confirmRegiao}
                  onChange={setConfirmRegiao}
                  disabled={isPending}
                />
              ) : null}

              <CheckboxField
                id="vedacao-paciente-hospitalizado"
                label="Paciente hospitalizado no destino"
                hint="Diárias de pernoite não se aplicam neste caso."
                checked={pacienteHospitalizadoDestino}
                onChange={(checked) => {
                  setPacienteHospitalizadoDestino(checked)
                  if (!checked) {
                    setConfirmHospitalizado(false)
                  }
                }}
                disabled={isPending || vedacoes?.possuiBloqueio}
              />
              {pacienteHospitalizadoDestino ? (
                <CheckboxField
                  id="confirm-paciente-hospitalizado"
                  label="Confirmo que analisei esta vedação e a fundamentação cobre o caso"
                  checked={confirmHospitalizado}
                  onChange={setConfirmHospitalizado}
                  disabled={isPending}
                />
              ) : null}
            </fieldset>

            {vedacoes?.possuiBloqueio
              ? vedacoes.itens
                  .filter((item) => item.severidade === 'BLOQUEIO')
                  .map((item) => (
                    <Alert key={item.codigo} variant="error" role="alert">
                      {item.mensagem}
                    </Alert>
                  ))
              : null}

            {vedacoes?.possuiAlerta && !vedacoes.possuiBloqueio
              ? vedacoes.itens
                  .filter((item) => item.severidade === 'ALERTA')
                  .map((item) => (
                    <Alert key={item.codigo} variant="warning" role="alert">
                      {item.mensagem}
                    </Alert>
                  ))
              : null}
          </div>
        </>
      ) : null}

      <Textarea
        label="Fundamentação"
        value={fundamentacao}
        onChange={(event) => setFundamentacao(event.target.value)}
        rows={4}
        disabled={isPending}
        hint={`Mínimo de ${MIN_TEXTO} caracteres.`}
      />

      <div className="flex flex-wrap gap-[var(--space-2)]">
        {podeConfirmarAprovacao ? (
          <Button type="button" variant="primary" onClick={handleSubmit} disabled={isPending}>
            {isPending ? (
              <>
                <Spinner className="mr-[var(--space-2)] size-4" />
                Registrando…
              </>
            ) : (
              'Confirmar decisão'
            )}
          </Button>
        ) : decisao === 'APROVADO' ? (
          <p className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
            Resolva os bloqueios ou confirme todas as vedações indicadas para habilitar a
            aprovação.
          </p>
        ) : (
          <Button type="button" variant="primary" onClick={handleSubmit} disabled={isPending}>
            {isPending ? 'Registrando…' : 'Confirmar decisão'}
          </Button>
        )}
        <Button type="button" variant="ghost" onClick={onCancel} disabled={isPending}>
          Cancelar
        </Button>
      </div>
    </div>
  )
}
