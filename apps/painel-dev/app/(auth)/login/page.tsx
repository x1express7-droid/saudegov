import { LoginForm } from './components/login-form'

function loginErrorMessage(error?: string): string | null {
  switch (error) {
    case 'credentials':
      return 'E-mail ou senha inválidos.'
    case 'ip':
      return 'Seu IP não está na lista SUPERADMIN_ALLOWED_IPS. Adicione seu IP no Coolify ou defina SUPERADMIN_ENFORCE_IP=false.'
    case 'session':
      return null
    default:
      return null
  }
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  const errorMessage = loginErrorMessage(error)

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <div className="flex w-full max-w-sm flex-col gap-2 text-center">
        <h1 className="text-2xl font-semibold">Painel Dev</h1>
        <p className="text-sm text-neutral-600">Acesso restrito — SUPERADMIN</p>
      </div>
      <LoginForm errorMessage={errorMessage} />
    </main>
  )
}
