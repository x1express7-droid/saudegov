import type { ProcessoTfdListItem } from '@saude/mod-saude-tfd/client'

// BLOCO-8-PROCESSOS
const PACIENTE_SEM_VINCULO = '__sem_paciente__'

const URGENCIA_RANK: Record<string, number> = {
  MUITO_URGENTE: 4,
  GRAVE: 3,
  INTERMEDIARIA: 2,
  BAIXA: 1,
  NAO_AGUDA: 0,
}

const PROCESSO_STATUS_ENCERRADOS = new Set(['CONCLUIDO', 'CANCELADO', 'ARQUIVADO'])

export interface ProcessoPacienteGrupo {
  grupoId: string
  pacienteId: string | null
  pacienteNome: string
  pacienteCpf: string | null
  pacienteTelefone: string | null
  processosAtivos: ProcessoTfdListItem[]
  processosEncerrados: ProcessoTfdListItem[]
  urgenciaMaisCritica: string | null
  ultimaMovimentacaoEm: string
}

export function isProcessoEncerrado(status: string): boolean {
  return PROCESSO_STATUS_ENCERRADOS.has(status)
}

function calcularUrgenciaMaisCritica(processos: ProcessoTfdListItem[]): string | null {
  let maior: string | null = null
  let maiorRank = -1

  for (const processo of processos) {
    const urgencia = processo.urgenciaMaisCritica
    if (!urgencia) {
      continue
    }
    const rank = URGENCIA_RANK[urgencia] ?? -1
    if (rank > maiorRank) {
      maiorRank = rank
      maior = urgencia
    }
  }

  return maior
}

function calcularUltimaMovimentacao(processos: ProcessoTfdListItem[]): string {
  return processos.reduce((maisRecente, atual) => {
    return atual.ultimaMovimentacaoEm > maisRecente ? atual.ultimaMovimentacaoEm : maisRecente
  }, processos[0]!.ultimaMovimentacaoEm)
}

function criarGrupoVazio(
  grupoId: string,
  pacienteId: string | null,
  pacienteNome: string,
  pacienteCpf: string | null,
  pacienteTelefone: string | null
): ProcessoPacienteGrupo {
  return {
    grupoId,
    pacienteId,
    pacienteNome,
    pacienteCpf,
    pacienteTelefone,
    processosAtivos: [],
    processosEncerrados: [],
    urgenciaMaisCritica: null,
    ultimaMovimentacaoEm: '',
  }
}

function finalizarGrupo(grupo: ProcessoPacienteGrupo): ProcessoPacienteGrupo {
  const todos = [...grupo.processosAtivos, ...grupo.processosEncerrados]
  if (todos.length === 0) {
    return grupo
  }

  return {
    ...grupo,
    urgenciaMaisCritica: calcularUrgenciaMaisCritica(todos),
    ultimaMovimentacaoEm: calcularUltimaMovimentacao(todos),
  }
}

export function agruparProcessosPorPaciente(items: ProcessoTfdListItem[]): ProcessoPacienteGrupo[] {
  const mapa = new Map<string, ProcessoPacienteGrupo>()

  for (const item of items) {
    const grupoId = item.paciente?.id ?? PACIENTE_SEM_VINCULO
    const pacienteNome = item.paciente?.nome ?? 'Sem paciente vinculado'

    if (!mapa.has(grupoId)) {
      mapa.set(
        grupoId,
        criarGrupoVazio(
          grupoId,
          item.paciente?.id ?? null,
          pacienteNome,
          item.paciente?.cpf ?? null,
          item.paciente?.telefone ?? null
        )
      )
    }

    const grupo = mapa.get(grupoId)!
    if (isProcessoEncerrado(item.statusProcesso)) {
      grupo.processosEncerrados.push(item)
    } else {
      grupo.processosAtivos.push(item)
    }
  }

  return Array.from(mapa.values())
    .map(finalizarGrupo)
    .filter((grupo) => grupo.processosAtivos.length > 0 || grupo.processosEncerrados.length > 0)
    .sort((a, b) => b.ultimaMovimentacaoEm.localeCompare(a.ultimaMovimentacaoEm))
}

export function labelProcessosAtivos(count: number): string {
  if (count === 1) {
    return '1 processo'
  }
  return `${count} processos`
}
