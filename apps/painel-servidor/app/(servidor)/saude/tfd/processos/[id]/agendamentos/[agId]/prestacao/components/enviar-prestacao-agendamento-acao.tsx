'use client'

import { TFD_PERMISSIONS } from '@saude/mod-saude-tfd/client'
import { enviarPrestacaoContasAgendamento } from '@saude/mod-saude-tfd/actions/financeiro'
import type { SaudeMunicSession } from '@saude/core-auth/types/session'

import { Alert, Button, Card, CardHeader, Spinner } from '@saude/ui'
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

export interface EnviarPrestacaoAgendamentoAcaoProps {
  session: SaudeMunicSession
  prestacaoId: string
  prestacaoStatus: string
  quantidadeItens: number
}

export function EnviarPrestacaoAgendamentoAcao({
  session,
  prestacaoId,
  prestacaoStatus,
  quantidadeItens,
}: EnviarPrestacaoAgendamentoAcaoProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [serverError, setServerError] = useState<string | null>(null)

  const podeEnviar =
    (prestacaoStatus === 'PENDENTE' || prestacaoStatus === 'REJEITADA') &&
    quantidadeItens > 0

  if (prestacaoStatus !== 'PENDENTE' && prestacaoStatus !== 'REJEITADA') {
    return null
  }

  function handleEnviar() {
    setServerError(null)

    startTransition(async () => {
      const result = await enviarPrestacaoContasAgendamento({ prestacaoId })

      if (!result.success) {
        setServerError(result.error ?? 'Não foi possível enviar a prestação de contas.')
        return
      }

      router.refresh()
    })
  }

  return (
    <PermissionGate session={session} permission={TFD_PERMISSIONS.ENVIAR_PRESTACAO}>
      <Card header={<CardHeader>Enviar prestação</CardHeader>}>
        <div className="flex flex-col gap-[var(--space-3)]">
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
            onClick={handleEnviar}
            disabled={isPending || !podeEnviar}
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
      </Card>
    </PermissionGate>
  )
}
