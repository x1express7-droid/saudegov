import Link from 'next/link'
import { RedefinirSenhaForm } from './components/redefinir-senha-form'

interface RedefinirSenhaPageProps {
  params: Promise<{ token: string }>
}

export default async function RedefinirSenhaPage({ params }: RedefinirSenhaPageProps) {
  const { token } = await params

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <div className="flex w-full max-w-sm flex-col gap-2 text-center">
        <h1 className="text-2xl font-semibold">Redefinir senha</h1>
        <p className="text-sm text-neutral-600">Escolha uma nova senha com no mínimo 8 caracteres.</p>
      </div>
      <RedefinirSenhaForm token={token} />
      <Link href="/login" className="text-sm text-neutral-600 underline">
        Voltar ao login
      </Link>
    </main>
  )
}
