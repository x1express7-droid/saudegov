import { PageHeader } from '@saude/ui'

export default function DashboardPage() {
  return (
    <>
      <PageHeader titulo="Dashboard" subtitulo="Visão geral do sistema de saúde" />
      <p className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
        Bem-vindo ao painel do servidor. Os módulos ativos aparecem no menu lateral.
      </p>
    </>
  )
}
