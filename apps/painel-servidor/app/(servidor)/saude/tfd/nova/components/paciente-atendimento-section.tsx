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
import { Loader2 } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, useTransition } from 'react'

import { MunicipioNascimentoCombobox } from '../../components/municipio-nascimento-combobox'
import {
  BUSCA_PACIENTE_DEBOUNCE_MS,
  formatCepDisplay,
  formatCpfDisplay,
  formatTelefoneBr,
  hintTermoBuscaPaciente,
  onlyDigits,
  termoProntoParaBuscaPaciente,
  validarCpfObrigatorio,
  validarEmailOpcional,
  validarTelefoneCelularObrigatorio,
} from '../../components/paciente-form-utils'
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

async function salvarCamposComplementaresPaciente(form: PacienteAtendimentoFormState): Promise<string | null> {
  if (!form.pacienteId) {
    return null
  }

  const nomeSocial = form.nomeSocial.trim()
  if (!nomeSocial) {
    return null
  }

  const result = await atualizarPacienteCompletoTfd({
    pacienteId: form.pacienteId,
    nomeSocial,
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
    email: detalhe.email ?? '',
    telefoneCelular: detalhe.telefoneCelular ? formatTelefoneBr(detalhe.telefoneCelular) : '',
    cpf: detalhe.cpf ? formatCpfDisplay(detalhe.cpf) : '',
    cns: detalhe.cns ?? '',
    dataNascimento: detalhe.dataNascimento ?? '',
    sexo: detalhe.sexo ?? 'NAO_INFORMADO',
    nomeMae: detalhe.nomeMae ?? '',
    municipioNascimento: detalhe.municipioNascimento ?? '',
    cep: detalhe.cep ? formatCepDisplay(detalhe.cep) : '',
    logradouro: detalhe.logradouro ?? '',
    numero: detalhe.numero ?? '',
    complemento: detalhe.complemento ?? '',
    bairro: detalhe.bairro ?? '',
    municipio: detalhe.municipio ?? '',
    uf: detalhe.uf ?? '',
    telefone: detalhe.telefone ? formatTelefoneBr(detalhe.telefone) : '',
    telefoneAlternativo: detalhe.telefoneAlternativo
      ? formatTelefoneBr(detalhe.telefoneAlternativo)
      : '',
  }
}

export interface PacienteAtendimentoSectionProps {
  initialDetalhe?: TfdPacienteAtendimentoDetalhe | null
  cadsusEnabled?: boolean
  onPacienteSalvo: (
    pacienteId: string,
    detalhe: PacienteAtendimentoFormState,
    atualizado?: boolean
  ) => void
  disabled?: boolean
  variant?: 'atendimento' | 'cadastro'
  /** Em modo cadastro, notifica o pai apenas ao salvar — não ao selecionar paciente existente. */
  notificarSalvoApenasAoSalvar?: boolean
}

export function PacienteAtendimentoSection({
  initialDetalhe,
  cadsusEnabled = false,
  onPacienteSalvo,
  disabled = false,
  variant = 'atendimento',
  notificarSalvoApenasAoSalvar = false,
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
  const [cpfErro, setCpfErro] = useState<string | null>(null)
  const [emailErro, setEmailErro] = useState<string | null>(null)
  const [celularErro, setCelularErro] = useState<string | null>(null)
  const [cepErro, setCepErro] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [cepLoading, setCepLoading] = useState(false)
  const [buscando, setBuscando] = useState(false)
  const [listaAberta, setListaAberta] = useState(false)
  const [buscaSemResultado, setBuscaSemResultado] = useState(false)
  const buscaRequestId = useRef(0)

  const updateField = useCallback(
    <K extends keyof PacienteAtendimentoFormState>(key: K, value: PacienteAtendimentoFormState[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }))
    },
    []
  )

  useEffect(() => {
    if (!listaAberta) {
      return
    }

    const termo =
      modoBusca === 'cpf' || modoBusca === 'cns' ? onlyDigits(termoBusca) : termoBusca.trim()

    if (!termoProntoParaBuscaPaciente(termoBusca, modoBusca)) {
      setResultados([])
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
          setErro(
            modoBusca === 'cns' && cadsusEnabled
              ? 'Paciente não encontrado no município. Consulte o CADSUS ou preencha os dados manualmente abaixo.'
              : 'Nenhum paciente encontrado. Preencha os dados abaixo para cadastrar na base do município.'
          )
          setBuscaSemResultado(true)
        } else {
          setErro(null)
          setBuscaSemResultado(false)
        }
      })()
    }, BUSCA_PACIENTE_DEBOUNCE_MS)

    return () => {
      window.clearTimeout(timer)
    }
  }, [cadsusEnabled, listaAberta, modoBusca, termoBusca])

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
        ? formatCpfDisplay(value)
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
      const next: PacienteAtendimentoFormState = {
        ...detalheToFormState(response.data),
        nomeSocial: form.nomeSocial,
      }
      const complementarErro = await salvarCamposComplementaresPaciente(next)
      if (complementarErro) {
        setErro(complementarErro)
        setListaAberta(true)
        return
      }
      setForm(next)
      setResultados([])
      setTermoBusca('')
      setBuscaSemResultado(false)
      setCpfErro(null)
      setEmailErro(null)
      setCelularErro(null)
      if (!notificarSalvoApenasAoSalvar) {
        onPacienteSalvo(response.data.id, next)
      }
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
          if (!notificarSalvoApenasAoSalvar) {
            onPacienteSalvo(load.data.id, next)
          }
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
      cep: formatCepDisplay(cep),
      logradouro: endereco.logradouro || prev.logradouro,
      complemento: endereco.complemento || prev.complemento,
      bairro: endereco.bairro || prev.bairro,
      municipio: endereco.localidade || prev.municipio,
      uf: endereco.uf || prev.uf,
    }))
  }

  function handleCpfBlur() {
    setCpfErro(validarCpfObrigatorio(form.cpf))
  }

  function handleEmailBlur() {
    setEmailErro(validarEmailOpcional(form.email))
  }

  function handleCelularBlur() {
    setCelularErro(validarTelefoneCelularObrigatorio(form.telefoneCelular))
  }

  function handleSalvarPaciente() {
    setErro(null)

    const cpfValidacao = validarCpfObrigatorio(form.cpf)
    const emailValidacao = validarEmailOpcional(form.email)
    const celularValidacao = validarTelefoneCelularObrigatorio(form.telefoneCelular)

    setCpfErro(cpfValidacao)
    setEmailErro(emailValidacao)
    setCelularErro(celularValidacao)

    const primeiraValidacao = cpfValidacao ?? emailValidacao ?? celularValidacao
    if (primeiraValidacao) {
      setErro(primeiraValidacao)
      return
    }

    if (!form.nome.trim()) {
      setErro('Nome do paciente é obrigatório.')
      return
    }

    const atualizado = Boolean(form.pacienteId)
    startTransition(async () => {
      const response = await salvarPacienteAtendimentoTfd({
        pacienteId: form.pacienteId,
        nome: form.nome,
        cpf: onlyDigits(form.cpf),
        email: form.email.trim(),
        telefoneCelular: onlyDigits(form.telefoneCelular),
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
        telefone: onlyDigits(form.telefone) || undefined,
        telefoneAlternativo: onlyDigits(form.telefoneAlternativo) || undefined,
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
      onPacienteSalvo(response.data.pacienteId, next, atualizado)
    })
  }

  const tituloCard =
    variant === 'cadastro' ? 'Dados do paciente' : 'Identificação do paciente'
  const descricaoCard =
    variant === 'cadastro'
      ? `Busque um paciente já cadastrado para editar ou preencha os campos para um novo cadastro na base do município. Nome, telefone celular e CPF são obrigatórios.${
          cadsusEnabled
            ? ' Com a integração CADSUS ativa, você também pode importar dados pelo CNS.'
            : ''
        }`
      : `Busque por nome, CPF ou CNS na base do município ou cadastre um novo paciente preenchendo os campos abaixo. Nome, telefone celular e CPF são obrigatórios.${
          cadsusEnabled
            ? ' Com a integração CADSUS ativa, você também pode importar dados pelo CNS.'
            : ''
        }`
  const rotuloSalvar =
    variant === 'cadastro'
      ? form.pacienteId
        ? 'Salvar alterações'
        : 'Cadastrar paciente'
      : 'Salvar dados do paciente'

  const formularioPronto =
    form.nome.trim().length >= 3 &&
    !validarCpfObrigatorio(form.cpf) &&
    !validarEmailOpcional(form.email) &&
    !validarTelefoneCelularObrigatorio(form.telefoneCelular)

  const exibirLista =
    listaAberta && (buscando || resultados.length > 0 || buscaSemResultado || Boolean(erro))

  return (
    <Card
      header={<CardHeader>{tituloCard}</CardHeader>}
      bodyClassName={formFieldsStackClassName()}
    >
        <p className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">{descricaoCard}</p>

        <div className="grid gap-5 md:grid-cols-[140px_1fr]">
          <Select
            id="modo-busca-paciente"
            label="Buscar por"
            options={MODO_BUSCA_OPTIONS}
            value={modoBusca}
            onValueChange={(value) => handleModoBuscaChange(value as 'nome' | 'cpf' | 'cns')}
            disabled={disabled || isPending}
          />
          <div className="relative">
            <Input
              id="termo-busca-paciente"
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
                    ? '123.456.789-09'
                    : '000000000000000'
              }
              inputMode={modoBusca === 'nome' ? 'text' : 'numeric'}
              autoComplete="off"
              hint={hintTermoBuscaPaciente(modoBusca, termoBusca, buscando)}
              aria-autocomplete="list"
              aria-controls="paciente-busca-listbox"
              aria-expanded={exibirLista}
            />

            {exibirLista ? (
              <div
                id="paciente-busca-listbox"
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
                              CPF: {formatCpfDisplay(item.cpf)}
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

        {erro && !exibirLista ? (
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
            onChange={(event) => {
              updateField('email', event.target.value)
              if (emailErro) {
                setEmailErro(null)
              }
            }}
            onBlur={handleEmailBlur}
            disabled={disabled || isPending}
            error={emailErro ?? undefined}
          />
          <Input
            id="paciente-celular"
            label="Telefone celular"
            value={form.telefoneCelular}
            onChange={(event) => {
              updateField('telefoneCelular', formatTelefoneBr(event.target.value))
              if (celularErro) {
                setCelularErro(null)
              }
            }}
            onBlur={handleCelularBlur}
            disabled={disabled || isPending}
            inputMode="tel"
            placeholder="(00) 00000-0000"
            required
            error={celularErro ?? undefined}
          />
          <Input
            id="paciente-cpf"
            label="CPF"
            value={form.cpf}
            onChange={(event) => {
              updateField('cpf', formatCpfDisplay(event.target.value))
              if (cpfErro) {
                setCpfErro(null)
              }
            }}
            onBlur={handleCpfBlur}
            disabled={disabled || isPending}
            inputMode="numeric"
            maxLength={14}
            placeholder="123.456.789-09"
            required
            error={cpfErro ?? undefined}
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
          <MunicipioNascimentoCombobox
            value={form.municipioNascimento}
            onChange={(value) => updateField('municipioNascimento', value)}
            disabled={disabled || isPending}
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
              onChange={(event) => updateField('cep', formatCepDisplay(event.target.value))}
              onBlur={() => void handleCepBlur()}
              disabled={disabled || isPending || cepLoading}
              inputMode="numeric"
              placeholder="00000-000"
              maxLength={9}
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
              onChange={(event) => updateField('telefone', formatTelefoneBr(event.target.value))}
              disabled={disabled || isPending}
              inputMode="tel"
              placeholder="(00) 0000-0000"
            />
            <Input
              id="paciente-telefone-alt"
              label="Telefone alternativo"
              value={form.telefoneAlternativo}
              onChange={(event) =>
                updateField('telefoneAlternativo', formatTelefoneBr(event.target.value))
              }
              disabled={disabled || isPending}
              inputMode="tel"
              placeholder="(00) 00000-0000"
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
            disabled={disabled || isPending || !formularioPronto}
            loading={isPending}
          >
            {rotuloSalvar}
          </Button>
          {form.pacienteId ? (
            <span className="self-center text-[length:var(--text-xs)] text-[var(--color-success)]">
              {variant === 'cadastro'
                ? 'Paciente selecionado — salve para confirmar as alterações'
                : 'Paciente vinculado ao município'}
            </span>
          ) : variant === 'cadastro' ? (
            <span className="self-center text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
              Preencha os dados e salve para cadastrar na base do município
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
