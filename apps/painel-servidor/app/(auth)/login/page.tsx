import { headers } from 'next/headers'
import { getTenantByDomain } from '@saude/core-db'
import { LoginForm } from './components/login-form'

export default async function LoginPage() {
  const h = await headers()
  const tenantId = h.get('x-tenant-id')
  const host = h.get('host') ?? ''
  const domain = host.replace(/^www\./, '').split(':')[0] ?? ''
  const tenant = domain ? await getTenantByDomain(domain) : null

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <div className="flex w-full max-w-sm flex-col gap-2 text-center">
        <h1 className="text-2xl font-semibold">Entrar</h1>
        {tenant?.name && <p className="text-sm text-neutral-600">{tenant.name}</p>}
        {tenantId && !tenant?.name && (
          <p className="text-xs text-neutral-500">Município identificado</p>
        )}
      </div>
      <LoginForm />
    </main>
  )
}
