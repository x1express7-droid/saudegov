'use client'

import { Button, Dialog, DialogContent, DialogFooter, StatusBadge, TFD_STATUS_CONFIG } from '@saude/ui'
import { Info } from 'lucide-react'
import { useState } from 'react'

// BLOCO-6-SOLICITACOES
const FLUXO_FASES = [
  {
    status: 'RASCUNHO' as const,
    significado: 'Solicitação criada, ainda não enviada.',
    acao: 'Revise os dados, anexe documentos e envie para regulação quando estiver pronta.',
  },
  {
    status: 'ENVIADO' as const,
    significado: 'Na fila, aguardando o gestor.',
    acao: 'Aguarde — o gestor vai iniciar a análise.',
  },
  {
    status: 'EM_ANALISE' as const,
    significado: 'O gestor está avaliando o pedido.',
    acao: 'Gestor: analise laudo e documentos, lance custos se necessário e decida (aprovar ou negar). Se faltar informação, solicite complemento.',
  },
  {
    status: 'PENDENTE' as const,
    significado: 'Faltam informações do solicitante.',
    acao: 'Solicitante: leia o pedido de complemento e envie a resposta. Depois a solicitação volta para análise.',
  },
  {
    status: 'APROVADO' as const,
    significado: 'A regulação autorizou o TFD.',
    acao: 'Gestor: confirme a projeção financeira (reserva de saldo) e agende a viagem.',
  },
  {
    status: 'NEGADO' as const,
    significado: 'A regulação não autorizou o pedido.',
    acao: 'Processo encerrado — consulte a fundamentação da decisão.',
  },
  {
    status: 'AGENDADO' as const,
    significado: 'Viagem marcada.',
    acao: 'Aguarde a data e acompanhe transporte e detalhes do agendamento.',
  },
  {
    status: 'EM_VIAGEM' as const,
    significado: 'Paciente em deslocamento ou atendimento.',
    acao: 'Ao retorno, registre a chegada da viagem.',
  },
  {
    status: 'AGUARDANDO_PC' as const,
    significado: 'Viagem concluída, falta prestação de contas.',
    acao: 'Lance as despesas reais e envie a prestação de contas no prazo.',
  },
  {
    status: 'PC_EM_ANALISE' as const,
    significado: 'Prestação enviada, gestor analisando.',
    acao: 'Gestor: aprove ou rejeite a prestação de contas.',
  },
  {
    status: 'CONCLUIDO' as const,
    significado: 'Fluxo finalizado com sucesso.',
    acao: 'Apenas consulta — nada pendente.',
  },
  {
    status: 'CANCELADO' as const,
    significado: 'Solicitação cancelada.',
    acao: 'Apenas consulta.',
  },
] as const

export function SolicitacaoFluxoAjudaDialog() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="h-9 min-h-9 gap-[var(--space-2)] px-[var(--space-3)]"
        aria-label="Como funciona o fluxo de solicitações"
        title="Como funciona o fluxo de solicitações"
        onClick={() => setOpen(true)}
      >
        <Info className="size-4 shrink-0" aria-hidden="true" />
        <span className="hidden sm:inline">Como funciona</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          titulo="Como funciona o fluxo de solicitações"
          descricao="Consulte as fases, status e o que fazer em cada etapa do TFD."
          className="w-[calc(100%-var(--space-8))] max-w-[calc(100%-var(--space-8))] md:w-[80vw] md:max-w-[80vw] max-h-[90vh] overflow-y-auto"
        >
          <p className="text-[length:var(--text-base)] leading-relaxed text-[var(--color-text-muted)]">
            Cada solicitação passa por criação, análise da regulação, viagem e prestação de contas.
            Abra a solicitação para ver as ações disponíveis no painel <strong>Ações</strong>.
          </p>

          <ol className="mt-[var(--space-4)] grid gap-[var(--space-3)] md:grid-cols-2">
            {FLUXO_FASES.map((fase) => (
              <li
                key={fase.status}
                className="rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-bg)] p-[var(--space-4)]"
              >
                <div className="mb-[var(--space-2)]">
                  <StatusBadge status={fase.status} size="sm" />
                </div>
                <p className="text-[length:var(--text-base)] font-medium text-[var(--color-text)]">
                  {fase.significado}
                </p>
                <p className="mt-[var(--space-2)] text-[length:var(--text-sm)] leading-relaxed text-[var(--color-text-muted)]">
                  {fase.acao}
                </p>
              </li>
            ))}
          </ol>

          <div className="mt-[var(--space-4)] rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-bg)] p-[var(--space-4)]">
            <p className="text-[length:var(--text-sm)] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
              Fluxo resumido
            </p>
            <p className="mt-[var(--space-2)] font-mono text-[length:var(--text-sm)] leading-relaxed text-[var(--color-text-muted)]">
              {TFD_STATUS_CONFIG.RASCUNHO.label} → {TFD_STATUS_CONFIG.ENVIADO.label} →{' '}
              {TFD_STATUS_CONFIG.EM_ANALISE.label} → {TFD_STATUS_CONFIG.APROVADO.label} →{' '}
              {TFD_STATUS_CONFIG.AGENDADO.label} → {TFD_STATUS_CONFIG.EM_VIAGEM.label} →{' '}
              {TFD_STATUS_CONFIG.AGUARDANDO_PC.label} → {TFD_STATUS_CONFIG.PC_EM_ANALISE.label} →{' '}
              {TFD_STATUS_CONFIG.CONCLUIDO.label}
            </p>
            <p className="mt-[var(--space-2)] text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
              {TFD_STATUS_CONFIG.EM_ANALISE.label} ⇄ {TFD_STATUS_CONFIG.PENDENTE.label} (complemento)
              · {TFD_STATUS_CONFIG.EM_ANALISE.label} → {TFD_STATUS_CONFIG.NEGADO.label} (se negada)
            </p>
          </div>

          <p className="mt-[var(--space-4)] text-[length:var(--text-base)] leading-relaxed text-[var(--color-text-muted)]">
            <strong className="text-[var(--color-text)]">Solicitante:</strong> cria, envia, responde
            complementos e acompanha o status.{' '}
            <strong className="text-[var(--color-text)]">Gestor:</strong> analisa, decide, reserva
            saldo, agenda viagem e analisa prestação de contas.
          </p>

          <DialogFooter>
            <Button type="button" variant="primary" onClick={() => setOpen(false)}>
              Entendi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
