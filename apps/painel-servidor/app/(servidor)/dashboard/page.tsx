import { getTenantContext } from '@saude/core-auth/get-tenant-context'
import { SAUDE_MODULES_NAV } from '@saude/ui'
import { Badge, Card, PageHeader } from '@saude/ui'
import Link from 'next/link'

export default async function DashboardPage() {
  const tenant = await getTenantContext()
  const saudeModules = tenant.modules?.saude ?? {}

  const activeModules = SAUDE_MODULES_NAV.filter((mod) => Boolean(saudeModules[mod.moduleKey]))
  const upcomingModules = SAUDE_MODULES_NAV.filter((mod) => !saudeModules[mod.moduleKey])

  return (
    <>
      <PageHeader
        titulo="Dashboard"
        subtitulo="Visão geral do Sistema de Saúde municipal"
      />

      <div className="flex flex-col gap-[var(--space-6)]">
        <section className="flex flex-col gap-[var(--space-3)]">
          <h2 className="text-[length:var(--text-lg)] font-semibold text-[var(--color-text)]">
            Módulos ativos
          </h2>
          {activeModules.length === 0 ? (
            <p className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
              Nenhum módulo de saúde está ativo para este município.
            </p>
          ) : (
            <div className="grid gap-[var(--space-3)] sm:grid-cols-2 lg:grid-cols-3">
              {activeModules.map((mod) => {
                const entryHref =
                  mod.children[0]?.href ?? mod.basePath
                return (
                  <Card key={mod.moduleKey}>
                    <div className="flex items-start justify-between gap-[var(--space-2)]">
                      <div>
                        <p className="font-semibold text-[var(--color-text)]">{mod.label}</p>
                        <p className="mt-[var(--space-1)] text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
                          Acesse o painel do módulo pelo menu lateral.
                        </p>
                      </div>
                      <Badge variant="green" size="sm">
                        Ativo
                      </Badge>
                    </div>
                    <Link
                      href={entryHref}
                      className="mt-[var(--space-3)] inline-block text-[length:var(--text-sm)] font-medium text-[var(--color-primary)] underline-offset-2 hover:underline"
                    >
                      Abrir módulo
                    </Link>
                  </Card>
                )
              })}
            </div>
          )}
        </section>

        {upcomingModules.length > 0 ? (
          <section className="flex flex-col gap-[var(--space-3)]">
            <h2 className="text-[length:var(--text-lg)] font-semibold text-[var(--color-text)]">
              Em breve na plataforma
            </h2>
            <ul className="flex flex-wrap gap-[var(--space-2)]">
              {upcomingModules.map((mod) => (
                <li key={mod.moduleKey}>
                  <Badge variant="gray" size="sm">
                    {mod.label}
                  </Badge>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </>
  )
}
