'use client'

import {
  buscarPacientesAtendimentoTfd,
  carregarPacienteAtendimentoTfd,
} from '@saude/mod-saude-tfd/actions/paciente-atendimento'
import { verificarProcessoAbertoPacienteTfd } from '@saude/mod-saude-tfd/actions/processo'
import type {
  ProcessoAbertoPacienteOutput,
  TfdPacienteAtendimentoDetalhe,
} from '@saude/mod-saude-tfd/client'
import { Alert, Button, Card, CardHeader, formFieldsStackClassName, Input, Select } from '@saude/ui'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useCallback, useEffect, useRef, useState, useTransition } from 'react'

import {
  PROCESSO_STATUS_CONFIG,
  type ProcessoStatusValue,
} from '../../components/processo-status-badge'

const MODO_BUSCA_OPTIONS = [
  { value: 'nome', label: 'Nome' },
  { value: 'cpf', label: 'CPF' },
  { value: 'cns', label: 'CNS (Cartão SUS)' },
]

const BUSCA_DEBOUNCE_MS = 350
const MIN_NOME_CHARS = 2

const SEXO_LABELS: Record<NonNullable<TfdPacienteAtendimentoDetalhe['sexo']>, string> = {
  MASCULINO: 'Masculino',
  FEMININO: 'Feminino',
  NAO_INFORMADO: 'Não informado',
}

type ResultadoBusca = { id: string; nome: string; cpf: string | null; cns: string | null }

function onlyDigits(value: string): string {
  return value.replace(/\D/g, '')
}

function formatCpf(value: string | null): string {
  if (!value || value.length !== 11) {
    return '—'
  }
  return value.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}

function formatDataNascimento(value: string | null): string {
  if (!value) {
    return '—'
  }
  try {
    return format(parseISO(value), 'dd/MM/yyyy', { locale: ptBR })
  } catch {
    return value
  }
}

function formatSexo(value: TfdPacienteAtendimentoDetalhe['sexo']): string {
  if (!value) {
    return '—'
  }
  return SEXO_LABELS[value]
}

function formatEndereco(paciente: TfdPacienteAtendimentoDetalhe): string {
  const partes = [
    paciente.logradouro,
    paciente.numero,
    paciente.complemento,
    paciente.bairro,
    paciente.municipio,
    paciente.uf,
  ].filter(Boolean)

  return partes.length > 0 ? partes.join(', ') : '—'
}

function termoProntoParaBusca(termo: string, modo: 'nome' | 'cpf' | 'cns'): boolean {
  const trimmed = termo.trim()
  if (!trimmed) {
    return false
  }
  if (modo === 'nome') {
    return trimmed.length >= MIN_NOME_CHARS
  }
  if (modo === 'cpf') {
    return onlyDigits(trimmed).length >= 11
  }
  return onlyDigits(trimmed).length >= 15
}

function hintTermoBusca(modo: 'nome' | 'cpf' | 'cns', termo: string, buscando: boolean): string {
  if (buscando) {
    return 'Buscando pacientes…'
  }
  if (modo === 'nome') {
    return 'Digite para ver sugestões automaticamente.'
  }
  if (modo === 'cpf') {
    const digitos = onlyDigits(termo).length
    return digitos < 11
      ? `Informe os 11 dígitos do CPF (${digitos}/11).`
      : 'Resultados aparecem automaticamente.'
  }
  const digitos = onlyDigits(termo).length
  return digitos < 15
    ? `Informe os 15 dígitos do CNS (${digitos}/15).`
    : 'Resultados aparecem automaticamente.'
}

export interface PacienteBuscaSolicitacaoSectionProps {
  initialPaciente?: TfdPacienteAtendimentoDetalhe | null
  processoIdAtual?: string
  processoAbertoInicial?: ProcessoAbertoPacienteOutput | null
  onPacienteSelecionado: (paciente: TfdPacienteAtendimentoDetalhe) => void
  onPacienteRemovido?: () => void
  disabled?: boolean
}

function labelStatusProcesso(status: string): string {
  return status in PROCESSO_STATUS_CONFIG
    ? PROCESSO_STATUS_CONFIG[status as ProcessoStatusValue].label
    : status
}

