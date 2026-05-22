import { LoginForm } from './components/login-form'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <div className="flex w-full max-w-sm flex-col gap-2 text-center">
        <h1 className="text-2xl font-semibold">Painel Dev</h1>
        <p className="text-sm text-neutral-600">Acesso restrito — SUPERADMIN</p>
      </div>
      <LoginForm showError={error === 'credentials'} />
    </main>
  )
}
