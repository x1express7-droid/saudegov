import { Alert, Button, Input } from '@saude/ui'

import { loginWithCredentials } from '../actions'

export function LoginForm({ showError = false }: { showError?: boolean }) {
  return (
    <form
      action={loginWithCredentials}
      className="flex w-full max-w-sm flex-col gap-[var(--space-4)]"
      noValidate
    >
      <input type="hidden" name="redirectTo" value="/dashboard" />

      {showError ? (
        <Alert variant="error" titulo="Não foi possível entrar">
          E-mail ou senha inválidos.
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
