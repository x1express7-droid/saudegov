'use client'

import { TFD_PERMISSIONS, type TfdViagemSolicitacaoItem } from '@saude/mod-saude-tfd/client'
import { enviarPrestacaoContas } from '@saude/mod-saude-tfd/actions/financeiro'
import type { SaudeMunicSession } from '@saude/core-auth/types/session'

import { Alert, Button, Select, Spinner } from '@saude/ui'
import { PermissionGate } from '@saude/ui/permission-gate'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

function ServerError({ message }: { message: string }) {
  return (
    <p className="text-[length:var(--text-sm)] text-[var(--color-danger)]" role="alert">
      {message}
    </p>
  )
}

export interface EnviarPrestacaoAcaoProps {
  session: SaudeMunicSession
  viagensElegiveis: TfdViagemSolicitacaoItem[]
  viagemId: string
  onViagemChange: (viagemId: string) => void
}

export function EnviarPrestacaoAcao({
  session,
  viagensElegiveis,
  viagemId,
  onViagemChange,
}: EnviarPrestacaoAcaoProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [serverError, setServerError] = useState<string | null>(null)

  const viagemSelecionada = viagensElegiveis.find((viagem) => viagem.id === viagemId)
  const prestacaoId = viagemSelecionada?.prestacao?.id
  const quantidadeItens = viagemSelecionada?.itensDespesa.length ?? 0
  const podeEnviar = quantidadeItens > 0

  const viagemOptions = viagensElegiveis.map((viagem) => ({
    value: viagem.id,
    label: `Viagem ${viagem.sequencia}${
      viagem.prestacao?.status === 'REJEITADA' ? ' (correção)' : ''
    }`,
  }))

  function handleEnviarPrestacao() {
    if (!prestacaoId) {
      setServerError('Selecione a viagem da prestação.')
      return
    }

    setServerError(null)

    startTransition(async () => {
      const result = await enviarPrestacaoContas({ prestacaoId })

      if (!result.success) {
        setServerError(result.error ?? 'Não foi possível enviar a prestação de contas.')
        return
      }

      router.refresh()
    })
  }

  return (
    <PermissionGate session={session} permission={TFD_PERMISSIONS.ENVIAR_PRESTACAO}>
      <div className="flex flex-col gap-[var(--space-3)] border-t border-[var(--color-border)] pt-[var(--space-4)]">
        <h3 className="text-[length:var(--text-sm)] font-semibold text-[var(--color-text)]">
          Enviar prestação de contas
        </h3>

        {viagensElegiveis.length > 1 ? (
          <Select
            label="Viagem"
            value={viagemId || undefined}
            onValueChange={onViagemChange}
            options={viagemOptions}
            disabled={isPending}
          />
        ) : null}

        {!podeEnviar ? (
          <Alert variant="info" role="status">
            Lance pelo menos um item de despesa antes de enviar a prestação para análise.
          </Alert>
        ) : (
          <p className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
            {quantidadeItens} item(ns) de despesa lançado(s). Ao enviar, a prestação segue para
            análise do gestor.
          </p>
        )}

        <Button
          type="button"
          variant="primary"
          onClick={handleEnviarPrestacao}
          disabled={isPending || !podeEnviar || !prestacaoId}
        >
          {isPending ? (
            <>
              <Spinner className="mr-[var(--space-2)] size-4" />
              Enviando…
            </>
          ) : (
            'Enviar prestação'
          )}
        </Button>

        {serverError ? <ServerError message={serverError} /> : null}
      </div>
    </PermissionGate>
  )
}
