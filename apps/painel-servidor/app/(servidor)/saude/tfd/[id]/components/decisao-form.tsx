'use client'

import { decidirSolicitacaoTfd } from '@saude/mod-saude-tfd/actions/decisao'
import { Button, Select, Spinner, Textarea } from '@saude/ui'
import { useState, useTransition } from 'react'

interface DecisaoFormProps {
  solicitacaoId: string
  onSuccess: () => void
  onError: (message: string) => void
  onCancel: () => void
}

export function DecisaoForm({
  solicitacaoId,
  onSuccess,
  onError,
  onCancel,
}: DecisaoFormProps) {
  const [isPending, startTransition] = useTransition()
  const [decisao, setDecisao] = useState<'APROVADO' | 'NEGADO'>('APROVADO')
  const [fundamentacao, setFundamentacao] = useState('')

  function handleSubmit() {
    onError('')

    startTransition(async () => {
      const result = await decidirSolicitacaoTfd({
        solicitacaoId,
        decisao,
        fundamentacao: fundamentacao.trim(),
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

      <Textarea
        label="Fundamentação"
        value={fundamentacao}
        onChange={(event) => setFundamentacao(event.target.value)}
        rows={4}
        disabled={isPending}
      />

      <div className="flex flex-wrap gap-[var(--space-2)]">
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
        <Button type="button" variant="ghost" onClick={onCancel} disabled={isPending}>
          Cancelar
        </Button>
      </div>
    </div>
  )
}
