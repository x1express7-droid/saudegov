'use client'

import {
  exportarAgendamentosTfdCsv,
  exportarExtratoSaldoTfdCsv,
  exportarPrestacoesTfdCsv,
  exportarSaldosTfdCsv,
  exportarSolicitacoesTfdCsv,
} from '@saude/mod-saude-tfd/actions/exportacao'
import {
  buscarPacienteRelatorioTfdAction,
  gerarRelatorioCompetenciaTfd,
  gerarRelatorioMotoristaTfd,
  gerarRelatorioPacienteTfd,
  gerarRelatorioPrestadorTfd,
  gerarRelatorioProducaoMensalTfd,
} from '@saude/mod-saude-tfd/actions/relatorio'
import {
  TFD_PERMISSIONS,
  type RelatorioSelectOption,
  type SaldoListItem,
} from '@saude/mod-saude-tfd/client'
import type { SaudeMunicSession } from '@saude/core-auth/types/session'
import type { ActionResponse } from '@saude/validators'
import { Button, Input, Select } from '@saude/ui'
import { PermissionGate } from '@saude/ui/permission-gate'
import {
  Bus,
  Calendar,
  DollarSign,
  FileText,
  Folder,
  Receipt,
  Users,
} from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'

import { RelatorioExportCsvButton, RelatorioExportPdfButton } from './relatorio-export-buttons'
import {
  defaultMonthInputValue,
  defaultPeriodoMesAtual,
  formatExportErrorMessage,
  parseMesAnoFromMonthInput,
  PRESTACAO_STATUS_OPTIONS,
  RELATORIO_FILTRO_TODOS,
  SALDO_STATUS_EXPORT_OPTIONS,
  STATUS_SOLICITACAO_OPTIONS,
  URGENCIA_OPTIONS,
} from './relatorio-helpers'
import { RelatorioItemRow } from './relatorio-item-row'
import { RelatorioSectionCard } from './relatorio-section-card'

// BLOCO-12-RELATORIOS
interface PacienteOpcao {
  id: string
  nome: string
}

export interface TfdRelatoriosViewProps {
  session: SaudeMunicSession
  prestadoresOpcoes: RelatorioSelectOption[]
  motoristasOpcoes: RelatorioSelectOption[]
  saldosAtivos: SaldoListItem[]
  podeGerenciarSaldo: boolean
}

function compactDateInputClassName(): string {
  return 'min-h-[36px] w-[9.5rem] px-[var(--space-2)] py-[var(--space-1)] text-[length:var(--text-xs)]'
}

function compactSelectClassName(): string {
  return 'min-w-[9rem] [&_button]:min-h-[36px] [&_button]:text-[length:var(--text-xs)]'
}

async function runExport<T extends { downloadUrl: string }>(
  action: () => Promise<ActionResponse<T>>,
  onError: (message: string) => void,
  openDownload: (url: string) => void
): Promise<void> {
  const result = await action()
  if (!result.success) {
    onError(formatExportErrorMessage(result.error))
    return
  }
  openDownload(result.data.downloadUrl)
}

