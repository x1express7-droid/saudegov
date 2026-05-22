import { requireSuperAdmin } from '@saude/core-auth/server'
import { MunicipioForm } from './components/municipio-form'

export default async function NovoMunicipioPage() {
  await requireSuperAdmin()

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Novo município</h1>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          Cadastre um município, configure o domínio e crie o primeiro administrador.
        </p>
      </div>
      <MunicipioForm />
    </div>
  )
}
