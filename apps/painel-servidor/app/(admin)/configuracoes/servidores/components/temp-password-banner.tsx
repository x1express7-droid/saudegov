'use client'

import { Alert, Button, copyToClipboard } from '@saude/ui'
import { Check, Copy, X } from 'lucide-react'
import { useState } from 'react'

interface TempPasswordBannerProps {
  servidorNome: string
  tempPassword: string
  onDismiss: () => void
}

export function TempPasswordBanner({
  servidorNome,
  tempPassword,
  onDismiss,
}: TempPasswordBannerProps) {
  const [copied, setCopied] = useState(false)
  const [copyError, setCopyError] = useState(false)

  async function handleCopy() {
    setCopyError(false)
    const ok = await copyToClipboard(tempPassword)
    if (ok) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      return
    }
    setCopied(false)
    setCopyError(true)
  }

  return (
    <Alert variant="warning" titulo="Senha temporária gerada">
      <div className="flex flex-col gap-[var(--space-3)]">
        <p>
          Servidor <strong>{servidorNome}</strong> cadastrado. Copie a senha abaixo e
          entregue ao usuário de forma segura. Ela não será exibida novamente nesta tela.
        </p>
        <div className="flex flex-wrap items-center gap-[var(--space-3)]">
          <code
            className="select-all rounded-[var(--radius)] bg-[var(--color-surface)] px-[var(--space-3)] py-[var(--space-2)] font-mono text-[length:var(--text-sm)]"
            title="Selecione e copie manualmente se o botão falhar"
          >
            {tempPassword}
          </code>
          <Button type="button" variant="secondary" onClick={() => void handleCopy()}>
            {copied ? (
              <Check className="size-4" aria-hidden="true" />
            ) : (
              <Copy className="size-4" aria-hidden="true" />
            )}
            {copied ? 'Copiado' : 'Copiar'}
          </Button>
          <Button type="button" variant="ghost" onClick={onDismiss}>
            <X className="size-4" aria-hidden="true" />
            Fechar
          </Button>
        </div>
        {copyError ? (
          <p role="alert" className="text-[length:var(--text-sm)] text-[var(--color-error)]">
            Não foi possível copiar automaticamente. Selecione a senha acima e use Ctrl+C.
          </p>
        ) : null}
      </div>
    </Alert>
  )
}
