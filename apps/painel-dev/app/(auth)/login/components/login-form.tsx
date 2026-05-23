import { loginWithCredentials } from '../actions'

export function LoginForm({ errorMessage = null }: { errorMessage?: string | null }) {
  return (
    <form
      action={loginWithCredentials}
      className="flex w-full max-w-sm flex-col gap-4"
    >
      <input type="hidden" name="redirectTo" value="/dashboard" />

      {errorMessage ? (
        <p role="alert" className="text-sm text-red-600">
          {errorMessage}
        </p>
      ) : null}

      <label className="flex flex-col gap-1 text-sm">
        E-mail
        <input
          type="email"
          name="email"
          autoComplete="email"
          required
          className="rounded border border-neutral-300 px-3 py-2 text-base"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Senha
        <input
          type="password"
          name="password"
          autoComplete="current-password"
          required
          className="rounded border border-neutral-300 px-3 py-2 text-base"
        />
      </label>

      <button
        type="submit"
        className="rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white"
      >
        Entrar
      </button>
    </form>
  )
}
