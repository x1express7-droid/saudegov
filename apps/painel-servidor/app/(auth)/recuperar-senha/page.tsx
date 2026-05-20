import Link from 'next/link'
import { RecuperarSenhaForm } from './components/recuperar-senha-form'

export default function RecuperarSenhaPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <div className="flex w-full max-w-sm flex-col gap-2 text-center">
        <h1 className="text-2xl font-semibold">Recuperar senha</h1>
        <p className="text-sm text-neutral-600">
          Informe seu e-mail para receber o link de redefinição.
        </p>
      </div>
      <RecuperarSenhaForm />
      <Link href="/login" className="text-sm text-neutral-600 underline">
        Voltar ao login
      </Link>
    </main>
  )
}
