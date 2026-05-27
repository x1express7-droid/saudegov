import {
  assertModuleActive,
  getTenantContext,
  requireTenantRole,
} from '@saude/core-auth/server'
import {
  getHistoricoFilaSolicitacao,
  getPerfilPacienteTfd,
} from '@saude/mod-saude-tfd'
import type { TfdPacienteProcessoListItem } from '@saude/mod-saude-tfd'
import { Badge, PageHeader } from '@saude/ui'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import {
  PerfilPacienteView,
  type FilaHistoricoPerfilRow,
} from './components/perfil-paciente-view'

interface PerfilPacientePageProps {
  params: Promise<{ id: string }>
}

export const metadata: Metadata = {
  title: 'Perfil do paciente — TFD',
  description: 'Perfil do paciente no módulo TFD',
}

async function loadHistoricoFilaAgregado(
  processos: TfdPacienteProcessoListItem[]
): Promise<FilaHistoricoPerfilRow[]> {
  const protocoloPorSolicitacao = new Map(
    processos.map((item) => [item.solicitacaoId, item.protocolo])
  )
  const solicitacaoIds = [...protocoloPorSolicitacao.keys()]

  if (solicitacaoIds.length === 0) {
    return []
  }

  const historicos = await Promise.all(
    solicitacaoIds.map(async (solicitacaoId) => {
      const itens = await getHistoricoFilaSolicitacao(solicitacaoId)
      const protocolo = protocoloPorSolicitacao.get(solicitacaoId) ?? '—'
      return itens.map((item) => ({
        ...item,
        protocolo,
        solicitacaoId,
      }))
    })
  )

  return historicos
    .flat()
    .sort((a, b) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime())
}

export default async function PerfilPacientePage({ params }: PerfilPacientePageProps) {
  const tenant = await getTenantContext()
  if (!tenant.modules?.saude?.tfd) {
    notFound()
  }

  await assertModuleActive('saude', 'tfd')
  const session = await requireTenantRole('SERVIDOR')

  const { id } = await params
  const perfil = await getPerfilPacienteTfd(id)

  if (!perfil) {
    notFound()
  }

  const historicoFila = await loadHistoricoFilaAgregado(perfil.processos)

  const titulo = perfil.cadastro.nomeSocial
    ? `${perfil.cadastro.nome} (${perfil.cadastro.nomeSocial})`
    : perfil.cadastro.nome

  return (
    <div className="flex flex-col gap-[var(--space-6)]">
      <PageHeader
        titulo={titulo}
        subtitulo="Perfil do paciente no Tratamento Fora de Domicílio. Dados sensíveis são exibidos de forma mascarada (LGPD)."
        breadcrumbs={[
          { label: 'Pacientes', href: '/saude/tfd/pacientes' },
          { label: perfil.cadastro.nome },
        ]}
        acoes={
          <div className="flex flex-wrap items-center gap-[var(--space-2)]">
            <Badge variant={perfil.cadastro.ativo ? 'green' : 'gray'} size="sm">
              {perfil.cadastro.ativo ? 'Ativo' : 'Inativo'}
            </Badge>
            <Link
              href="/saude/tfd/pacientes"
              className="text-[length:var(--text-sm)] font-medium text-[var(--color-primary)] hover:underline"
            >
              Voltar à lista
            </Link>
          </div>
        }
      />

      <PerfilPacienteView
        session={session}
        cadastro={perfil.cadastro}
        processos={perfil.processos}
        processosTotal={perfil.processosTotal}
        agendamentos={perfil.agendamentos}
        agendamentosTotal={perfil.agendamentosTotal}
        historicoFila={historicoFila}
      />
    </div>
  )
}
