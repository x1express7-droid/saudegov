'use client'

import { TfdSolicitacaoDetalhe } from '@saude/mod-saude-tfd/client'
import type { ReactNode } from 'react'

import { formatDateOnlyBr, formatDateTimeBr, TFD_URGENCIA_CONFIG } from '@saude/ui'
import Link from 'next/link'

import { SolicitacaoSecaoAccordion } from './solicitacao-secao-accordion'

const TIPO_ATENDIMENTO_LABEL: Record<string, string> = {
  CONSULTA: 'Consulta',
  RETORNO: 'Retorno',
  EXAME: 'Exame',
  CIRURGIA: 'Cirurgia',
}

function labelTipoAtendimento(tipo: string): string {
  return TIPO_ATENDIMENTO_LABEL[tipo] ?? tipo
}

function labelUrgencia(urgencia: string): string {
  const config = TFD_URGENCIA_CONFIG[urgencia as keyof typeof TFD_URGENCIA_CONFIG]
  return config?.label ?? urgencia
}

function DetalheCampo({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-[length:var(--text-xs)] font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
        {label}
      </dt>
      <dd className="mt-[var(--space-1)] text-[length:var(--text-sm)] text-[var(--color-text)]">
        {children}
      </dd>
    </div>
  )
}

export interface SolicitacaoDetalheProps {
  solicitacao: TfdSolicitacaoDetalhe
}

export function SolicitacaoDetalhe({ solicitacao }: SolicitacaoDetalheProps) {
  const temDadosClinicos = solicitacao.cidPrincipal !== undefined

  return (
    <SolicitacaoSecaoAccordion titulo="Dados da solicitação" className="min-w-0">
      <dl className="grid gap-[var(--space-4)] sm:grid-cols-2">
        <DetalheCampo label="Paciente">{solicitacao.paciente.nome}</DetalheCampo>
        <DetalheCampo label="Data de nascimento">
          {formatDateOnlyBr(solicitacao.paciente.dataNascimento)}
        </DetalheCampo>
        <DetalheCampo label="CNS">{solicitacao.paciente.cns ?? '—'}</DetalheCampo>
        <DetalheCampo label="Tipo de atendimento">
          {labelTipoAtendimento(solicitacao.tipoAtendimento)}
        </DetalheCampo>
        <DetalheCampo label="Procedimentos">
          {solicitacao.procedimentos.length > 0 ? (
            <ul className="list-inside list-disc">
              {solicitacao.procedimentos.map((item) => (
                <li key={item.id}>{item.nome}</li>
              ))}
            </ul>
          ) : (
            '—'
          )}
        </DetalheCampo>
        <DetalheCampo label="Especialidade">
          {solicitacao.especialidade?.nome ?? '—'}
        </DetalheCampo>
        <DetalheCampo label="Prestador">
          {solicitacao.prestador
            ? `${solicitacao.prestador.nome} — ${solicitacao.prestador.cidade}/${solicitacao.prestador.estado}`
            : '—'}
        </DetalheCampo>
        <DetalheCampo label="Urgência">{labelUrgencia(solicitacao.urgencia)}</DetalheCampo>
        <DetalheCampo label="Solicitante">{solicitacao.solicitante.nome}</DetalheCampo>
        <DetalheCampo label="Data de abertura">
          {formatDateTimeBr(solicitacao.createdAt)}
        </DetalheCampo>
        {solicitacao.acompanhante ? (
          <DetalheCampo label="Acompanhante">{solicitacao.acompanhante.nome}</DetalheCampo>
        ) : null}
        {solicitacao.solicitacaoOrigemId ? (
          <DetalheCampo label="Solicitação de origem (retorno)">
            <Link
              href={`/saude/tfd/${solicitacao.solicitacaoOrigemId}`}
              className="font-medium text-[var(--color-primary)] hover:underline"
            >
              Ver solicitação anterior
            </Link>
          </DetalheCampo>
        ) : null}
      </dl>

      {temDadosClinicos ? (
        <section className="mt-[var(--space-6)] border-t border-[var(--color-border)] pt-[var(--space-4)]">
          <h3 className="text-[length:var(--text-base)] font-semibold text-[var(--color-text)]">
            Dados clínicos
          </h3>
          <dl className="mt-[var(--space-4)] grid gap-[var(--space-4)] sm:grid-cols-2">
            <DetalheCampo label="CID principal">{solicitacao.cidPrincipal ?? '—'}</DetalheCampo>
            <DetalheCampo label="Motivo/Diagnóstico/Justificativa">
              {solicitacao.diagnostico ? (
                <span className="whitespace-pre-wrap">{solicitacao.diagnostico}</span>
              ) : (
                '—'
              )}
            </DetalheCampo>
            {solicitacao.observacoesClinicas !== undefined ? (
              <DetalheCampo label="Observações clínicas">
                {solicitacao.observacoesClinicas ?? '—'}
              </DetalheCampo>
            ) : null}
          </dl>
        </section>
      ) : null}
    </SolicitacaoSecaoAccordion>
  )
}
