'use client'

import {
  TFD_PERMISSIONS,
  type TfdProjecaoFinanceiraOutput,
} from '@saude/mod-saude-tfd/client'
import { confirmarProjecaoFinanceiraSolicitacaoTfd } from '@saude/mod-saude-tfd/actions/projecao-financeira'
import type { SaudeMunicSession } from '@saude/core-auth/types/session'

import {
  Alert,
  Badge,
  Button,
  Select,
  Spinner,
} from '@saude/ui'
import { PermissionGate } from '@saude/ui/permission-gate'
import { Wallet } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState, useTransition } from 'react'

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

export interface SolicitacaoAcoesResumoFinanceiroProps {
  session: SaudeMunicSession
  projecao: TfdProjecaoFinanceiraOutput
}

export function SolicitacaoAcoesResumoFinanceiro({
  session,
  projecao,
}: SolicitacaoAcoesResumoFinanceiroProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [serverError, setServerError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const saldoInicial =
    projecao.saldoVinculado?.id ?? projecao.saldosDisponiveis[0]?.id ?? ''

  const [saldoId, setSaldoId] = useState(saldoInicial)

  useEffect(() => {
    setSaldoId(saldoInicial)
  }, [saldoInicial])

  const saldoSelecionado = useMemo(
    () => projecao.saldosDisponiveis.find((item) => item.id === saldoId) ?? null,
    [projecao.saldosDisponiveis, saldoId]
  )

  const saldoAposProjecao =
    saldoSelecionado !== null ? saldoSelecionado.valorDisponivel - projecao.valorTotal : null

  const saldoInsuficiente =
    saldoSelecionado !== null &&
    projecao.valorTotal > 0 &&
    projecao.valorTotal > saldoSelecionado.valorDisponivel

  const saldoOptions = projecao.saldosDisponiveis.map((saldo) => ({
    value: saldo.id,
    label: `${saldo.descricao} — ${currencyFormatter.format(saldo.valorDisponivel)} disponível`,
  }))

  function handleConfirmar() {
    if (!saldoId) {
      setServerError('Selecione o saldo que custeará a solicitação.')
      return
    }

    if (projecao.custos.length === 0) {
      setServerError('Adicione pelo menos uma despesa antes de confirmar.')
      return
    }

    setServerError(null)
    setSuccessMessage(null)

    startTransition(async () => {
      const response = await confirmarProjecaoFinanceiraSolicitacaoTfd({
        solicitacaoId: projecao.solicitacaoId,
        saldoId,
      })

      if (!response.success) {
        setServerError(response.error)
        return
      }

      setSuccessMessage('Projeção confirmada. Valor reservado no saldo selecionado.')
      router.refresh()
    })
  }

  if (projecao.projecaoConfirmada) {
    return (
      <div className="flex flex-col gap-[var(--space-3)] rounded-[var(--radius-md)] border border-[color-mix(in_srgb,var(--color-success)_30%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-success)_8%,var(--color-surface))] p-[var(--space-4)]">
        <div className="flex items-center gap-[var(--space-2)]">
          <Wallet className="size-4 shrink-0 text-[var(--color-success)]" aria-hidden="true" />
          <h3 className="text-[length:var(--text-sm)] font-semibold text-[var(--color-text)]">
            Resumo financeiro
          </h3>
        </div>
        <dl className="grid gap-[var(--space-2)] text-[length:var(--text-sm)]">
          <div>
            <dt className="text-[var(--color-text-muted)]">Total estimado</dt>
            <dd className="font-mono font-semibold tabular-nums text-[var(--color-success)]">
              {currencyFormatter.format(projecao.valorTotal)}
            </dd>
          </div>
          <div>
            <dt className="text-[var(--color-text-muted)]">Saldo vinculado</dt>
            <dd className="text-[var(--color-text)]">
              {projecao.saldoVinculado?.descricao ?? '—'}
            </dd>
          </div>
          <div>
            <dt className="text-[var(--color-text-muted)]">Valor reservado</dt>
            <dd className="font-mono font-semibold tabular-nums text-[var(--color-text)]">
              {currencyFormatter.format(projecao.reservaAtiva?.valor ?? projecao.valorTotal)}
            </dd>
          </div>
        </dl>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-[var(--space-3)] rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-subtle)] p-[var(--space-4)]">
      <div className="flex items-center gap-[var(--space-2)]">
        <Wallet className="size-4 shrink-0 text-[var(--color-primary)]" aria-hidden="true" />
        <h3 className="text-[length:var(--text-sm)] font-semibold text-[var(--color-text)]">
          Resumo financeiro
        </h3>
      </div>

      <dl className="grid gap-[var(--space-2)] text-[length:var(--text-sm)]">
        <div>
          <dt className="text-[var(--color-text-muted)]">Total estimado</dt>
          <dd className="font-mono text-[length:var(--text-base)] font-bold tabular-nums text-[var(--color-text)]">
            {currencyFormatter.format(projecao.valorTotal)}
          </dd>
        </div>
      </dl>

      {projecao.custos.length === 0 ? (
        <p className="text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
          Lance despesas na seção à esquerda para estimar o custo da viagem.
        </p>
      ) : null}

      {projecao.custos.length > 0 && saldoOptions.length > 0 ? (
        <>
          <Select
            label="Saldo de custeio"
            value={saldoId}
            onValueChange={setSaldoId}
            options={saldoOptions}
            disabled={isPending}
          />

          {saldoSelecionado ? (
            <dl className="grid gap-[var(--space-2)] text-[length:var(--text-sm)]">
              <div className="flex flex-wrap items-center gap-[var(--space-2)]">
                <dt className="text-[var(--color-text-muted)]">Disponível hoje</dt>
                <dd className="font-mono font-semibold tabular-nums text-[var(--color-text)]">
                  {currencyFormatter.format(saldoSelecionado.valorDisponivel)}
                </dd>
                {saldoSelecionado.alertaBaixo ? (
                  <Badge variant="yellow" size="sm">
                    Saldo abaixo de 20%
                  </Badge>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-[var(--space-2)]">
                <dt className="text-[var(--color-text-muted)]">Após esta reserva</dt>
                <dd
                  className={`font-mono font-semibold tabular-nums ${
                    saldoInsuficiente
                      ? 'text-[var(--color-error)]'
                      : 'text-[var(--color-success)]'
                  }`}
                >
                  {saldoAposProjecao !== null ? currencyFormatter.format(saldoAposProjecao) : '—'}
                </dd>
              </div>
            </dl>
          ) : null}

          {saldoInsuficiente ? (
            <Alert variant="error" role="alert">
              Saldo insuficiente para esta projeção. Ajuste as despesas ou selecione outro saldo.
            </Alert>
          ) : null}
        </>
      ) : null}

      {projecao.custos.length > 0 && saldoOptions.length === 0 ? (
        <Alert variant="warning" role="alert">
          Nenhum saldo ativo cadastrado. Cadastre um saldo em Configurações antes de confirmar a
          reserva.
        </Alert>
      ) : null}

      {projecao.aguardandoAprovacaoParaConfirmar ? (
        <Alert variant="warning" role="status">
          A reserva de saldo será liberada após a solicitação ser aprovada na regulação.
        </Alert>
      ) : null}

      {projecao.podeConfirmar ? (
        <PermissionGate session={session} permission={TFD_PERMISSIONS.GERENCIAR_SALDO}>
          {!saldoInsuficiente && saldoSelecionado && projecao.valorTotal > 0 ? (
            <p className="text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
              Ao confirmar, o valor total será reservado no saldo selecionado.
            </p>
          ) : null}
          <Button
            type="button"
            variant="primary"
            disabled={
              isPending || saldoInsuficiente || !saldoId || projecao.custos.length === 0
            }
            onClick={handleConfirmar}
          >
            {isPending ? (
              <>
                <Spinner className="mr-[var(--space-2)] size-4" />
                Confirmando…
              </>
            ) : (
              'Confirmar projeção e reservar saldo'
            )}
          </Button>
        </PermissionGate>
      ) : null}

      {successMessage ? (
        <p className="text-[length:var(--text-sm)] text-[var(--color-success)]" role="status">
          {successMessage}
        </p>
      ) : null}
      {serverError ? (
        <p className="text-[length:var(--text-sm)] text-[var(--color-danger)]" role="alert">
          {serverError}
        </p>
      ) : null}
    </div>
  )
}
