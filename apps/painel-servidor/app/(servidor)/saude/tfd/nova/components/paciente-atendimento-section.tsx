'use client'

import {
  atualizarPacienteCompletoTfd,
  buscarPacientePorCns,
} from '@saude/mod-saude-tfd/actions/paciente'
import {
  buscarPacientesAtendimentoTfd,
  carregarPacienteAtendimentoTfd,
  salvarPacienteAtendimentoTfd,
} from '@saude/mod-saude-tfd/actions/paciente-atendimento'
import type { TfdPacienteAtendimentoDetalhe } from '@saude/mod-saude-tfd/client'
import {
  Button,
  Card,
  CardHeader,
  formFieldsGridClassName,
  formFieldsStackClassName,
  Input,
  Select,
} from '@saude/ui'
import { useCallback, useState, useTransition } from 'react'

import { buscarEnderecoPorCep } from '../../../../../../lib/viacep'

export type PacienteAtendimentoFormState = {
  pacienteId?: string
  nome: string
  nomeSocial: string
  email: string
  telefoneCelular: string
  cpf: string
  cns: string
  dataNascimento: string
  sexo: 'MASCULINO' | 'FEMININO' | 'NAO_INFORMADO'
  nomeMae: string
  municipioNascimento: string
  cep: string
  logradouro: string
  numero: string
  complemento: string
  bairro: string
  municipio: string
  uf: string
  telefone: string
  telefoneAlternativo: string
}

const EMPTY_STATE: PacienteAtendimentoFormState = {
  nome: '',
  nomeSocial: '',
  email: '',
  telefoneCelular: '',
  cpf: '',
  cns: '',
  dataNascimento: '',
  sexo: 'NAO_INFORMADO',
  nomeMae: '',
  municipioNascimento: '',
  cep: '',
  logradouro: '',
  numero: '',
  complemento: '',
  bairro: '',
  municipio: '',
  uf: '',
  telefone: '',
  telefoneAlternativo: '',
}

const SEXO_OPTIONS = [
  { value: 'MASCULINO', label: 'Masculino' },
  { value: 'FEMININO', label: 'Feminino' },
  { value: 'NAO_INFORMADO', label: 'Não informado' },
]

const MODO_BUSCA_OPTIONS = [
  { value: 'nome', label: 'Nome' },
  { value: 'cpf', label: 'CPF' },
  { value: 'cns', label: 'CNS (Cartão SUS)' },
]

function onlyDigits(value: string): string {
  return value.replace(/\D/g, '')
}

async function salvarCamposComplementaresPaciente(form: PacienteAtendimentoFormState): Promise<string | null> {
  if (!form.pacienteId) {
    return null
  }

  const nomeSocial = form.nomeSocial.trim()
  const email = form.email.trim()
  const telefoneCelular = form.telefoneCelular.trim()

  if (!nomeSocial && !email && !telefoneCelular) {
    return null
  }

  const result = await atualizarPacienteCompletoTfd({
    pacienteId: form.pacienteId,
    ...(nomeSocial ? { nomeSocial } : {}),
    ...(email ? { email } : {}),
    ...(telefoneCelular ? { telefoneCelular } : {}),
  })

  if (!result.success) {
    return result.error ?? 'Não foi possível salvar os dados complementares do paciente.'
  }

  return null
}

function detalheToFormState(detalhe: TfdPacienteAtendimentoDetalhe): PacienteAtendimentoFormState {
  return {
    pacienteId: detalhe.id,
    nome: detalhe.nome,
    nomeSocial: '',
    email: '',
    telefoneCelular: '',
    cpf: detalhe.cpf ?? '',
    cns: detalhe.cns ?? '',
    dataNascimento: detalhe.dataNascimento ?? '',
    sexo: detalhe.sexo ?? 'NAO_INFORMADO',
    nomeMae: detalhe.nomeMae ?? '',
    municipioNascimento: detalhe.municipioNascimento ?? '',
    cep: detalhe.cep ?? '',
    logradouro: detalhe.logradouro ?? '',
    numero: detalhe.numero ?? '',
    complemento: detalhe.complemento ?? '',
    bairro: detalhe.bairro ?? '',
    municipio: detalhe.municipio ?? '',
    uf: detalhe.uf ?? '',
    telefone: detalhe.telefone ?? '',
    telefoneAlternativo: detalhe.telefoneAlternativo ?? '',
  }
}

export interface PacienteAtendimentoSectionProps {
  initialDetalhe?: TfdPacienteAtendimentoDetalhe | null
  cadsusEnabled?: boolean
  onPacienteSalvo: (pacienteId: string, detalhe: PacienteAtendimentoFormState) => void
  disabled?: boolean
}

