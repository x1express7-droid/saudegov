'use client'

import { buscarPacientesAtendimentoTfd } from '@saude/mod-saude-tfd/actions/paciente-atendimento'
import { labelRelacaoAcompanhante, type AbrirSolicitacaoInput } from '@saude/mod-saude-tfd/client'
import { Input, Select } from '@saude/ui'
import { Loader2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { Control, FieldErrors, UseFormSetValue, UseFormWatch } from 'react-hook-form'
import { Controller } from 'react-hook-form'

const RELACAO_OPTIONS = [
  { value: 'CONJUGE', label: labelRelacaoAcompanhante('CONJUGE') },
  { value: 'FILHO_A', label: labelRelacaoAcompanhante('FILHO_A') },
  { value: 'PAI_MAE', label: labelRelacaoAcompanhante('PAI_MAE') },
  { value: 'RESPONSAVEL_LEGAL', label: labelRelacaoAcompanhante('RESPONSAVEL_LEGAL') },
  { value: 'CUIDADOR', label: labelRelacaoAcompanhante('CUIDADOR') },
  { value: 'OUTRO', label: labelRelacaoAcompanhante('OUTRO') },
] as const

const BUSCA_DEBOUNCE_MS = 350
const MIN_NOME_CHARS = 2

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

export interface SolicitacaoAcompanhanteSectionProps {
  control: Control<AbrirSolicitacaoInput>
  errors: FieldErrors<AbrirSolicitacaoInput>
  watch: UseFormWatch<AbrirSolicitacaoInput>
  setValue: UseFormSetValue<AbrirSolicitacaoInput>
  pacienteId: string
  disabled?: boolean
}

export function SolicitacaoAcompanhanteSection({
  control,
  errors,
  watch,
  setValue,
  pacienteId,
  disabled = false,
}: SolicitacaoAcompanhanteSectionProps) {
  const acompanhanteNecessario = watch('acompanhanteNecessario')
  const acompanhantePacienteId = watch('acompanhante.pacienteId')

  const [modoBusca, setModoBusca] = useState<'nome' | 'cpf' | 'cns'>('nome')
  const [termoBusca, setTermoBusca] = useState('')
  const [resultados, setResultados] = useState<ResultadoBusca[]>([])
  const [buscando, setBuscando] = useState(false)
  const [listaAberta, setListaAberta] = useState(false)
  const [nomeSelecionado, setNomeSelecionado] = useState('')
  const buscaRequestId = useRef(0)

  useEffect(() => {
    if (!acompanhanteNecessario) {
      setValue('acompanhante', undefined)
      setTermoBusca('')
      setResultados([])
      setNomeSelecionado('')
    }
  }, [acompanhanteNecessario, setValue])

  useEffect(() => {
    if (!listaAberta || !acompanhanteNecessario) {
      return
    }

    const termo = termoBusca.trim()
    if (!termoProntoParaBusca(termo, modoBusca)) {
      setResultados([])
      setBuscando(false)
      return
    }

    setBuscando(true)
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
          return
        }

        setResultados(response.data.filter((item) => item.id !== pacienteId))
      })()
    }, BUSCA_DEBOUNCE_MS)

    return () => {
      window.clearTimeout(timer)
    }
  }, [acompanhanteNecessario, listaAberta, modoBusca, pacienteId, termoBusca])

  function handleSelecionar(item: ResultadoBusca) {
    setValue('acompanhante.pacienteId', item.id, { shouldValidate: true })
    setNomeSelecionado(item.nome)
    setTermoBusca(item.nome)
    setResultados([])
    setListaAberta(false)
  }

  function handleTrocarAcompanhante() {
    setValue('acompanhante.pacienteId', undefined as never, { shouldValidate: true })
    setNomeSelecionado('')
    setTermoBusca('')
    setResultados([])
    buscaRequestId.current += 1
  }

  const exibirLista =
    listaAberta && acompanhanteNecessario && (buscando || resultados.length > 0)

  if (!acompanhanteNecessario) {
    return null
  }

  return (
    <div className="flex flex-col gap-[var(--space-4)] rounded-[var(--radius)] border border-[var(--color-border)] p-[var(--space-4)]">
      <p className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
        O acompanhante deve ser um paciente já cadastrado na base do município. Informe também o
        parentesco com o paciente da solicitação.
      </p>

      {acompanhantePacienteId ? (
        <div className="flex flex-wrap items-center justify-between gap-[var(--space-3)] rounded-[var(--radius)] bg-[var(--color-bg)] px-[var(--space-3)] py-[var(--space-3)]">
          <div>
            <p className="text-[length:var(--text-xs)] font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
              Acompanhante selecionado
            </p>
            <p className="mt-[var(--space-1)] font-medium text-[var(--color-text)]">
              {nomeSelecionado || 'Paciente selecionado'}
            </p>
          </div>
          <button
            type="button"
            className="text-[length:var(--text-sm)] font-medium text-[var(--color-primary)] hover:underline"
            onClick={handleTrocarAcompanhante}
            disabled={disabled}
          >
            Trocar acompanhante
          </button>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-[140px_1fr]">
          <Select
            id="modo-busca-acompanhante"
            label="Buscar por"
            options={[
              { value: 'nome', label: 'Nome' },
              { value: 'cpf', label: 'CPF' },
              { value: 'cns', label: 'CNS (Cartão SUS)' },
            ]}
            value={modoBusca}
            onValueChange={(value) => {
              setModoBusca(value as 'nome' | 'cpf' | 'cns')
              setTermoBusca('')
              setResultados([])
              setListaAberta(true)
              buscaRequestId.current += 1
            }}
            disabled={disabled}
          />
          <div className="relative">
            <Input
              id="termo-busca-acompanhante"
              label="Paciente acompanhante"
              value={termoBusca}
              onChange={(event) => {
                const value = event.target.value
                const nextValue =
                  modoBusca === 'cpf'
                    ? onlyDigits(value).slice(0, 11)
                    : modoBusca === 'cns'
                      ? onlyDigits(value).slice(0, 15)
                      : value
                setTermoBusca(nextValue)
                setListaAberta(true)
              }}
              onFocus={() => setListaAberta(true)}
              onBlur={() => {
                window.setTimeout(() => setListaAberta(false), 150)
              }}
              disabled={disabled}
              placeholder={
                modoBusca === 'nome'
                  ? 'Digite o nome do acompanhante'
                  : modoBusca === 'cpf'
                    ? '00000000000'
                    : '000000000000000'
              }
              inputMode={modoBusca === 'nome' ? 'text' : 'numeric'}
              hint="Busque e selecione um paciente cadastrado."
              error={errors.acompanhante?.pacienteId?.message ?? errors.acompanhante?.message}
            />

            {exibirLista ? (
              <div className="absolute z-20 mt-[var(--space-1)] w-full overflow-hidden rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-md)]">
                {buscando ? (
                  <div className="flex items-center gap-[var(--space-2)] px-[var(--space-3)] py-[var(--space-3)] text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    Buscando pacientes…
                  </div>
                ) : (
                  <ul className="max-h-48 overflow-y-auto py-[var(--space-1)]">
                    {resultados.map((item) => (
                      <li key={item.id}>
                        <button
                          type="button"
                          className="w-full px-[var(--space-3)] py-[var(--space-2)] text-left text-[length:var(--text-sm)] hover:bg-[var(--color-bg)]"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => handleSelecionar(item)}
                          disabled={disabled}
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
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}

      <Controller
        name="acompanhante.relacao"
        control={control}
        render={({ field }) => (
          <Select
            id="acompanhante-relacao"
            label="Parentesco"
            required
            placeholder="Selecione o parentesco"
            options={[...RELACAO_OPTIONS]}
            value={field.value ?? ''}
            onValueChange={field.onChange}
            disabled={disabled}
            error={errors.acompanhante?.relacao?.message}
          />
        )}
      />
    </div>
  )
}