export function TfdRelatoriosView({
  session,
  prestadoresOpcoes,
  motoristasOpcoes,
  saldosAtivos,
  podeGerenciarSaldo,
}: TfdRelatoriosViewProps) {
  const periodoInicial = useMemo(() => defaultPeriodoMesAtual(), [])
  const mesAtualInput = useMemo(() => defaultMonthInputValue(), [])

  const [loadingKey, setLoadingKey] = useState<string | null>(null)
  const [erros, setErros] = useState<Record<string, string | null>>({})

  const [statusSolicitacao, setStatusSolicitacao] = useState(RELATORIO_FILTRO_TODOS)
  const [urgenciaSolicitacao, setUrgenciaSolicitacao] = useState(RELATORIO_FILTRO_TODOS)

  const [mesProducao, setMesProducao] = useState(mesAtualInput)
  const [mesCompetencia, setMesCompetencia] = useState(mesAtualInput)

  const [termoPaciente, setTermoPaciente] = useState('')
  const [buscandoPaciente, setBuscandoPaciente] = useState(false)
  const [pacientes, setPacientes] = useState<PacienteOpcao[]>([])
  const [pacienteSelecionado, setPacienteSelecionado] = useState<PacienteOpcao | null>(null)

  const [dataInicioAgendamento, setDataInicioAgendamento] = useState(periodoInicial.dataInicio)
  const [dataFimAgendamento, setDataFimAgendamento] = useState(periodoInicial.dataFim)

  const [dataInicioMotorista, setDataInicioMotorista] = useState(periodoInicial.dataInicio)
  const [dataFimMotorista, setDataFimMotorista] = useState(periodoInicial.dataFim)
  const [motoristaId, setMotoristaId] = useState(RELATORIO_FILTRO_TODOS)

  const [dataInicioPrestador, setDataInicioPrestador] = useState(periodoInicial.dataInicio)
  const [dataFimPrestador, setDataFimPrestador] = useState(periodoInicial.dataFim)
  const [prestadorId, setPrestadorId] = useState(RELATORIO_FILTRO_TODOS)

  const [statusSaldoExport, setStatusSaldoExport] = useState('ativo')
  const [saldoExtratoId, setSaldoExtratoId] = useState(saldosAtivos[0]?.id ?? '')
  const [dataInicioExtrato, setDataInicioExtrato] = useState('')
  const [dataFimExtrato, setDataFimExtrato] = useState('')

  const [statusPrestacao, setStatusPrestacao] = useState(RELATORIO_FILTRO_TODOS)

  const prestadorSelectOptions = useMemo(
    () => [
      { value: RELATORIO_FILTRO_TODOS, label: 'Prestador: todos' },
      ...prestadoresOpcoes.map((item) => ({ value: item.id, label: item.nome })),
    ],
    [prestadoresOpcoes]
  )

  const motoristaSelectOptions = useMemo(
    () => [
      { value: RELATORIO_FILTRO_TODOS, label: 'Motorista: todos' },
      ...motoristasOpcoes.map((item) => ({ value: item.id, label: item.nome })),
    ],
    [motoristasOpcoes]
  )

  const saldoSelectOptions = useMemo(
    () => saldosAtivos.map((saldo) => ({ value: saldo.id, label: saldo.descricao })),
    [saldosAtivos]
  )

  const abrirDownload = useCallback((url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer')
  }, [])

  const setErro = useCallback((key: string, message: string | null) => {
    setErros((current) => ({ ...current, [key]: message }))
  }, [])

  const runWithLoading = useCallback(
    async (key: string, task: () => Promise<void>) => {
      setErro(key, null)
      setLoadingKey(key)
      try {
        await task()
      } finally {
        setLoadingKey(null)
      }
    },
    [setErro]
  )

  async function handleBuscarPaciente() {
    setErro('paciente', null)
    setPacienteSelecionado(null)
    setBuscandoPaciente(true)

    try {
      const result = await buscarPacienteRelatorioTfdAction({ termo: termoPaciente })
      if (!result.success) {
        setErro('paciente', formatExportErrorMessage(result.error))
        setPacientes([])
        return
      }

      setPacientes(result.data)
      if (result.data.length === 0) {
        setErro('paciente', 'Nenhum paciente encontrado para o termo informado.')
      }
    } finally {
      setBuscandoPaciente(false)
    }
  }

  return (
    <div className="flex flex-col gap-[var(--space-6)]">
      <RelatorioSectionCard titulo="Solicitações" icon={FileText}>
        <RelatorioItemRow
          showDivider={false}
          titulo="Lista de solicitações (CSV)"
          descricao="Todas as solicitações com status, urgência, especialidade e datas."
          filtros={
            <>
              <Select
                id="relatorio-solicitacao-status"
                options={[...STATUS_SOLICITACAO_OPTIONS]}
                value={statusSolicitacao}
                onValueChange={setStatusSolicitacao}
                disabled={loadingKey === 'solicitacoes-csv'}
                className={compactSelectClassName()}
              />
              <Select
                id="relatorio-solicitacao-urgencia"
                options={[...URGENCIA_OPTIONS]}
                value={urgenciaSolicitacao}
                onValueChange={setUrgenciaSolicitacao}
                disabled={loadingKey === 'solicitacoes-csv'}
                className={compactSelectClassName()}
              />
            </>
          }
          acao={
            <RelatorioExportCsvButton
              loading={loadingKey === 'solicitacoes-csv'}
              onClick={() =>
                void runWithLoading('solicitacoes-csv', () =>
                  runExport(
                    () =>
                      exportarSolicitacoesTfdCsv({
                        ...(statusSolicitacao !== RELATORIO_FILTRO_TODOS
                          ? { status: statusSolicitacao }
                          : {}),
                        ...(urgenciaSolicitacao !== RELATORIO_FILTRO_TODOS
                          ? { urgencia: urgenciaSolicitacao }
                          : {}),
                      }),
                    (message) => setErro('solicitacoes-csv', message),
                    abrirDownload
                  )
                )
              }
            />
          }
          erro={erros['solicitacoes-csv']}
        />
      </RelatorioSectionCard>

      <RelatorioSectionCard titulo="Processos" icon={Folder}>
        <RelatorioItemRow
          showDivider={false}
          titulo="Produção mensal (PDF)"
          descricao="Contagem e valores por status no período: aprovados, negados, concluídos, cancelados."
          filtros={
            <Input
              id="relatorio-producao-mes"
              type="month"
              value={mesProducao}
              onChange={(event) => setMesProducao(event.target.value)}
              disabled={loadingKey === 'producao-pdf'}
              className={compactDateInputClassName()}
              aria-label="Mês de referência"
            />
          }
          acao={
            <RelatorioExportPdfButton
              loading={loadingKey === 'producao-pdf'}
              disabled={!parseMesAnoFromMonthInput(mesProducao)}
              onClick={() => {
                const parsed = parseMesAnoFromMonthInput(mesProducao)
                if (!parsed) {
                  setErro('producao-pdf', 'Competência inválida.')
                  return
                }
                void runWithLoading('producao-pdf', () =>
                  runExport(
                    () => gerarRelatorioProducaoMensalTfd(parsed),
                    (message) => setErro('producao-pdf', message),
                    abrirDownload
                  )
                )
              }}
            />
          }
          erro={erros['producao-pdf']}
        />

        <RelatorioItemRow
          titulo="Relatório por competência (PDF)"
          descricao="Totais por status, valores reservado e consumido, protocolos do período."
          filtros={
            <Input
              id="relatorio-competencia-mes"
              type="month"
              value={mesCompetencia}
              onChange={(event) => setMesCompetencia(event.target.value)}
              disabled={loadingKey === 'competencia-pdf'}
              className={compactDateInputClassName()}
              aria-label="Competência (mês/ano)"
            />
          }
          acao={
            <RelatorioExportPdfButton
              loading={loadingKey === 'competencia-pdf'}
              disabled={!parseMesAnoFromMonthInput(mesCompetencia)}
              onClick={() => {
                const parsed = parseMesAnoFromMonthInput(mesCompetencia)
                if (!parsed) {
                  setErro('competencia-pdf', 'Competência inválida.')
                  return
                }
                void runWithLoading('competencia-pdf', () =>
                  runExport(
                    () => gerarRelatorioCompetenciaTfd(parsed),
                    (message) => setErro('competencia-pdf', message),
                    abrirDownload
                  )
                )
              }}
            />
          }
          erro={erros['competencia-pdf']}
        />
      </RelatorioSectionCard>

      <RelatorioSectionCard titulo="Pacientes" icon={Users}>
        <RelatorioItemRow
          showDivider={false}
          titulo="Relatório por paciente (PDF)"
          descricao="Histórico de solicitações do paciente, sem dados clínicos sensíveis."
          filtros={
            <div className="flex min-w-0 flex-1 flex-col gap-[var(--space-2)]">
              <div className="flex flex-wrap items-center gap-[var(--space-2)]">
                <Input
                  id="relatorio-paciente-termo"
                  value={termoPaciente}
                  onChange={(event) => setTermoPaciente(event.target.value)}
                  placeholder="Nome do paciente"
                  disabled={buscandoPaciente || loadingKey === 'paciente-pdf'}
                  className="min-h-[36px] min-w-[10rem] flex-1 text-[length:var(--text-xs)]"
                />
                <Button
                  type="button"
                  variant="secondary"
                  disabled={buscandoPaciente || termoPaciente.trim().length < 2}
                  aria-busy={buscandoPaciente}
                  className="min-h-[36px] px-[var(--space-3)] text-[length:var(--text-xs)]"
                  onClick={() => void handleBuscarPaciente()}
                >
                  {buscandoPaciente ? 'Buscando...' : 'Buscar'}
                </Button>
              </div>
              {pacientes.length > 0 ? (
                <Select
                  id="relatorio-paciente-selecionado"
                  options={pacientes.map((paciente) => ({
                    value: paciente.id,
                    label: paciente.nome,
                  }))}
                  value={pacienteSelecionado?.id ?? ''}
                  placeholder="Selecione o paciente"
                  onValueChange={(value) => {
                    const paciente = pacientes.find((item) => item.id === value) ?? null
                    setPacienteSelecionado(paciente)
                  }}
                  disabled={loadingKey === 'paciente-pdf'}
                  className={compactSelectClassName()}
                />
              ) : null}
            </div>
          }
          acao={
            <RelatorioExportPdfButton
              loading={loadingKey === 'paciente-pdf'}
              disabled={!pacienteSelecionado}
              onClick={() => {
                if (!pacienteSelecionado) {
                  setErro('paciente-pdf', 'Selecione um paciente na lista de resultados.')
                  return
                }
                void runWithLoading('paciente-pdf', () =>
                  runExport(
                    () => gerarRelatorioPacienteTfd({ pacienteId: pacienteSelecionado.id }),
                    (message) => setErro('paciente-pdf', message),
                    abrirDownload
                  )
                )
              }}
            />
          }
          erro={erros['paciente-pdf'] ?? erros.paciente}
        />
      </RelatorioSectionCard>

      <RelatorioSectionCard titulo="Agendamentos" icon={Calendar}>
        <RelatorioItemRow
          showDivider={false}
          titulo="Lista de agendamentos (CSV)"
          descricao="Agendamentos com data, paciente, prestador, motorista, veículo e status."
          filtros={
            <>
              <Input
                id="relatorio-agendamento-inicio"
                type="date"
                value={dataInicioAgendamento}
                onChange={(event) => setDataInicioAgendamento(event.target.value)}
                disabled={loadingKey === 'agendamentos-csv'}
                className={compactDateInputClassName()}
                aria-label="Data início"
              />
              <Input
                id="relatorio-agendamento-fim"
                type="date"
                value={dataFimAgendamento}
                onChange={(event) => setDataFimAgendamento(event.target.value)}
                disabled={loadingKey === 'agendamentos-csv'}
                className={compactDateInputClassName()}
                aria-label="Data fim"
              />
            </>
          }
          acao={
            <RelatorioExportCsvButton
              loading={loadingKey === 'agendamentos-csv'}
              onClick={() =>
                void runWithLoading('agendamentos-csv', () =>
                  runExport(
                    () =>
                      exportarAgendamentosTfdCsv({
                        ...(dataInicioAgendamento ? { dataInicio: dataInicioAgendamento } : {}),
                        ...(dataFimAgendamento ? { dataFim: dataFimAgendamento } : {}),
                      }),
                    (message) => setErro('agendamentos-csv', message),
                    abrirDownload
                  )
                )
              }
            />
          }
          erro={erros['agendamentos-csv']}
        />
      </RelatorioSectionCard>

      <RelatorioSectionCard titulo="Viagens" icon={Bus}>
        <RelatorioItemRow
          showDivider={false}
          titulo="Relatório por motorista (PDF)"
          descricao="Viagens e custos por motorista no período."
          filtros={
            <>
              <Select
                id="relatorio-motorista-id"
                options={motoristaSelectOptions}
                value={motoristaId}
                onValueChange={setMotoristaId}
                disabled={loadingKey === 'motorista-pdf'}
                className={compactSelectClassName()}
              />
              <Input
                id="relatorio-motorista-inicio"
                type="date"
                value={dataInicioMotorista}
                onChange={(event) => setDataInicioMotorista(event.target.value)}
                disabled={loadingKey === 'motorista-pdf'}
                className={compactDateInputClassName()}
                aria-label="Data início"
              />
              <Input
                id="relatorio-motorista-fim"
                type="date"
                value={dataFimMotorista}
                onChange={(event) => setDataFimMotorista(event.target.value)}
                disabled={loadingKey === 'motorista-pdf'}
                className={compactDateInputClassName()}
                aria-label="Data fim"
              />
            </>
          }
          acao={
            <RelatorioExportPdfButton
              loading={loadingKey === 'motorista-pdf'}
              disabled={!dataInicioMotorista || !dataFimMotorista}
              onClick={() =>
                void runWithLoading('motorista-pdf', () =>
                  runExport(
                    () =>
                      gerarRelatorioMotoristaTfd({
                        dataInicio: dataInicioMotorista,
                        dataFim: dataFimMotorista,
                        ...(motoristaId !== RELATORIO_FILTRO_TODOS ? { motoristaId } : {}),
                      }),
                    (message) => setErro('motorista-pdf', message),
                    abrirDownload
                  )
                )
              }
            />
          }
          erro={erros['motorista-pdf']}
        />

        <RelatorioItemRow
          titulo="Relatório por prestador (PDF)"
          descricao="Volume e gastos no período por prestador de destino."
          filtros={
            <>
              <Select
                id="relatorio-prestador-id"
                options={prestadorSelectOptions}
                value={prestadorId}
                onValueChange={setPrestadorId}
                disabled={loadingKey === 'prestador-pdf'}
                className={compactSelectClassName()}
              />
              <Input
                id="relatorio-prestador-inicio"
                type="date"
                value={dataInicioPrestador}
                onChange={(event) => setDataInicioPrestador(event.target.value)}
                disabled={loadingKey === 'prestador-pdf'}
                className={compactDateInputClassName()}
                aria-label="Data início"
              />
              <Input
                id="relatorio-prestador-fim"
                type="date"
                value={dataFimPrestador}
                onChange={(event) => setDataFimPrestador(event.target.value)}
                disabled={loadingKey === 'prestador-pdf'}
                className={compactDateInputClassName()}
                aria-label="Data fim"
              />
            </>
          }
          acao={
            <RelatorioExportPdfButton
              loading={loadingKey === 'prestador-pdf'}
              disabled={!dataInicioPrestador || !dataFimPrestador}
              onClick={() =>
                void runWithLoading('prestador-pdf', () =>
                  runExport(
                    () =>
                      gerarRelatorioPrestadorTfd({
                        dataInicio: dataInicioPrestador,
                        dataFim: dataFimPrestador,
                        ...(prestadorId !== RELATORIO_FILTRO_TODOS ? { prestadorId } : {}),
                      }),
                    (message) => setErro('prestador-pdf', message),
                    abrirDownload
                  )
                )
              }
            />
          }
          erro={erros['prestador-pdf']}
        />
      </RelatorioSectionCard>

      <RelatorioSectionCard titulo="Saldos" icon={DollarSign}>
        <RelatorioItemRow
          showDivider={false}
          titulo="Lista de saldos (CSV)"
          descricao="Saldos financeiros com disponível, reservado, utilizado e competência."
          filtros={
            <Select
              id="relatorio-saldos-status"
              options={[...SALDO_STATUS_EXPORT_OPTIONS]}
              value={statusSaldoExport}
              onValueChange={setStatusSaldoExport}
              disabled={loadingKey === 'saldos-csv'}
              className={compactSelectClassName()}
            />
          }
          acao={
            <RelatorioExportCsvButton
              loading={loadingKey === 'saldos-csv'}
              onClick={() =>
                void runWithLoading('saldos-csv', () =>
                  runExport(
                    () =>
                      exportarSaldosTfdCsv({
                        incluirInativos: statusSaldoExport !== 'ativo',
                      }),
                    (message) => setErro('saldos-csv', message),
                    abrirDownload
                  )
                )
              }
            />
          }
          erro={erros['saldos-csv']}
        />

        <RelatorioItemRow
          titulo="Extrato de saldo (CSV)"
          descricao="Movimentações detalhadas de um saldo específico."
          filtros={
            podeGerenciarSaldo ? (
              <>
                <Select
                  id="relatorio-extrato-saldo"
                  options={saldoSelectOptions}
                  value={saldoExtratoId}
                  onValueChange={setSaldoExtratoId}
                  disabled={loadingKey === 'extrato-csv' || saldoSelectOptions.length === 0}
                  placeholder="Saldo"
                  className={compactSelectClassName()}
                />
                <Input
                  id="relatorio-extrato-inicio"
                  type="date"
                  value={dataInicioExtrato}
                  onChange={(event) => setDataInicioExtrato(event.target.value)}
                  disabled={loadingKey === 'extrato-csv'}
                  className={compactDateInputClassName()}
                  aria-label="Data início"
                />
                <Input
                  id="relatorio-extrato-fim"
                  type="date"
                  value={dataFimExtrato}
                  onChange={(event) => setDataFimExtrato(event.target.value)}
                  disabled={loadingKey === 'extrato-csv'}
                  className={compactDateInputClassName()}
                  aria-label="Data fim"
                />
              </>
            ) : (
              <span className="text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
                Requer permissão de gerenciar saldo.
              </span>
            )
          }
          acao={
            <PermissionGate session={session} permission={TFD_PERMISSIONS.GERENCIAR_SALDO}>
              <RelatorioExportCsvButton
                loading={loadingKey === 'extrato-csv'}
                disabled={!saldoExtratoId}
                onClick={() =>
                  void runWithLoading('extrato-csv', () =>
                    runExport(
                      () =>
                        exportarExtratoSaldoTfdCsv({
                          saldoId: saldoExtratoId,
                          ...(dataInicioExtrato ? { dataInicio: dataInicioExtrato } : {}),
                          ...(dataFimExtrato ? { dataFim: dataFimExtrato } : {}),
                        }),
                      (message) => setErro('extrato-csv', message),
                      abrirDownload
                    )
                  )
                }
              />
            </PermissionGate>
          }
          erro={erros['extrato-csv']}
        />
      </RelatorioSectionCard>

      <RelatorioSectionCard titulo="Prestações de Contas" icon={Receipt}>
        <RelatorioItemRow
          showDivider={false}
          titulo="Lista de prestações (CSV)"
          descricao="Prestações com status, prazo, valor total e paciente."
          filtros={
            <Select
              id="relatorio-prestacao-status"
              options={[...PRESTACAO_STATUS_OPTIONS]}
              value={statusPrestacao}
              onValueChange={setStatusPrestacao}
              disabled={loadingKey === 'prestacoes-csv'}
              className={compactSelectClassName()}
            />
          }
          acao={
            <RelatorioExportCsvButton
              loading={loadingKey === 'prestacoes-csv'}
              onClick={() =>
                void runWithLoading('prestacoes-csv', () =>
                  runExport(
                    () =>
                      exportarPrestacoesTfdCsv({
                        ...(statusPrestacao !== RELATORIO_FILTRO_TODOS
                          ? { status: statusPrestacao }
                          : {}),
                      }),
                    (message) => setErro('prestacoes-csv', message),
                    abrirDownload
                  )
                )
              }
            />
          }
          erro={erros['prestacoes-csv']}
        />
      </RelatorioSectionCard>
    </div>
  )
}
