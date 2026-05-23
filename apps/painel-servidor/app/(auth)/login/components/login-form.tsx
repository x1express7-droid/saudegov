import { Alert, Button, Input } from '@saude/ui'

import { loginWithCredentials } from '../actions'

export function LoginForm({
  tenantId,
  errorMessage = null,
}: {
  tenantId?: string | null
  errorMessage?: string | null
}) {
  return (
    <form
      action={loginWithCredentials}
      className="flex w-full max-w-sm flex-col gap-[var(--space-4)]"
      noValidate
    >
      <input type="hidden" name="redirectTo" value="/dashboard" />
      {tenantId ? <input type="hidden" name="tenantId" value={tenantId} /> : null}

      {errorMessage ? (
        <Alert variant="error" titulo="Não foi possível entrar">
          {errorMessage}
        </Alert>
      ) : null}

      <Input
        id="login-email"
        label="E-mail"
        type="email"
        name="email"
        autoComplete="email"
        required
        placeholder="seu.email@municipio.gov.br"
      />

      <Input
        id="login-password"
        label="Senha"
        type="password"
        name="password"
        autoComplete="current-password"
        required
      />

      <Button type="submit" variant="primary" className="w-full">
        Entrar
      </Button>
    </form>
  )
}