export function PacienteAtendimentoSection({
  initialDetalhe,
  cadsusEnabled = false,
  onPacienteSalvo,
  disabled = false,
}: PacienteAtendimentoSectionProps) {
  const [form, setForm] = useState<PacienteAtendimentoFormState>(() =>
    initialDetalhe ? detalheToFormState(initialDetalhe) : { ...EMPTY_STATE }
  )
  const [modoBusca, setModoBusca] = useState<'nome' | 'cpf' | 'cns'>('nome')
  const [termoBusca, setTermoBusca] = useState('')
  const [resultados, setResultados] = useState<
    { id: string; nome: string; cpf: string | null; cns: string | null }[]
  >([])
  const [erro, setErro] = useState<string | null>(null)
  const [cepErro, setCepErro] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [cepLoading, setCepLoading] = useState(false)

  const updateField = useCallback(
    <K extends keyof PacienteAtendimentoFormState>(key: K, value: PacienteAtendimentoFormState[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }))
    },
    []
  )

  function handleBuscarLocal() {
    setErro(null)
    setResultados([])
    startTransition(async () => {
      const response = await buscarPacientesAtendimentoTfd({ termo: termoBusca, modo: modoBusca })
      if (!response.success) {
        setErro(response.error)
        return
      }
      setResultados(response.data)
      if (response.data.length === 0) {
        setErro(
          modoBusca === 'cns' && cadsusEnabled
            ? 'Paciente não encontrado no município. Consulte o CADSUS ou preencha os dados manualmente abaixo.'
            : 'Nenhum paciente encontrado. Preencha os dados abaixo para cadastrar na base do município.'
        )
      }
    })
  }

  function handleSelecionar(pacienteId: string) {
    setErro(null)
    startTransition(async () => {
      const response = await carregarPacienteAtendimentoTfd({ pacienteId })
      if (!response.success) {
        setErro(response.error)
        return
      }
      const next: PacienteAtendimentoFormState = {
        ...detalheToFormState(response.data),
        nomeSocial: form.nomeSocial,
        email: form.email,
        telefoneCelular: form.telefoneCelular,
      }
      const complementarErro = await salvarCamposComplementaresPaciente(next)
      if (complementarErro) {
        setErro(complementarErro)
        return
      }
      setForm(next)
      setResultados([])
      onPacienteSalvo(response.data.id, next)
    })
  }

  function handleBuscarCadsus() {
    setErro(null)
    const cnsDigits = onlyDigits(form.cns)
    if (cnsDigits.length !== 15) {
      setErro('Informe um CNS com 15 dígitos para consultar o CADSUS.')
      return
    }

    startTransition(async () => {
      const response = await buscarPacientePorCns({ cns: cnsDigits })
      if (!response.success) {
        setErro(response.error)
        return
      }

      const dados = response.data
      setForm((prev) => ({
        ...prev,
        cns: cnsDigits,
        nome: dados.nome || prev.nome,
        dataNascimento: dados.dataNascimento ?? prev.dataNascimento,
        municipioNascimento: dados.municipioNascimento ?? prev.municipioNascimento,
        sexo: dados.sexo ?? prev.sexo,
        pacienteId: dados.pacienteId ?? undefined,
      }))

      if (dados.pacienteId) {
        const load = await carregarPacienteAtendimentoTfd({ pacienteId: dados.pacienteId })
        if (load.success) {
          const next = detalheToFormState(load.data)
          setForm(next)
          onPacienteSalvo(load.data.id, next)
        }
      } else {
        setErro(
          'Dados obtidos do CADSUS. Complete CPF e endereço, depois clique em "Salvar dados do paciente".'
        )
      }
    })
  }

  async function handleCepBlur() {
    const cep = onlyDigits(form.cep)
    if (cep.length !== 8) {
      return
    }
    setCepLoading(true)
    setCepErro(null)
    const endereco = await buscarEnderecoPorCep(cep)
    setCepLoading(false)
    if (!endereco) {
      setCepErro('CEP não encontrado.')
      return
    }
    setForm((prev) => ({
      ...prev,
      cep,
      logradouro: endereco.logradouro || prev.logradouro,
      complemento: endereco.complemento || prev.complemento,
      bairro: endereco.bairro || prev.bairro,
      municipio: endereco.localidade || prev.municipio,
      uf: endereco.uf || prev.uf,
    }))
  }

  function handleSalvarPaciente() {
    setErro(null)
    startTransition(async () => {
      const response = await salvarPacienteAtendimentoTfd({
        pacienteId: form.pacienteId,
        nome: form.nome,
        cpf: onlyDigits(form.cpf) || undefined,
        cns: onlyDigits(form.cns) || undefined,
        dataNascimento: form.dataNascimento || undefined,
        sexo: form.sexo,
        nomeMae: form.nomeMae || undefined,
        municipioNascimento: form.municipioNascimento || undefined,
        cep: onlyDigits(form.cep) || undefined,
        logradouro: form.logradouro || undefined,
        numero: form.numero || undefined,
        complemento: form.complemento || undefined,
        bairro: form.bairro || undefined,
        municipio: form.municipio || undefined,
        uf: form.uf || undefined,
        telefone: form.telefone || undefined,
        telefoneAlternativo: form.telefoneAlternativo || undefined,
      })

      if (!response.success) {
        setErro(response.error)
        if (response.fieldErrors) {
          const first = Object.values(response.fieldErrors).flat()[0]
          if (first) {
            setErro(first)
          }
        }
        return
      }

      const next = { ...form, pacienteId: response.data.pacienteId }
      const complementarErro = await salvarCamposComplementaresPaciente(next)
      if (complementarErro) {
        setErro(complementarErro)
        return
      }
      setForm(next)
      onPacienteSalvo(response.data.pacienteId, next)
    })
  }

  return (
    <Card
      header={<CardHeader>Identificação do paciente</CardHeader>}
      bodyClassName={formFieldsStackClassName()}
    >
        <p className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
          Busque por nome, CPF ou CNS na base do município ou cadastre um novo paciente preenchendo os
          campos abaixo. CPF e CNS são opcionais.
          {cadsusEnabled
            ? ' Com a integração CADSUS ativa, você também pode importar dados pelo CNS.'
            : null}
        </p>

        <div className="grid gap-5 md:grid-cols-[140px_1fr_auto]">
          <Select
            id="modo-busca-paciente"
            label="Buscar por"
            options={MODO_BUSCA_OPTIONS}
            value={modoBusca}
            onValueChange={(value) => setModoBusca(value as 'nome' | 'cpf' | 'cns')}
            disabled={disabled || isPending}
          />
          <Input
            id="termo-busca-paciente"
            label="Termo de busca"
            value={termoBusca}
            onChange={(event) => setTermoBusca(event.target.value)}
            disabled={disabled || isPending}
            placeholder={
              modoBusca === 'nome'
                ? 'Nome do paciente'
                : modoBusca === 'cpf'
                  ? '00000000000'
                  : '000000000000000'
            }
            inputMode={modoBusca === 'nome' ? 'text' : 'numeric'}
          />
          <div className="flex items-end">
            <Button
              type="button"
              variant="secondary"
              onClick={handleBuscarLocal}
              disabled={disabled || isPending || !termoBusca.trim()}
              loading={isPending}
            >
              Buscar
            </Button>
          </div>
        </div>

        {resultados.length > 0 ? (
          <ul
            className="flex max-h-40 flex-col gap-[var(--space-1)] overflow-y-auto rounded-[var(--radius)] border border-[var(--color-border)] p-[var(--space-2)]"
            role="listbox"
            aria-label="Resultados da busca"
          >
            {resultados.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className="w-full rounded-[var(--radius-sm)] px-[var(--space-2)] py-[var(--space-2)] text-left text-[length:var(--text-sm)] hover:bg-[var(--color-bg)]"
                  onClick={() => handleSelecionar(item.id)}
                  disabled={disabled || isPending}
                >
                  <span className="font-medium text-[var(--color-text)]">{item.nome}</span>
                  {item.cpf ? (
                    <span className="ml-[var(--space-2)] text-[var(--color-text-muted)]">
                      CPF: {item.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')}
                    </span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        {erro ? (
          <p role="alert" className="text-[length:var(--text-sm)] text-[var(--color-error)]">
            {erro}
          </p>
        ) : null}

        <div className={formFieldsGridClassName()}>
          <Input
            id="paciente-nome"
            label="Nome do paciente"
            value={form.nome}
            onChange={(event) => updateField('nome', event.target.value)}
            disabled={disabled || isPending}
            required
          />
          <Input
            id="paciente-nome-social"
            label="Nome social (opcional)"
            value={form.nomeSocial}
            onChange={(event) => updateField('nomeSocial', event.target.value)}
            disabled={disabled || isPending}
          />
          <Input
            id="paciente-email"
            label="E-mail (opcional)"
            type="email"
            value={form.email}
            onChange={(event) => updateField('email', event.target.value)}
            disabled={disabled || isPending}
          />
          <Input
            id="paciente-celular"
            label="Telefone celular (opcional)"
            value={form.telefoneCelular}
            onChange={(event) => updateField('telefoneCelular', event.target.value)}
            disabled={disabled || isPending}
          />
          <Input
            id="paciente-cpf"
            label="CPF (opcional)"
            value={form.cpf}
            onChange={(event) => updateField('cpf', onlyDigits(event.target.value).slice(0, 11))}
            disabled={disabled || isPending}
            inputMode="numeric"
            maxLength={11}
            placeholder="00000000000"
          />
          <Input
            id="paciente-cns"
            label="Cartão SUS — CNS (opcional)"
            value={form.cns}
            onChange={(event) => updateField('cns', onlyDigits(event.target.value).slice(0, 15))}
            disabled={disabled || isPending}
            inputMode="numeric"
            maxLength={15}
          />
          <Input
            id="paciente-nascimento"
            label="Data de nascimento"
            type="date"
            value={form.dataNascimento}
            onChange={(event) => updateField('dataNascimento', event.target.value)}
            disabled={disabled || isPending}
          />
          <Input
            id="paciente-municipio-nasc"
            label="Município de nascimento"
            value={form.municipioNascimento}
            onChange={(event) => updateField('municipioNascimento', event.target.value)}
            disabled={disabled || isPending}
            placeholder="Cidade/UF"
          />
          <Select
            id="paciente-sexo"
            label="Sexo"
            options={SEXO_OPTIONS}
            value={form.sexo}
            onValueChange={(value) =>
              updateField('sexo', value as PacienteAtendimentoFormState['sexo'])
            }
            disabled={disabled || isPending}
          />
          <Input
            id="paciente-mae"
            label="Nome da mãe"
            value={form.nomeMae}
            onChange={(event) => updateField('nomeMae', event.target.value)}
            disabled={disabled || isPending}
            className="sm:col-span-2 lg:col-span-3"
          />
        </div>

        <div className="border-t border-[var(--color-border)] pt-5">
          <h3 className="mb-4 text-[length:var(--text-sm)] font-semibold text-[var(--color-text)]">
            Endereço e contato
          </h3>
          <div className={formFieldsGridClassName('sm:grid-cols-2 lg:grid-cols-4')}>
            <Input
              id="paciente-cep"
              label="CEP"
              value={form.cep}
              onChange={(event) => updateField('cep', onlyDigits(event.target.value).slice(0, 8))}
              onBlur={() => void handleCepBlur()}
              disabled={disabled || isPending || cepLoading}
              inputMode="numeric"
              maxLength={8}
              hint={cepLoading ? 'Buscando endereço…' : 'Ao sair do campo, o endereço é preenchido automaticamente.'}
            />
            <Input
              id="paciente-logradouro"
              label="Logradouro"
              value={form.logradouro}
              onChange={(event) => updateField('logradouro', event.target.value)}
              disabled={disabled || isPending}
              className="sm:col-span-2 lg:col-span-2"
            />
            <Input
              id="paciente-numero"
              label="Número"
              value={form.numero}
              onChange={(event) => updateField('numero', event.target.value)}
              disabled={disabled || isPending}
            />
            <Input
              id="paciente-complemento"
              label="Complemento"
              value={form.complemento}
              onChange={(event) => updateField('complemento', event.target.value)}
              disabled={disabled || isPending}
            />
            <Input
              id="paciente-bairro"
              label="Bairro"
              value={form.bairro}
              onChange={(event) => updateField('bairro', event.target.value)}
              disabled={disabled || isPending}
            />
            <Input
              id="paciente-municipio"
              label="Município"
              value={form.municipio}
              onChange={(event) => updateField('municipio', event.target.value)}
              disabled={disabled || isPending}
            />
            <Input
              id="paciente-uf"
              label="UF"
              value={form.uf}
              onChange={(event) =>
                updateField('uf', event.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 2))
              }
              disabled={disabled || isPending}
              maxLength={2}
            />
            <Input
              id="paciente-telefone"
              label="Telefone"
              value={form.telefone}
              onChange={(event) => updateField('telefone', event.target.value)}
              disabled={disabled || isPending}
            />
            <Input
              id="paciente-telefone-alt"
              label="Telefone alternativo"
              value={form.telefoneAlternativo}
              onChange={(event) => updateField('telefoneAlternativo', event.target.value)}
              disabled={disabled || isPending}
            />
          </div>
          {cepErro ? (
            <p className="mt-[var(--space-2)] text-[length:var(--text-sm)] text-[var(--color-warning)]">
              {cepErro}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-3 border-t border-[var(--color-border)] pt-5">
          {cadsusEnabled ? (
            <Button
              type="button"
              variant="secondary"
              onClick={handleBuscarCadsus}
              disabled={disabled || isPending}
              loading={isPending}
            >
              Buscar no CADSUS
            </Button>
          ) : null}
          <Button
            type="button"
            variant="primary"
            onClick={handleSalvarPaciente}
            disabled={disabled || isPending || !form.nome.trim()}
            loading={isPending}
          >
            Salvar dados do paciente
          </Button>
          {form.pacienteId ? (
            <span className="self-center text-[length:var(--text-xs)] text-[var(--color-success)]">
              Paciente vinculado ao município
            </span>
          ) : (
            <span className="self-center text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
              Salve o paciente antes de enviar a solicitação
            </span>
          )}
        </div>
    </Card>
  )
}
