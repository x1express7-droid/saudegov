'use client'

import {
  TFD_PERMISSIONS,
  type RelatorioSelectOption,
} from '@saude/mod-saude-tfd/client'
import {
  buscarPacienteRelatorioTfdAction,
  gerarRelatorioCompetenciaTfd,
  gerarRelatorioMotoristaTfd,
  gerarRelatorioPacienteTfd,
  gerarRelatorioPrestadorTfd,
  gerarRelatorioProducaoMensalTfd,
} from '@saude/mod-saude-tfd/actions/relatorio'
import type { SaudeMunicSession } from '@saude/core-auth/types/session'
import { Alert, Button, Card, Input, Select } from '@saude/ui'
import { PermissionGate } from '@saude/ui/permission-gate'
import { useCallback, useMemo, useState } from 'react'

const MESES = [
  { value: 1, label: 'Janeiro' },
  { value: 2, label: 'Fevereiro' },
  { value: 3, label: 'Março' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Maio' },
  { value: 6, label: 'Junho' },
  { value: 7, label: 'Julho' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Setembro' },
  { value: 10, label: 'Outubro' },
  { value: 11, label: 'Novembro' },
  { value: 12, label: 'Dezembro' },
]

interface PacienteOpcao {
  id: string
  nome: string
}

export interface TfdRelatoriosPanelProps {
  session: SaudeMunicSession
  prestadoresOpcoes: RelatorioSelectOption[]
  motoristasOpcoes: RelatorioSelectOption[]
}

function defaultPeriodoMesAtual(): { dataInicio: string; dataFim: string } {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return {
    dataInicio: `${year}-${month}-01`,
    dataFim: `${year}-${month}-${day}`,
  }
}

export function TfdRelatoriosPanel({
  session,
  prestadoresOpcoes,
  motoristasOpcoes,
}: TfdRelatoriosPanelProps) {
  const anoAtual = new Date().getFullYear()
  const mesAtual = new Date().getMonth() + 1
  const periodoInicial = useMemo(() => defaultPeriodoMesAtual(), [])

  const [mes, setMes] = useState(String(mesAtual))
  const [ano, setAno] = useState(String(anoAtual))
  const [loadingCompetencia, setLoadingCompetencia] = useState(false)
  const [erroCompetencia, setErroCompetencia] = useState<string | null>(null)

  const [mesProducao, setMesProducao] = useState(String(mesAtual))
  const [anoProducao, setAnoProducao] = useState(String(anoAtual))
  const [loadingProducao, setLoadingProducao] = useState(false)
  const [erroProducao, setErroProducao] = useState<string | null>(null)

  const [dataInicioPrestador, setDataInicioPrestador] = useState(periodoInicial.dataInicio)
  const [dataFimPrestador, setDataFimPrestador] = useState(periodoInicial.dataFim)
  const [prestadorId, setPrestadorId] = useState('')
  const [loadingPrestador, setLoadingPrestador] = useState(false)
  const [erroPrestador, setErroPrestador] = useState<string | null>(null)

  const [dataInicioMotorista, setDataInicioMotorista] = useState(periodoInicial.dataInicio)
  const [dataFimMotorista, setDataFimMotorista] = useState(periodoInicial.dataFim)
  const [motoristaId, setMotoristaId] = useState('')
  const [loadingMotorista, setLoadingMotorista] = useState(false)
  const [erroMotorista, setErroMotorista] = useState<string | null>(null)

  const [termoPaciente, setTermoPaciente] = useState('')
  const [buscandoPaciente, setBuscandoPaciente] = useState(false)
  const [pacientes, setPacientes] = useState<PacienteOpcao[]>([])
  const [pacienteSelecionado, setPacienteSelecionado] = useState<PacienteOpcao | null>(null)
  const [loadingPaciente, setLoadingPaciente] = useState(false)
  const [erroPaciente, setErroPaciente] = useState<string | null>(null)

  const prestadorSelectOptions = useMemo(
    () => [
      { value: '', label: 'Todos os prestadores' },
      ...prestadoresOpcoes.map((item) => ({ value: item.id, label: item.nome })),
    ],
    [prestadoresOpcoes]
  )

  const motoristaSelectOptions = useMemo(
    () => [
      { value: '', label: 'Todos os motoristas' },
      ...motoristasOpcoes.map((item) => ({ value: item.id, label: item.nome })),
    ],
    [motoristasOpcoes]
  )

  const abrirDownload = useCallback((url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer')
  }, [])

  async function handleGerarCompetencia(event: React.FormEvent) {
    event.preventDefault()
    setErroCompetencia(null)
    setLoadingCompetencia(true)

    try {
      const result = await gerarRelatorioCompetenciaTfd({
        mes: Number.parseInt(mes, 10),
        ano: Number.parseInt(ano, 10),
      })

      if (!result.success) {
        setErroCompetencia(result.error)
        return
      }

      abrirDownload(result.data.downloadUrl)
    } finally {
      setLoadingCompetencia(false)
    }
  }

  async function handleGerarProducao(event: React.FormEvent) {
    event.preventDefault()
    setErroProducao(null)
    setLoadingProducao(true)

    try {
      const result = await gerarRelatorioProducaoMensalTfd({
        mes: Number.parseInt(mesProducao, 10),
        ano: Number.parseInt(anoProducao, 10),
      })

      if (!result.success) {
        setErroProducao(result.error)
        return
      }

      abrirDownload(result.data.downloadUrl)
    } finally {
      setLoadingProducao(false)
    }
  }

  async function handleGerarPrestador(event: React.FormEvent) {
    event.preventDefault()
    setErroPrestador(null)
    setLoadingPrestador(true)

    try {
      const result = await gerarRelatorioPrestadorTfd({
        dataInicio: dataInicioPrestador,
        dataFim: dataFimPrestador,
        ...(prestadorId ? { prestadorId } : {}),
      })

      if (!result.success) {
        setErroPrestador(result.error)
        return
      }

      abrirDownload(result.data.downloadUrl)
    } finally {
      setLoadingPrestador(false)
    }
  }

  async function handleGerarMotorista(event: React.FormEvent) {
    event.preventDefault()
    setErroMotorista(null)
    setLoadingMotorista(true)

    try {
      const result = await gerarRelatorioMotoristaTfd({
        dataInicio: dataInicioMotorista,
        dataFim: dataFimMotorista,
        ...(motoristaId ? { motoristaId } : {}),
      })

      if (!result.success) {
        setErroMotorista(result.error)
        return
      }

      abrirDownload(result.data.downloadUrl)
    } finally {
      setLoadingMotorista(false)
    }
  }

  async function handleBuscarPaciente(event: React.FormEvent) {
    event.preventDefault()
    setErroPaciente(null)
    setPacienteSelecionado(null)
    setBuscandoPaciente(true)

    try {
      const result = await buscarPacienteRelatorioTfdAction({ termo: termoPaciente })

      if (!result.success) {
        setErroPaciente(result.error)
        setPacientes([])
        return
      }

      setPacientes(result.data)
      if (result.data.length === 0) {
        setErroPaciente('Nenhum paciente encontrado para o termo informado.')
      }
    } finally {
      setBuscandoPaciente(false)
    }
  }

  async function handleGerarPaciente(event: React.FormEvent) {
    event.preventDefault()
    if (!pacienteSelecionado) {
      setErroPaciente('Selecione um paciente na lista de resultados.')
      return
    }

    setErroPaciente(null)
    setLoadingPaciente(true)

    try {
      const result = await gerarRelatorioPacienteTfd({ pacienteId: pacienteSelecionado.id })

      if (!result.success) {
        setErroPaciente(result.error)
        return
      }

      abrirDownload(result.data.downloadUrl)
    } finally {
      setLoadingPaciente(false)
    }
  }

  return (
    <section className="flex flex-col gap-[var(--space-4)]">
      <h2 className="text-[length:var(--text-lg)] font-semibold text-[var(--color-text)]">
        Relatórios PDF
      </h2>
      <p className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
        Exportações sem dados clínicos. Limite de 3 relatórios por hora por município. Links válidos
        por 24 horas.
      </p>

      <div className="grid gap-[var(--space-4)] lg:grid-cols-2">
        <Card
          header={
            <h3 className="text-[length:var(--text-base)] font-semibold text-[var(--color-text)]">
              Por competência
            </h3>
          }
        >
          <form className="flex flex-col gap-[var(--space-4)]" onSubmit={handleGerarCompetencia}>
            <div className="grid gap-[var(--space-3)] sm:grid-cols-2">
              <Select
                id="relatorio-mes"
                label="Mês"
                value={mes}
                onValueChange={setMes}
                disabled={loadingCompetencia}
                options={MESES.map((item) => ({
                  value: String(item.value),
                  label: item.label,
                }))}
              />
              <div className="flex flex-col gap-[var(--space-1)]">
                <label
                  htmlFor="relatorio-ano"
                  className="text-[length:var(--text-sm)] font-medium text-[var(--color-text)]"
                >
                  Ano
                </label>
                <Input
                  id="relatorio-ano"
                  type="number"
                  min={2000}
                  max={2100}
                  value={ano}
                  onChange={(event) => setAno(event.target.value)}
                  disabled={loadingCompetencia}
                />
              </div>
            </div>
            {erroCompetencia ? (
              <Alert variant="error" role="alert">
                {erroCompetencia}
              </Alert>
            ) : null}
            <PermissionGate session={session} permission={TFD_PERMISSIONS.EXPORTAR_RELATORIO}>
              <Button
                type="submit"
                variant="primary"
                disabled={loadingCompetencia}
                aria-busy={loadingCompetencia}
              >
                {loadingCompetencia ? 'Gerando PDF…' : 'Gerar relatório'}
              </Button>
            </PermissionGate>
          </form>
        </Card>

        <Card
          header={
            <h3 className="text-[length:var(--text-base)] font-semibold text-[var(--color-text)]">
              Produção mensal
            </h3>
          }
        >
          <form className="flex flex-col gap-[var(--space-4)]" onSubmit={handleGerarProducao}>
            <div className="grid gap-[var(--space-3)] sm:grid-cols-2">
              <Select
                id="relatorio-producao-mes"
                label="Mês"
                value={mesProducao}
                onValueChange={setMesProducao}
                disabled={loadingProducao}
                options={MESES.map((item) => ({
                  value: String(item.value),
                  label: item.label,
                }))}
              />
              <div className="flex flex-col gap-[var(--space-1)]">
                <label
                  htmlFor="relatorio-producao-ano"
                  className="text-[length:var(--text-sm)] font-medium text-[var(--color-text)]"
                >
                  Ano
                </label>
                <Input
                  id="relatorio-producao-ano"
                  type="number"
                  min={2000}
                  max={2100}
                  value={anoProducao}
                  onChange={(event) => setAnoProducao(event.target.value)}
                  disabled={loadingProducao}
                />
              </div>
            </div>
            {erroProducao ? (
              <Alert variant="error" role="alert">
                {erroProducao}
              </Alert>
            ) : null}
            <PermissionGate session={session} permission={TFD_PERMISSIONS.EXPORTAR_RELATORIO}>
              <Button type="submit" variant="primary" disabled={loadingProducao} aria-busy={loadingProducao}>
                {loadingProducao ? 'Gerando PDF…' : 'Gerar relatório'}
              </Button>
            </PermissionGate>
          </form>
        </Card>

        <Card
          header={
            <h3 className="text-[length:var(--text-base)] font-semibold text-[var(--color-text)]">
              Por prestador
            </h3>
          }
        >
          <form className="flex flex-col gap-[var(--space-4)]" onSubmit={handleGerarPrestador}>
            <div className="grid gap-[var(--space-3)] sm:grid-cols-2">
              <div className="flex flex-col gap-[var(--space-1)]">
                <label
                  htmlFor="relatorio-prestador-inicio"
                  className="text-[length:var(--text-sm)] font-medium text-[var(--color-text)]"
                >
                  Data início
                </label>
                <Input
                  id="relatorio-prestador-inicio"
                  type="date"
                  value={dataInicioPrestador}
                  onChange={(event) => setDataInicioPrestador(event.target.value)}
                  disabled={loadingPrestador}
                  required
                />
              </div>
              <div className="flex flex-col gap-[var(--space-1)]">
                <label
                  htmlFor="relatorio-prestador-fim"
                  className="text-[length:var(--text-sm)] font-medium text-[var(--color-text)]"
                >
                  Data fim
                </label>
                <Input
                  id="relatorio-prestador-fim"
                  type="date"
                  value={dataFimPrestador}
                  onChange={(event) => setDataFimPrestador(event.target.value)}
                  disabled={loadingPrestador}
                  required
                />
              </div>
            </div>
            <Select
              id="relatorio-prestador-id"
              label="Prestador"
              value={prestadorId}
              onValueChange={setPrestadorId}
              disabled={loadingPrestador}
              options={prestadorSelectOptions}
            />
            {erroPrestador ? (
              <Alert variant="error" role="alert">
                {erroPrestador}
              </Alert>
            ) : null}
            <PermissionGate session={session} permission={TFD_PERMISSIONS.EXPORTAR_RELATORIO}>
              <Button type="submit" variant="primary" disabled={loadingPrestador} aria-busy={loadingPrestador}>
                {loadingPrestador ? 'Gerando PDF…' : 'Gerar relatório'}
              </Button>
            </PermissionGate>
          </form>
        </Card>

        <Card
          header={
            <h3 className="text-[length:var(--text-base)] font-semibold text-[var(--color-text)]">
              Por motorista
            </h3>
          }
        >
          <form className="flex flex-col gap-[var(--space-4)]" onSubmit={handleGerarMotorista}>
            <div className="grid gap-[var(--space-3)] sm:grid-cols-2">
              <div className="flex flex-col gap-[var(--space-1)]">
                <label
                  htmlFor="relatorio-motorista-inicio"
                  className="text-[length:var(--text-sm)] font-medium text-[var(--color-text)]"
                >
                  Data início
                </label>
                <Input
                  id="relatorio-motorista-inicio"
                  type="date"
                  value={dataInicioMotorista}
                  onChange={(event) => setDataInicioMotorista(event.target.value)}
                  disabled={loadingMotorista}
                  required
                />
              </div>
              <div className="flex flex-col gap-[var(--space-1)]">
                <label
                  htmlFor="relatorio-motorista-fim"
                  className="text-[length:var(--text-sm)] font-medium text-[var(--color-text)]"
                >
                  Data fim
                </label>
                <Input
                  id="relatorio-motorista-fim"
                  type="date"
                  value={dataFimMotorista}
                  onChange={(event) => setDataFimMotorista(event.target.value)}
                  disabled={loadingMotorista}
                  required
                />
              </div>
            </div>
            <Select
              id="relatorio-motorista-id"
              label="Motorista"
              value={motoristaId}
              onValueChange={setMotoristaId}
              disabled={loadingMotorista}
              options={motoristaSelectOptions}
            />
            {erroMotorista ? (
              <Alert variant="error" role="alert">
                {erroMotorista}
              </Alert>
            ) : null}
            <PermissionGate session={session} permission={TFD_PERMISSIONS.EXPORTAR_RELATORIO}>
              <Button type="submit" variant="primary" disabled={loadingMotorista} aria-busy={loadingMotorista}>
                {loadingMotorista ? 'Gerando PDF…' : 'Gerar relatório'}
              </Button>
            </PermissionGate>
          </form>
        </Card>

        <Card
          header={
            <h3 className="text-[length:var(--text-base)] font-semibold text-[var(--color-text)]">
              Por paciente
            </h3>
          }
        >
          <form className="flex flex-col gap-[var(--space-4)]" onSubmit={handleGerarPaciente}>
            <div className="flex flex-col gap-[var(--space-2)]">
              <label
                htmlFor="relatorio-termo-paciente"
                className="text-[length:var(--text-sm)] font-medium text-[var(--color-text)]"
              >
                Buscar por nome ou protocolo
              </label>
              <div className="flex flex-wrap gap-[var(--space-2)]">
                <Input
                  id="relatorio-termo-paciente"
                  value={termoPaciente}
                  onChange={(event) => setTermoPaciente(event.target.value)}
                  placeholder="Nome do paciente ou protocolo"
                  disabled={buscandoPaciente || loadingPaciente}
                  className="min-w-[12rem] flex-1"
                />
                <Button
                  type="button"
                  variant="secondary"
                  disabled={buscandoPaciente || termoPaciente.trim().length < 2}
                  aria-busy={buscandoPaciente}
                  onClick={(event) => {
                    void handleBuscarPaciente(event)
                  }}
                >
                  {buscandoPaciente ? 'Buscando…' : 'Buscar'}
                </Button>
              </div>
            </div>

            {pacientes.length > 0 ? (
              <ul className="max-h-40 overflow-y-auto rounded-[var(--radius-sm)] border border-[var(--color-border)] p-0">
                {pacientes.map((paciente) => (
                  <li key={paciente.id} className="list-none border-b border-[var(--color-border)] last:border-b-0">
                    <button
                      type="button"
                      className={`w-full px-[var(--space-3)] py-[var(--space-2)] text-left text-[length:var(--text-sm)] transition-colors hover:bg-[var(--color-bg)] ${
                        pacienteSelecionado?.id === paciente.id
                          ? 'bg-[var(--color-primary-light)] font-medium text-[var(--color-primary)]'
                          : 'text-[var(--color-text)]'
                      }`}
                      onClick={() => setPacienteSelecionado(paciente)}
                    >
                      {paciente.nome}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}

            {erroPaciente ? (
              <Alert variant="error" role="alert">
                {erroPaciente}
              </Alert>
            ) : null}

            <PermissionGate session={session} permission={TFD_PERMISSIONS.EXPORTAR_RELATORIO}>
              <Button
                type="submit"
                variant="primary"
                disabled={loadingPaciente || !pacienteSelecionado}
                aria-busy={loadingPaciente}
              >
                {loadingPaciente ? 'Gerando PDF…' : 'Gerar relatório'}
              </Button>
            </PermissionGate>
          </form>
        </Card>
      </div>
    </section>
  )
}
