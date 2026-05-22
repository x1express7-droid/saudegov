'use client'

import {
  buscarPacienteRelatorioTfdAction,
  gerarRelatorioCompetenciaTfd,
  gerarRelatorioPacienteTfd,
} from '@saude/mod-saude-tfd/actions/relatorio'
import { Alert, Button, Card, Input, Select } from '@saude/ui'
import { useCallback, useState } from 'react'

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

export function TfdRelatoriosPanel() {
  const anoAtual = new Date().getFullYear()
  const mesAtual = new Date().getMonth() + 1

  const [mes, setMes] = useState(String(mesAtual))
  const [ano, setAno] = useState(String(anoAtual))
  const [loadingCompetencia, setLoadingCompetencia] = useState(false)
  const [erroCompetencia, setErroCompetencia] = useState<string | null>(null)

  const [termoPaciente, setTermoPaciente] = useState('')
  const [buscandoPaciente, setBuscandoPaciente] = useState(false)
  const [pacientes, setPacientes] = useState<PacienteOpcao[]>([])
  const [pacienteSelecionado, setPacienteSelecionado] = useState<PacienteOpcao | null>(null)
  const [loadingPaciente, setLoadingPaciente] = useState(false)
  const [erroPaciente, setErroPaciente] = useState<string | null>(null)

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
            <Button type="submit" variant="primary" disabled={loadingCompetencia} aria-busy={loadingCompetencia}>
              {loadingCompetencia ? 'Gerando PDF…' : 'Gerar relatório'}
            </Button>
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

            <Button
              type="submit"
              variant="primary"
              disabled={loadingPaciente || !pacienteSelecionado}
              aria-busy={loadingPaciente}
            >
              {loadingPaciente ? 'Gerando PDF…' : 'Gerar relatório'}
            </Button>
          </form>
        </Card>
      </div>
    </section>
  )
}
