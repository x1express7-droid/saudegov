'use client'

import {
  TFD_PERMISSIONS,
  type TfdProjecaoFinanceiraOutput,
} from '@saude/mod-saude-tfd/client'
import {
  adicionarCustoPlanejadoSolicitacaoTfd,
  atualizarCustoPlanejadoSolicitacaoTfd,
  confirmarProjecaoFinanceiraSolicitacaoTfd,
  excluirCustoPlanejadoSolicitacaoTfd,
} from '@saude/mod-saude-tfd/actions/projecao-financeira'
import type { SaudeMunicSession } from '@saude/core-auth/types/session'
import { Alert, Badge, Button, Card, CardHeader, EmptyState, Input, Select, Spinner } from '@saude/ui'
import { PermissionGate } from '@saude/ui/permission-gate'
import { Pencil, Trash2, Wallet } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useMemo, useState, useTransition } from 'react'

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

export interface SolicitacaoProjecaoFinanceiraSectionProps {
  session: SaudeMunicSession
  projecao: TfdProjecaoFinanceiraOutput
}

function parseValorInput(value: string): number | null {
  const normalizado = value.replace(/\./g, '').replace(',', '.').trim()
  if (!normalizado) {
    return null
  }
  const numero = Number.parseFloat(normalizado)
  return Number.isFinite(numero) ? numero : null
}

