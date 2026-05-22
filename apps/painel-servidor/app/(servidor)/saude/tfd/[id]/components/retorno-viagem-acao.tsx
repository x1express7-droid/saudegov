'use client'

import { TFD_PERMISSIONS, type TfdViagemSolicitacaoItem } from '@saude/mod-saude-tfd/client'
import { registrarRetornoTfd } from '@saude/mod-saude-tfd/actions/viagem'
import type { SaudeMunicSession } from '@saude/core-auth/types/session'

import { Alert, Button, Select, Spinner } from '@saude/ui'
import { PermissionGate } from '@saude/ui/permission-gate'
import { useRouter } from 'next/navigation'
import { useMemo, useState, useTransition } from 'react'

function ServerError({ message }: { message: string }) {
  return (
    <p className="text-[length:var(--text-sm)] text-[var(--color-danger)]" role="alert">
      {message}
    </p>
  )
}

export interface RetornoViagemAcaoProps {
  session: SaudeMunicSession
  solicitacaoStatus: string
  viagens: TfdViagemSolicitacaoItem[]
}

export function RetornoViagemAcao({
  session,
  solicitacaoStatus,
  viagens,
}: RetornoViagemAcaoProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [serverError, setServerError] = useState<string | null>(null)
  const [viagemId, setViagemId] = useState('')
  const [sucesso, setSucesso] = useState<string | null>(null)

  const viagensElegiveis = useMemo(
    () =>
      viagens.filter(
        (viagem) => viagem.status === 'AGENDADA' && viagem.prestacao === null
      ),
    [viagens]
  )

  const viagemOptions = viagensElegiveis.map((viagem) => ({
    value: viagem.id,
    label: `Viagem ${viagem.sequencia} — ${viagem.dataViagem}`,
  }))

  if (solicitacaoStatus !== 'EM_VIAGEM') {
    return null
  }

  function handleRegistrarRetorno() {
    const alvo = viagemId || viagensElegiveis[0]?.id
    if (!alvo) {
      setServerError('Nenhuma viagem agendada disponível para registrar retorno.')
      return
    }

    setServerError(null)
    setSucesso(null)

    startTransition(async () => {
      const result = await registrarRetornoTfd({ viagemId: alvo })

      if (!result.success) {
        setServerError(result.error ?? 'Não foi possível registrar o retorno.')
        return
      }

      setSucesso('Retorno registrado. A prestação de contas foi aberta com prazo de envio.')
      router.refresh()
    })
  }

  return (
    <PermissionGate session={session} permission={TFD_PERMISSIONS.REGISTRAR_RETORNO}>
      <div className="flex flex-col gap-[var(--space-3)] border-t border-[var(--color-border)] pt-[var(--space-4)]">
        <h3 className="text-[length:var(--text-sm)] font-semibold text-[var(--color-text)]">
          Registrar retorno da viagem
        </h3>

        {viagensElegiveis.length === 0 ? (
          <p className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
            Não há viagens agendadas pendentes de retorno.
          </p>
        ) : (
          <>
            {viagensElegiveis.length > 1 ? (
              <Select
                label="Viagem"
                value={viagemId || undefined}
                placeholder="Selecione a viagem"
                onValueChange={setViagemId}
                options={viagemOptions}
                disabled={isPending}
              />
            ) : (
              <p className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
                Viagem {viagensElegiveis[0]!.sequencia} — {viagensElegiveis[0]!.dataViagem}
              </p>
            )}

            <Button
              type="button"
              variant="primary"
              onClick={handleRegistrarRetorno}
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <Spinner className="mr-[var(--space-2)] size-4" />
                  Registrando retorno…
                </>
              ) : (
                'Registrar retorno'
              )}
            </Button>
          </>
        )}

        {sucesso ? <Alert variant="success">{sucesso}</Alert> : null}
        {serverError ? <ServerError message={serverError} /> : null}
      </div>
    </PermissionGate>
  )
}
