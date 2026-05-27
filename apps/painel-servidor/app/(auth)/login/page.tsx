import { headers } from 'next/headers'
import { getTenantByDomain } from '@saude/core-db'
import { LoginForm } from './components/login-form'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  const h = await headers()
  const tenantId = h.get('x-tenant-id')
  const host = h.get('host') ?? ''
  const domain = host.replace(/^www\./, '').split(':')[0] ?? ''
  const tenant = domain ? await getTenantByDomain(domain) : null

  const municipalityName =
    (tenant?.theme as Record<string, string> | null)?.municipalityName ?? tenant?.name

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-[var(--space-6)] bg-[var(--color-bg)] p-[var(--space-8)]">
      <div className="flex w-full max-w-sm flex-col gap-[var(--space-2)] text-center">
        <h1 className="text-[length:var(--text-2xl)] font-semibold text-[var(--color-text)]">Entrar</h1>
        {municipalityName ? (
          <p className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">{municipalityName}</p>
        ) : null}
        {tenantId && !municipalityName ? (
          <p className="text-[length:var(--text-xs)] text-[var(--color-text-subtle)]">
            Município identificado
          </p>
        ) : null}
      </div>
      <LoginForm
        tenantId={tenantId}
        errorMessage={
          error === 'credentials'
            ? 'E-mail ou senha inválidos.'
            : error === 'session'
              ? 'Sessão expirada ou cookie não gravado. Tente entrar novamente; em localhost use AUTH_COOKIE_SECURE=false no .env.'
              : null
        }
      />
    </main>
  )
}