export function SolicitacaoProjecaoFinanceiraSection({
  session,
  projecao,
}: SolicitacaoProjecaoFinanceiraSectionProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [serverError, setServerError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const [descricao, setDescricao] = useState('')
  const [valor, setValor] = useState('')
  const [saldoId, setSaldoId] = useState(projecao.saldosDisponiveis[0]?.id ?? '')
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [editDescricao, setEditDescricao] = useState('')
  const [editValor, setEditValor] = useState('')

  const saldoSelecionado = useMemo(
    () => projecao.saldosDisponiveis.find((item) => item.id === saldoId) ?? null,
    [projecao.saldosDisponiveis, saldoId]
  )

  const saldoAposProjecao =
    saldoSelecionado !== null ? saldoSelecionado.valorDisponivel - projecao.valorTotal : null

  const saldoInsuficiente =
    saldoSelecionado !== null && projecao.valorTotal > saldoSelecionado.valorDisponivel

  const saldoOptions = projecao.saldosDisponiveis.map((saldo) => ({
    value: saldo.id,
    label: `${saldo.descricao} — ${currencyFormatter.format(saldo.valorDisponivel)} disponível`,
  }))

  function limparFormulario() {
    setDescricao('')
    setValor('')
    setEditandoId(null)
    setEditDescricao('')
    setEditValor('')
  }

  function handleAdicionar() {
    const valorNumerico = parseValorInput(valor)
    if (!descricao.trim() || valorNumerico === null || valorNumerico <= 0) {
      setServerError('Informe descrição e valor válidos para o custo.')
      return
    }

    setServerError(null)
    setSuccessMessage(null)

    startTransition(async () => {
      const response = await adicionarCustoPlanejadoSolicitacaoTfd({
        solicitacaoId: projecao.solicitacaoId,
        descricao: descricao.trim(),
        valor: valorNumerico,
      })

      if (!response.success) {
        setServerError(response.error)
        return
      }

      limparFormulario()
      setSuccessMessage('Custo adicionado à projeção.')
      router.refresh()
    })
  }

  function iniciarEdicao(custo: TfdProjecaoFinanceiraOutput['custos'][number]) {
    setEditandoId(custo.id)
    setEditDescricao(custo.descricao)
    setEditValor(custo.valor.toFixed(2).replace('.', ','))
    setServerError(null)
    setSuccessMessage(null)
  }

  function handleSalvarEdicao(custoId: string) {
    const valorNumerico = parseValorInput(editValor)
    if (!editDescricao.trim() || valorNumerico === null || valorNumerico <= 0) {
      setServerError('Informe descrição e valor válidos para o custo.')
      return
    }

    setServerError(null)
    setSuccessMessage(null)

    startTransition(async () => {
      const response = await atualizarCustoPlanejadoSolicitacaoTfd({
        custoId,
        descricao: editDescricao.trim(),
        valor: valorNumerico,
      })

      if (!response.success) {
        setServerError(response.error)
        return
      }

      limparFormulario()
      setSuccessMessage('Custo atualizado.')
      router.refresh()
    })
  }

  function handleExcluir(custoId: string) {
    setServerError(null)
    setSuccessMessage(null)

    startTransition(async () => {
      const response = await excluirCustoPlanejadoSolicitacaoTfd({ custoId })

      if (!response.success) {
        setServerError(response.error)
        return
      }

      if (editandoId === custoId) {
        limparFormulario()
      }

      setSuccessMessage('Custo removido da projeção.')
      router.refresh()
    })
  }

  function handleConfirmar() {
    if (!saldoId) {
      setServerError('Selecione o saldo que custeará a solicitação.')
      return
    }

    if (projecao.custos.length === 0) {
      setServerError('Adicione pelo menos um custo antes de confirmar.')
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

  const exibirSecao =
    projecao.custos.length > 0 ||
    projecao.projecaoConfirmada ||
    projecao.podeEditar

  if (!exibirSecao) {
    return (
      <PermissionGate session={session} permission={TFD_PERMISSIONS.GERENCIAR_SALDO}>
        <Card
          header={
            <div>
              <CardHeader>Projeção financeira</CardHeader>
              <p className="mt-[var(--space-1)] text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
                Planeje os custos durante a análise e reserve saldo após a aprovação da solicitação.
              </p>
            </div>
          }
        >
          <EmptyState
            icon={<Wallet className="size-6" />}
            titulo="Planejamento indisponível neste status"
            descricao="A projeção financeira pode ser registrada quando a solicitação estiver enviada, em análise ou aprovada (antes da reserva)."
          />
        </Card>
      </PermissionGate>
    )
  }

  return (
    <Card
      header={
        <div>
          <CardHeader>Projeção financeira</CardHeader>
          <p className="mt-[var(--space-1)] text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
            Registre os custos planejados durante a análise e confirme a reserva após a aprovação da
            solicitação.
          </p>
        </div>
      }
    >
      <div className="flex flex-col gap-[var(--space-4)]">
        {projecao.projecaoConfirmada ? (
          <Alert variant="success" titulo="Projeção confirmada e reserva ativa" role="status">
            <p className="text-[length:var(--text-sm)]">
              {projecao.saldoVinculado
                ? `Saldo: ${projecao.saldoVinculado.descricao} · `
                : null}
              Total reservado:{' '}
              <strong>
                {currencyFormatter.format(projecao.reservaAtiva?.valor ?? projecao.valorTotal)}
              </strong>
            </p>
          </Alert>
        ) : null}

        {projecao.custos.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-[length:var(--text-sm)]">
              <thead>
                <tr className="border-b border-[var(--color-border)] text-[var(--color-text-muted)]">
                  <th className="py-[var(--space-2)] pr-[var(--space-3)] font-medium">Descrição</th>
                  <th className="py-[var(--space-2)] pr-[var(--space-3)] font-medium">Valor</th>
                  {projecao.podeEditar ? (
                    <th className="py-[var(--space-2)] font-medium">Ações</th>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {projecao.custos.map((custo) => (
                  <tr key={custo.id} className="border-b border-[var(--color-border)] last:border-0">
                    <td className="py-[var(--space-3)] pr-[var(--space-3)] align-top">
                      {editandoId === custo.id ? (
                        <Input
                          value={editDescricao}
                          onChange={(event) => setEditDescricao(event.target.value)}
                          disabled={isPending}
                          aria-label="Editar descrição do custo"
                        />
                      ) : (
                        custo.descricao
                      )}
                    </td>
                    <td className="py-[var(--space-3)] pr-[var(--space-3)] align-top tabular-nums">
                      {editandoId === custo.id ? (
                        <Input
                          value={editValor}
                          onChange={(event) => setEditValor(event.target.value)}
                          disabled={isPending}
                          inputMode="decimal"
                          aria-label="Editar valor do custo"
                        />
                      ) : (
                        currencyFormatter.format(custo.valor)
                      )}
                    </td>
                    {projecao.podeEditar ? (
                      <td className="py-[var(--space-3)] align-top">
                        <div className="flex flex-wrap gap-[var(--space-2)]">
                          {editandoId === custo.id ? (
                            <>
                              <Button
                                type="button"
                                variant="primary"
                                className="min-h-[36px] min-w-0 px-[var(--space-3)] py-[var(--space-1)]"
                                disabled={isPending}
                                onClick={() => handleSalvarEdicao(custo.id)}
                              >
                                Salvar
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                className="min-h-[36px] min-w-0 px-[var(--space-3)] py-[var(--space-1)]"
                                disabled={isPending}
                                onClick={limparFormulario}
                              >
                                Cancelar
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                type="button"
                                variant="outline"
                                className="min-h-[36px] min-w-[36px] px-[var(--space-2)] py-[var(--space-1)]"
                                disabled={isPending}
                                onClick={() => iniciarEdicao(custo)}
                                aria-label={`Editar ${custo.descricao}`}
                              >
                                <Pencil className="size-4" aria-hidden="true" />
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                className="min-h-[36px] min-w-[36px] px-[var(--space-2)] py-[var(--space-1)]"
                                disabled={isPending}
                                onClick={() => handleExcluir(custo.id)}
                                aria-label={`Excluir ${custo.descricao}`}
                              >
                                <Trash2 className="size-4" aria-hidden="true" />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td className="pt-[var(--space-3)] font-semibold text-[var(--color-text)]">Total</td>
                  <td className="pt-[var(--space-3)] font-semibold tabular-nums text-[var(--color-text)]">
                    {currencyFormatter.format(projecao.valorTotal)}
                  </td>
                  {projecao.podeEditar ? <td /> : null}
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={<Wallet className="size-6" />}
            titulo="Nenhum custo planejado"
            descricao="Adicione itens de custo para montar a projeção financeira desta solicitação."
          />
        )}

        {projecao.podeEditar ? (
          <div className="rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] p-[var(--space-4)]">
            <h3 className="text-[length:var(--text-sm)] font-semibold text-[var(--color-text)]">
              Adicionar custo
            </h3>
            <div className="mt-[var(--space-3)] grid gap-[var(--space-3)] sm:grid-cols-[minmax(0,1fr)_160px_auto]">
              <Input
                label="Descrição do custo"
                value={descricao}
                onChange={(event) => setDescricao(event.target.value)}
                disabled={isPending}
                placeholder="Ex.: Transporte ida e volta"
              />
              <Input
                label="Valor (R$)"
                value={valor}
                onChange={(event) => setValor(event.target.value)}
                disabled={isPending}
                inputMode="decimal"
                placeholder="0,00"
              />
              <div className="flex items-end">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={isPending}
                  onClick={handleAdicionar}
                  className="w-full sm:w-auto"
                >
                  {isPending ? <Spinner className="size-4" /> : 'Adicionar'}
                </Button>
              </div>
            </div>
          </div>
        ) : null}

        {projecao.aguardandoAprovacaoParaConfirmar ? (
          <Alert variant="warning" role="status">
            Os custos planejados foram registrados. A confirmação da projeção e a reserva de saldo
            só serão liberadas após a solicitação ser aprovada na regulação.
          </Alert>
        ) : null}

        {projecao.podeConfirmar ? (
          <div className="flex flex-col gap-[var(--space-3)] rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-bg)] p-[var(--space-4)]">
            <h3 className="text-[length:var(--text-sm)] font-semibold text-[var(--color-text)]">
              Confirmar projeção e reservar saldo
            </h3>

            {saldoOptions.length > 0 ? (
              <Select
                label="Saldo de custeio"
                value={saldoId}
                onValueChange={setSaldoId}
                options={saldoOptions}
                disabled={isPending}
              />
            ) : (
              <Alert variant="warning" role="alert">
                Nenhum saldo ativo cadastrado. Cadastre um saldo em Configurações antes de confirmar.
              </Alert>
            )}

            {saldoSelecionado ? (
              <div className="grid gap-[var(--space-2)] text-[length:var(--text-sm)]">
                <div className="flex flex-wrap items-center gap-[var(--space-2)]">
                  <span className="text-[var(--color-text-muted)]">Disponível hoje:</span>
                  <strong>{currencyFormatter.format(saldoSelecionado.valorDisponivel)}</strong>
                  {saldoSelecionado.alertaBaixo ? (
                    <Badge variant="yellow" size="sm">
                      Saldo abaixo de 20%
                    </Badge>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-[var(--space-2)]">
                  <span className="text-[var(--color-text-muted)]">Após esta reserva:</span>
                  <strong>
                    {saldoAposProjecao !== null
                      ? currencyFormatter.format(saldoAposProjecao)
                      : '—'}
                  </strong>
                </div>
              </div>
            ) : null}

            {saldoInsuficiente ? (
              <Alert variant="error" role="alert">
                Saldo insuficiente para esta projeção. Ajuste os custos ou selecione outro saldo.
              </Alert>
            ) : null}

            {!saldoInsuficiente && saldoSelecionado && projecao.valorTotal > 0 ? (
              <Alert variant="info" role="status">
                Ao confirmar, o valor total será reservado no saldo selecionado e vinculado a esta
                solicitação.
              </Alert>
            ) : null}

            <Button
              type="button"
              variant="primary"
              disabled={isPending || saldoInsuficiente || !saldoId || projecao.custos.length === 0}
              onClick={handleConfirmar}
            >
              {isPending ? (
                <>
                  <Spinner className="size-4" />
                  Confirmando…
                </>
              ) : (
                'Confirmar projeção e reservar saldo'
              )}
            </Button>
          </div>
        ) : null}

        {successMessage ? (
          <Alert variant="success" role="status">
            {successMessage}
          </Alert>
        ) : null}

        {serverError ? (
          <Alert variant="error" role="alert">
            {serverError}
          </Alert>
        ) : null}
      </div>
    </Card>
  )
}