export function PacienteBuscaSolicitacaoSection({
  initialPaciente = null,
  processoIdAtual,
  processoAbertoInicial = null,
  onPacienteSelecionado,
  onPacienteRemovido,
  disabled = false,
}: PacienteBuscaSolicitacaoSectionProps) {
  const [paciente, setPaciente] = useState<TfdPacienteAtendimentoDetalhe | null>(initialPaciente)
  const [processoAberto, setProcessoAberto] = useState<ProcessoAbertoPacienteOutput | null>(
    processoAbertoInicial
  )
  const [modoBusca, setModoBusca] = useState<'nome' | 'cpf' | 'cns'>('nome')
  const [termoBusca, setTermoBusca] = useState('')
  const [resultados, setResultados] = useState<ResultadoBusca[]>([])
  const [erro, setErro] = useState<string | null>(null)
  const [buscando, setBuscando] = useState(false)
  const [listaAberta, setListaAberta] = useState(false)
  const [buscaSemResultado, setBuscaSemResultado] = useState(false)
  const [isPending, startTransition] = useTransition()
  const buscaRequestId = useRef(0)

  const carregarProcessoAberto = useCallback(async (pacienteId: string) => {
    const response = await verificarProcessoAbertoPacienteTfd({
      pacienteId,
      excludeProcessoId: processoIdAtual,
    })
    if (response.success) {
      setProcessoAberto(response.data)
    }
  }, [processoIdAtual])

  useEffect(() => {
    if (initialPaciente) {
      setPaciente(initialPaciente)
    }
  }, [initialPaciente])

  useEffect(() => {
    if (processoAbertoInicial != null) {
      setProcessoAberto(processoAbertoInicial)
    }
  }, [processoAbertoInicial])

  useEffect(() => {
    if (!paciente?.id) {
      setProcessoAberto(null)
      return
    }
    if (
      processoAbertoInicial != null &&
      initialPaciente?.id === paciente.id
    ) {
      return
    }
    void carregarProcessoAberto(paciente.id)
  }, [paciente?.id, carregarProcessoAberto, processoAbertoInicial, initialPaciente?.id])

  useEffect(() => {
    if (!listaAberta || paciente) {
      return
    }

    const termo = termoBusca.trim()
    if (!termoProntoParaBusca(termo, modoBusca)) {
      setResultados([])
      setErro(null)
      setBuscando(false)
      setBuscaSemResultado(false)
      return
    }

    setBuscando(true)
    setErro(null)
    setBuscaSemResultado(false)

    const requestId = ++buscaRequestId.current
    const timer = window.setTimeout(() => {
      void (async () => {
        const response = await buscarPacientesAtendimentoTfd({ termo, modo: modoBusca })
        if (requestId !== buscaRequestId.current) {
          return
        }

        setBuscando(false)

        if (!response.success) {
          setResultados([])
          setErro(response.error)
          setBuscaSemResultado(false)
          return
        }

        setResultados(response.data)
        if (response.data.length === 0) {
          setErro('Nenhum paciente encontrado na base do município.')
          setBuscaSemResultado(true)
        } else {
          setErro(null)
          setBuscaSemResultado(false)
        }
      })()
    }, BUSCA_DEBOUNCE_MS)

    return () => {
      window.clearTimeout(timer)
    }
  }, [listaAberta, modoBusca, paciente, termoBusca])

  function handleModoBuscaChange(value: 'nome' | 'cpf' | 'cns') {
    setModoBusca(value)
    setTermoBusca('')
    setResultados([])
    setErro(null)
    setBuscaSemResultado(false)
    setListaAberta(true)
    buscaRequestId.current += 1
  }

  function handleTermoChange(value: string) {
    const nextValue =
      modoBusca === 'cpf'
        ? onlyDigits(value).slice(0, 11)
        : modoBusca === 'cns'
          ? onlyDigits(value).slice(0, 15)
          : value

    setTermoBusca(nextValue)
    setListaAberta(true)
  }

  function handleSelecionar(pacienteId: string) {
    setErro(null)
    setListaAberta(false)
    startTransition(async () => {
      const response = await carregarPacienteAtendimentoTfd({ pacienteId })
      if (!response.success) {
        setErro(response.error)
        setListaAberta(true)
        return
      }
      setPaciente(response.data)
      setResultados([])
      setTermoBusca('')
      setBuscaSemResultado(false)
      await carregarProcessoAberto(response.data.id)
      onPacienteSelecionado(response.data)
    })
  }

  function handleTrocarPaciente() {
    setPaciente(null)
    setProcessoAberto(null)
    setResultados([])
    setTermoBusca('')
    setErro(null)
    setBuscaSemResultado(false)
    setListaAberta(false)
    buscaRequestId.current += 1
    onPacienteRemovido?.()
  }

  const exibirLista =
    listaAberta &&
    !paciente &&
    (buscando || resultados.length > 0 || buscaSemResultado || Boolean(erro))

  return (
    <div className="flex flex-col gap-[var(--space-4)]">
      {paciente && processoAberto && processoAberto.processos.length > 0 ? (
        <Alert
          variant="warning"
          titulo={
            processoAberto.totalAbertos > 1 ? 'Processos em andamento' : 'Processo em andamento'
          }
          role="status"
        >
          <div className="flex flex-col gap-[var(--space-3)]">
            <p>
              {processoAberto.totalAbertos > 1 ? (
                <>
                  Há <strong>{processoAberto.totalAbertos}</strong> processos em aberto/andamento
                  para <strong>{paciente.nome}</strong>.
                </>
              ) : (
                <>
                  Já existe um processo em aberto/andamento para{' '}
                  <strong>{paciente.nome}</strong>.
                </>
              )}
            </p>
            <ul className="flex flex-col gap-[var(--space-2)]">
              {processoAberto.processos.map((processo) => (
                <li
                  key={processo.processoId}
                  className="flex flex-col gap-[var(--space-2)] sm:flex-row sm:items-center sm:justify-between"
                >
                  <span>
                    Protocolo <strong>{processo.protocolo}</strong> — status{' '}
                    <strong>{labelStatusProcesso(processo.statusProcesso)}</strong>
                  </span>
                  <Button variant="outline" asChild className="w-fit shrink-0">
                    <Link href={`/saude/tfd/processos/${processo.processoId}`}>Ver processo</Link>
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        </Alert>
      ) : null}

    <Card header={<CardHeader>Identificação do paciente</CardHeader>} bodyClassName={formFieldsStackClassName()}>
      <p className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
        Busque um paciente já cadastrado na base do município para vincular ao processo TFD. As
        opções aparecem automaticamente conforme você digita. O cadastro e a edição de pacientes são
        feitos na área de Pacientes.
      </p>

      {paciente ? (
        <div className="flex flex-col gap-[var(--space-4)] rounded-[var(--radius)] border border-[var(--color-border)] p-[var(--space-4)]">
          <div className="flex flex-wrap items-start justify-between gap-[var(--space-3)]">
            <div>
              <p className="text-[length:var(--text-xs)] font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
                Paciente selecionado
              </p>
              <p className="mt-[var(--space-1)] text-[length:var(--text-lg)] font-semibold text-[var(--color-text)]">
                {paciente.nome}
              </p>
            </div>
            <Button
              type="button"
              variant="secondary"
              onClick={handleTrocarPaciente}
              disabled={disabled || isPending}
            >
              Trocar paciente
            </Button>
          </div>

          <dl className="grid gap-[var(--space-3)] sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <dt className="text-[length:var(--text-xs)] font-medium text-[var(--color-text-muted)]">
                CPF
              </dt>
              <dd className="text-[length:var(--text-sm)] text-[var(--color-text)]">
                {formatCpf(paciente.cpf)}
              </dd>
            </div>
            <div>
              <dt className="text-[length:var(--text-xs)] font-medium text-[var(--color-text-muted)]">
                CNS
              </dt>
              <dd className="font-mono text-[length:var(--text-sm)] text-[var(--color-text)]">
                {paciente.cns ?? '—'}
              </dd>
            </div>
            <div>
              <dt className="text-[length:var(--text-xs)] font-medium text-[var(--color-text-muted)]">
                Data de nascimento
              </dt>
              <dd className="text-[length:var(--text-sm)] text-[var(--color-text)]">
                {formatDataNascimento(paciente.dataNascimento)}
              </dd>
            </div>
            <div>
              <dt className="text-[length:var(--text-xs)] font-medium text-[var(--color-text-muted)]">
                Sexo
              </dt>
              <dd className="text-[length:var(--text-sm)] text-[var(--color-text)]">
                {formatSexo(paciente.sexo)}
              </dd>
            </div>
            <div>
              <dt className="text-[length:var(--text-xs)] font-medium text-[var(--color-text-muted)]">
                Nome da mãe
              </dt>
              <dd className="text-[length:var(--text-sm)] text-[var(--color-text)]">
                {paciente.nomeMae ?? '—'}
              </dd>
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <dt className="text-[length:var(--text-xs)] font-medium text-[var(--color-text-muted)]">
                Endereço
              </dt>
              <dd className="text-[length:var(--text-sm)] text-[var(--color-text)]">
                {formatEndereco(paciente)}
              </dd>
            </div>
          </dl>

          <p className="text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
            Para atualizar os dados cadastrais, acesse{' '}
            <Link
              href={`/saude/tfd/pacientes/novo?pacienteId=${paciente.id}`}
              className="font-medium text-[var(--color-primary)] hover:underline"
            >
              editar paciente
            </Link>
            .
          </p>

        </div>
      ) : (
        <>
          <div className="grid gap-5 md:grid-cols-[140px_1fr]">
            <Select
              id="modo-busca-paciente-solicitacao"
              label="Buscar por"
              options={MODO_BUSCA_OPTIONS}
              value={modoBusca}
              onValueChange={(value) => handleModoBuscaChange(value as 'nome' | 'cpf' | 'cns')}
              disabled={disabled || isPending || buscando}
            />
            <div className="relative">
              <Input
                id="termo-busca-paciente-solicitacao"
                label="Termo de busca"
                value={termoBusca}
                onChange={(event) => handleTermoChange(event.target.value)}
                onFocus={() => setListaAberta(true)}
                onBlur={() => {
                  window.setTimeout(() => setListaAberta(false), 150)
                }}
                disabled={disabled || isPending}
                placeholder={
                  modoBusca === 'nome'
                    ? 'Digite o nome do paciente'
                    : modoBusca === 'cpf'
                      ? '00000000000'
                      : '000000000000000'
                }
                inputMode={modoBusca === 'nome' ? 'text' : 'numeric'}
                autoComplete="off"
                hint={hintTermoBusca(modoBusca, termoBusca, buscando)}
                aria-autocomplete="list"
                aria-controls="paciente-busca-solicitacao-listbox"
                aria-expanded={exibirLista}
              />

              {exibirLista ? (
                <div
                  id="paciente-busca-solicitacao-listbox"
                  className="absolute z-20 mt-[var(--space-1)] w-full overflow-hidden rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-md)]"
                  role="listbox"
                  aria-label="Sugestões de pacientes"
                >
                  {buscando ? (
                    <div className="flex items-center gap-[var(--space-2)] px-[var(--space-3)] py-[var(--space-3)] text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
                      <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                      Buscando pacientes…
                    </div>
                  ) : resultados.length > 0 ? (
                    <ul className="max-h-48 overflow-y-auto py-[var(--space-1)]">
                      {resultados.map((item) => (
                        <li key={item.id}>
                          <button
                            type="button"
                            role="option"
                            aria-selected={false}
                            className="w-full px-[var(--space-3)] py-[var(--space-2)] text-left text-[length:var(--text-sm)] hover:bg-[var(--color-bg)]"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => handleSelecionar(item.id)}
                            disabled={disabled || isPending}
                          >
                            <span className="font-medium text-[var(--color-text)]">{item.nome}</span>
                            {item.cpf ? (
                              <span className="ml-[var(--space-2)] text-[var(--color-text-muted)]">
                                CPF: {formatCpf(item.cpf)}
                              </span>
                            ) : null}
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="px-[var(--space-3)] py-[var(--space-3)] text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
                      {erro ?? 'Nenhum paciente encontrado.'}
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </div>

          {buscaSemResultado || (erro && !exibirLista) ? (
            <div className="flex flex-col gap-[var(--space-3)]">
              {erro && !exibirLista ? (
                <p role="alert" className="text-[length:var(--text-sm)] text-[var(--color-error)]">
                  {erro}
                </p>
              ) : null}
              <p className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
                O paciente precisa estar cadastrado na base do município antes de abrir o processo.{' '}
                <Link
                  href="/saude/tfd/pacientes/novo"
                  className="font-medium text-[var(--color-primary)] hover:underline"
                >
                  Cadastrar paciente
                </Link>
              </p>
            </div>
          ) : null}
        </>
      )}
    </Card>
    </div>
  )
}
