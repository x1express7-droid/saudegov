'use client'

import { Alert, Button } from '@saude/ui'
import { Copy, X } from 'lucide-react'
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

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(tempPassword)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <Alert variant="warning" titulo="Senha temporária gerada">
      <div className="flex flex-col gap-[var(--space-3)]">
        <p>
          Servidor <strong>{servidorNome}</strong> cadastrado. Copie a senha abaixo e
          entregue ao usuário de forma segura. Ela não será exibida novamente nesta tela.
        </p>
        <div className="flex flex-wrap items-center gap-[var(--space-3)]">
          <code className="rounded-[var(--radius)] bg-[var(--color-surface)] px-[var(--space-3)] py-[var(--space-2)] font-mono text-[length:var(--text-sm)]">
            {tempPassword}
          </code>
          <Button type="button" variant="secondary" onClick={handleCopy}>
            <Copy className="size-4" aria-hidden="true" />
            {copied ? 'Copiado' : 'Copiar'}
          </Button>
          <Button type="button" variant="ghost" onClick={onDismiss}>
            <X className="size-4" aria-hidden="true" />
            Fechar
          </Button>
        </div>
      </div>
    </Alert>
  )
}
