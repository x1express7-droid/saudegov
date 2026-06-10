'use client'

import type { ProcessoTfdListItem } from '@saude/mod-saude-tfd/client'
import { EmptyState } from '@saude/ui'
import type { ReactNode } from 'react'
import { useCallback, useMemo, useState } from 'react'

import { ProcessoPacienteAccordion } from './processo-paciente-accordion'
import { agruparProcessosPorPaciente } from './processo-paciente-grupo'
import {
  PROCESSO_TABELA_CLASS,
  PROCESSO_TABELA_HEAD_ROW_CLASS,
  PROCESSO_TABELA_TH_CLASS,
} from './processo-tabela-colunas'

// BLOCO-8-PROCESSOS
export interface ProcessoTabelaAgrupadaViewProps {
  items: ProcessoTfdListItem[]
  podeNovaSolicitacao: boolean
  mostrarEncerrados: boolean
  emptyCta?: ReactNode
}

export function ProcessoTabelaAgrupadaView({
  items,
  podeNovaSolicitacao,
  mostrarEncerrados,
  emptyCta,
}: ProcessoTabelaAgrupadaViewProps) {
  const grupos = useMemo(() => agruparProcessosPorPaciente(items), [items])
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  const handleToggle = useCallback((grupoId: string) => {
    setExpandedIds((current) => {
      const next = new Set(current)
      if (next.has(grupoId)) {
        next.delete(grupoId)
      } else {
        next.add(grupoId)
      }
      return next
    })
  }, [])

  if (grupos.length === 0) {
    return (
      <EmptyState
        titulo="Nenhum processo encontrado"
        descricao="Ajuste os filtros ou abra um novo processo para iniciar o fluxo TFD."
        cta={emptyCta}
      />
    )
  }

  return (
    <div className="overflow-hidden rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]">
      <div className="overflow-x-auto">
        <table className={PROCESSO_TABELA_CLASS}>
          <colgroup>
            <col className="w-8" />
            <col />
            <col className="w-[7.5rem]" />
            <col className="w-[8.5rem]" />
            <col className="w-[7rem]" />
            <col className="w-[8.5rem]" />
            <col className="w-[7.5rem]" />
            <col className="w-[5.5rem]" />
            <col className="w-[7rem]" />
          </colgroup>
          <thead>
            <tr className={PROCESSO_TABELA_HEAD_ROW_CLASS}>
              <th className={PROCESSO_TABELA_TH_CLASS} scope="col" aria-hidden="true" />
              <th className={PROCESSO_TABELA_TH_CLASS} scope="col">
                Paciente
              </th>
              <th className={PROCESSO_TABELA_TH_CLASS} scope="col">
                CPF
              </th>
              <th className={PROCESSO_TABELA_TH_CLASS} scope="col">
                Telefone
              </th>
              <th className={PROCESSO_TABELA_TH_CLASS} scope="col">
                Processos
              </th>
              <th className={PROCESSO_TABELA_TH_CLASS} scope="col">
                Urgência
              </th>
              <th className={`${PROCESSO_TABELA_TH_CLASS} text-right`} scope="col">
                Custo estimado
              </th>
              <th className={`${PROCESSO_TABELA_TH_CLASS} text-right`} scope="col">
                Atualização
              </th>
              <th className={PROCESSO_TABELA_TH_CLASS} scope="col" aria-hidden="true" />
            </tr>
          </thead>
          <tbody>
            {grupos.map((grupo) => (
              <ProcessoPacienteAccordion
                key={grupo.grupoId}
                grupo={grupo}
                expanded={expandedIds.has(grupo.grupoId)}
                onToggle={() => handleToggle(grupo.grupoId)}
                podeNovaSolicitacao={podeNovaSolicitacao}
                mostrarEncerrados={mostrarEncerrados}
                variant="table-row"
                mostrarStatusProcesso={mostrarEncerrados}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
