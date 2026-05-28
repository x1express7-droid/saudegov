import { PageHeader } from '@saude/ui'
import { getDadosMunicipio } from '../../../../lib/queries/get-dados-municipio'
import { CadsusConfigForm } from './components/cadsus-config-form'
import { DadosMunicipioForm } from './components/dados-municipio-form'
import { NotificacoesEmailForm } from './components/notificacoes-email-form'
import { SmtpConfigForm } from './components/smtp-config-form'

export default async function MunicipioConfigPage() {
  const dados = await getDadosMunicipio()

  return (
    <div className="flex flex-col gap-[var(--space-6)]">
      <PageHeader
        titulo="Município"
        subtitulo="Dados institucionais e integrações do tenant."
      />

      <DadosMunicipioForm
        name={dados.name}
        slug={dados.slug}
        initialValores={dados.valores}
      />

      <CadsusConfigForm initial={dados.cadsus} />

      <NotificacoesEmailForm initial={dados.notificacoesEmail} />

      <SmtpConfigForm initial={dados.smtp} />
    </div>
  )
}
