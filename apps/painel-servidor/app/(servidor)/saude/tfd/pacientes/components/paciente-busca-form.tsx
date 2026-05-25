'use client'

import { buscarPacientePorCns, vincularPaciente } from '@saude/mod-saude-tfd/actions/paciente'
import { Alert, Badge, Button, Card, Input, PageHeader } from '@saude/ui'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { useState, useTransition } from 'react'

type Etapa = 'busca' | 'confirmacao' | 'sucesso'

type DadosCadsus = {
  nome: string
  dataNascimento: string | null
  municipioNascimento: string | null
  sexo: 'MASCULINO' | 'FEMININO' | 'NAO_INFORMADO' | null
  jaCadastrado: boolean
  pacienteId: string | null
  cpfMascarado: string | null
}

type VinculoSucesso = {
  pacienteId: string
  jaCadastrado: boolean
}

const SEXO_LABELS: Record<NonNullable<DadosCadsus['sexo']>, string> = {
  MASCULINO: 'Masculino',
  FEMININO: 'Feminino',
  NAO_INFORMADO: 'Não informado',
}

function onlyDigits(value: string): string {
  return value.replace(/\D/g, '')
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

function formatSexo(value: DadosCadsus['sexo']): string {
  if (!value) {
    return '—'
  }
  return SEXO_LABELS[value]
}

export interface PacienteBuscaFormProps {
  cadsusEnabled: boolean
  vinculadosSection?: ReactNode
}

export function PacienteBuscaForm({ cadsusEnabled, vinculadosSection }: PacienteBuscaFormProps) {
  const [etapa, setEtapa] = useState<Etapa>('busca')
  const [cns, setCns] = useState('')
  const [cpf, setCpf] = useState('')
  const [dadosCadsus, setDadosCadsus] = useState<DadosCadsus | null>(null)
  const [vinculoSucesso, setVinculoSucesso] = useState<VinculoSucesso | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function reiniciarFluxo() {
    setEtapa('busca')
    setCns('')
    setCpf('')
    setDadosCadsus(null)
    setVinculoSucesso(null)
    setErro(null)
  }

  function voltarParaBusca() {
    setEtapa('busca')
    setDadosCadsus(null)
    setVinculoSucesso(null)
    setErro(null)
  }

  function handleBuscar(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErro(null)

    const cnsDigits = onlyDigits(cns)
    if (cnsDigits.length !== 15) {
      setErro('Informe um CNS com 15 dígitos numéricos.')
      return
    }

    startTransition(async () => {
      const response = await buscarPacientePorCns({ cns: cnsDigits })
      if (!response.success) {
        setErro(response.error)
        return
      }

      setCns(cnsDigits)
      setDadosCadsus(response.data)
      setEtapa('confirmacao')
    })
  }

  function handleVincular(cpfInformado?: string) {
    setErro(null)

    const cnsDigits = onlyDigits(cns)
    const cpfDigits = cpfInformado !== undefined ? onlyDigits(cpfInformado) : undefined

    if (!dadosCadsus) {
      return
    }

    if (!dadosCadsus.jaCadastrado && (!cpfDigits || cpfDigits.length !== 11)) {
      setErro('Informe um CPF com 11 dígitos numéricos.')
      return
    }

    startTransition(async () => {
      const response = await vincularPaciente({
        cns: cnsDigits,
        ...(cpfDigits ? { cpf: cpfDigits } : {}),
      })

      if (!response.success) {
        setErro(response.error)
        return
      }

      setVinculoSucesso(response.data)
      setEtapa('sucesso')
    })
  }

  function handleSubmitVinculo(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    handleVincular(cpf)
  }

  const subtitulo = cadsusEnabled
    ? 'Cadastre pacientes na base do município ou importe dados pelo CADSUS quando disponível.'
    : 'Cadastre e gerencie pacientes na base local do município. A integração CADSUS não está ativa.'

  return (
    <div className="flex flex-col gap-[var(--space-6)]">
      <PageHeader
        titulo="Pacientes TFD"
        subtitulo={subtitulo}
        breadcrumbs={[
          { label: 'TFD', href: '/saude/tfd' },
          { label: 'Pacientes' },
        ]}
      />

      {erro ? (
        <p role="alert" className="text-[length:var(--text-sm)] text-[var(--color-error)]">
          {erro}
        </p>
      ) : null}

      {etapa === 'busca' ? (
        <Card
          header={
            <h2 className="text-[length:var(--text-lg)] font-semibold text-[var(--color-text)]">
              Cadastrar paciente
            </h2>
          }
        >
          <p className="mb-[var(--space-4)] text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
            Informe os dados do paciente diretamente na base do município. Nome é obrigatório; CPF,
            CNS e demais campos são opcionais.
          </p>
          <Button asChild variant="primary">
            <Link href="/saude/tfd/nova">Novo cadastro / atendimento TFD</Link>
          </Button>
        </Card>
      ) : null}

      {etapa === 'busca' && cadsusEnabled ? (
        <Card
          header={
            <h2 className="text-[length:var(--text-lg)] font-semibold text-[var(--color-text)]">
              Importar do CADSUS
            </h2>
          }
        >
          <p className="mb-[var(--space-4)] text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
            Com a integração ativa, use o CNS para localizar o paciente na base nacional e vinculá-lo
            ao município.
          </p>
          <form onSubmit={handleBuscar} className="flex flex-col gap-[var(--space-4)]" noValidate>
            <Input
              id="paciente-cns"
              label="CNS (Cartão Nacional de Saúde)"
              name="cns"
              inputMode="numeric"
              autoComplete="off"
              maxLength={15}
              value={cns}
              onChange={(event) => setCns(onlyDigits(event.target.value).slice(0, 15))}
              disabled={isPending}
              placeholder="000000000000000"
              hint="Informe os 15 dígitos do Cartão Nacional de Saúde."
            />
            <Button type="submit" variant="secondary" loading={isPending} disabled={isPending}>
              {isPending ? 'Buscando...' : 'Buscar no CADSUS'}
            </Button>
          </form>
        </Card>
      ) : null}

      {etapa === 'busca' && !cadsusEnabled ? (
        <Alert variant="info" titulo="CADSUS não configurado">
          A consulta à base nacional está desativada neste município. Os pacientes são cadastrados
          apenas na base local — use o botão acima ou a busca por nome na lista abaixo.
        </Alert>
      ) : null}

      {etapa === 'busca' && vinculadosSection ? vinculadosSection : null}

      {etapa === 'confirmacao' && dadosCadsus ? (
        <Card
          header={
            <div className="flex flex-wrap items-center gap-[var(--space-2)]">
              <span className="text-[length:var(--text-lg)] font-semibold text-[var(--color-text)]">
                Dados do CADSUS
              </span>
              {dadosCadsus.jaCadastrado ? (
                <Badge variant="blue" size="sm">
                  Paciente já cadastrado no sistema
                </Badge>
              ) : null}
            </div>
          }
        >
          <dl className="grid gap-[var(--space-3)] sm:grid-cols-2">
            <div>
              <dt className="text-[length:var(--text-xs)] font-medium text-[var(--color-text-muted)]">
                Nome
              </dt>
              <dd className="text-[length:var(--text-sm)] text-[var(--color-text)]">
                {dadosCadsus.nome}
              </dd>
            </div>
            <div>
              <dt className="text-[length:var(--text-xs)] font-medium text-[var(--color-text-muted)]">
                Data de nascimento
              </dt>
              <dd className="text-[length:var(--text-sm)] text-[var(--color-text)]">
                {formatDataNascimento(dadosCadsus.dataNascimento)}
              </dd>
            </div>
            <div>
              <dt className="text-[length:var(--text-xs)] font-medium text-[var(--color-text-muted)]">
                Município de nascimento
              </dt>
              <dd className="text-[length:var(--text-sm)] text-[var(--color-text)]">
                {dadosCadsus.municipioNascimento ?? '—'}
              </dd>
            </div>
            <div>
              <dt className="text-[length:var(--text-xs)] font-medium text-[var(--color-text-muted)]">
                Sexo
              </dt>
              <dd className="text-[length:var(--text-sm)] text-[var(--color-text)]">
                {formatSexo(dadosCadsus.sexo)}
              </dd>
            </div>
            {dadosCadsus.jaCadastrado && dadosCadsus.cpfMascarado ? (
              <div className="sm:col-span-2">
                <dt className="text-[length:var(--text-xs)] font-medium text-[var(--color-text-muted)]">
                  CPF
                </dt>
                <dd className="text-[length:var(--text-sm)] text-[var(--color-text)]">
                  {dadosCadsus.cpfMascarado}
                </dd>
              </div>
            ) : null}
          </dl>

          <div className="mt-[var(--space-6)] flex flex-col gap-[var(--space-4)]">
            {dadosCadsus.jaCadastrado ? (
              <Button
                type="button"
                variant="primary"
                loading={isPending}
                disabled={isPending}
                onClick={() => handleVincular()}
              >
                {isPending ? 'Vinculando...' : 'Usar este paciente'}
              </Button>
            ) : (
              <form
                onSubmit={handleSubmitVinculo}
                className="flex flex-col gap-[var(--space-4)]"
                noValidate
              >
                <Input
                  id="paciente-cpf"
                  label="CPF do Paciente"
                  name="cpf"
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={11}
                  value={cpf}
                  onChange={(event) => setCpf(onlyDigits(event.target.value).slice(0, 11))}
                  disabled={isPending}
                  placeholder="00000000000"
                />
                <Button type="submit" variant="primary" loading={isPending} disabled={isPending}>
                  {isPending ? 'Vinculando...' : 'Vincular Paciente'}
                </Button>
              </form>
            )}

            <Button type="button" variant="secondary" disabled={isPending} onClick={voltarParaBusca}>
              Voltar
            </Button>
          </div>
        </Card>
      ) : null}

      {etapa === 'sucesso' && vinculoSucesso ? (
        <Card>
          <Alert variant="success" titulo="Paciente cadastrado com sucesso">
            O paciente foi registrado na base deste município.
          </Alert>
          <div className="mt-[var(--space-4)] flex flex-wrap gap-[var(--space-3)]">
            <Button asChild variant="primary">
              <Link href={`/saude/tfd/nova?pacienteId=${vinculoSucesso.pacienteId}`}>
                Abrir atendimento TFD
              </Link>
            </Button>
            <Button type="button" variant="secondary" onClick={reiniciarFluxo}>
              Cadastrar outro paciente
            </Button>
          </div>
        </Card>
      ) : null}
    </div>
  )
}
