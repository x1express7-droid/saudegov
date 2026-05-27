'use client'

import { criarAgendamentoNovo } from '@saude/mod-saude-tfd/actions/agendamento'
import type { TfdPrestadorListItem } from '@saude/mod-saude-tfd/client'
import {
  labelRelacaoAcompanhante,
  type AcompanhanteSolicitacaoOption,
} from '@saude/mod-saude-tfd/client'
import { Button, Card, Input, Select, Spinner, Textarea } from '@saude/ui'
import { PermissionGate } from '@saude/ui/permission-gate'
import { TFD_PERMISSIONS } from '@saude/mod-saude-tfd/permissions'
import type { SaudeMunicSession } from '@saude/core-auth/types/session'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

const TIPO_ATENDIMENTO_OPTIONS = [
  { value: 'CONSULTA', label: 'Consulta' },
  { value: 'RETORNO', label: 'Retorno' },
  { value: 'EXAME', label: 'Exame' },
  { value: 'CIRURGIA', label: 'Cirurgia' },
] as const

function ServerError({ message }: { message: string }) {
  return (
    <p className="text-[length:var(--text-sm)] text-[var(--color-danger)]" role="alert">
      {message}
    </p>
  )
}

export interface AgendamentoNovoFormProps {
  session: SaudeMunicSession
  processoId: string
  solicitacaoId: string
  protocolo: string
  minDataConsulta: string
  minDataConsultaLabel: string
  prestadores: TfdPrestadorListItem[]
  acompanhantes: AcompanhanteSolicitacaoOption[]
  tipoAtendimentoInicial?: string
  prestadorIdInicial?: string | null
}

export function AgendamentoNovoForm({
  session,
  processoId,
  solicitacaoId,
  minDataConsulta,
  minDataConsultaLabel,
  prestadores,
  acompanhantes,
  tipoAtendimentoInicial,
  prestadorIdInicial,
}: AgendamentoNovoFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [serverError, setServerError] = useState<string | null>(null)

  const [dataConsulta, setDataConsulta] = useState('')
  const [horaConsulta, setHoraConsulta] = useState('')
  const [prestadorId, setPrestadorId] = useState(prestadorIdInicial ?? '')
  const [profissionalNome, setProfissionalNome] = useState('')
  const [tipoAtendimento, setTipoAtendimento] = useState(
    tipoAtendimentoInicial && TIPO_ATENDIMENTO_OPTIONS.some((o) => o.value === tipoAtendimentoInicial)
      ? tipoAtendimentoInicial
      : 'CONSULTA'
  )
  const [acompanhanteId, setAcompanhanteId] = useState('')
  const [orientacoes, setOrientacoes] = useState('')

  const prestadorOptions = prestadores.map((p) => ({
    value: p.id,
    label: `${p.nome} (${p.cidade}/${p.estado})`,
  }))

  const acompanhanteOptions = acompanhantes.map((a) => ({
    value: a.id,
    label: `${a.nome} — ${labelRelacaoAcompanhante(a.relacao)}`,
  }))

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setServerError(null)

    if (!dataConsulta) {
      setServerError('Informe a data da consulta.')
      return
    }

    if (dataConsulta < minDataConsulta) {
      setServerError(
        `A data da consulta deve ser pelo menos 72 horas após o momento atual (a partir de ${minDataConsultaLabel}).`
      )
      return
    }

    startTransition(async () => {
      const result = await criarAgendamentoNovo({
        processoId,
        solicitacaoId,
        dataConsulta,
        horaConsulta: horaConsulta.trim() || undefined,
        prestadorId: prestadorId || undefined,
        profissionalNome: profissionalNome.trim() || undefined,
        tipoAtendimento: tipoAtendimento as 'CONSULTA' | 'RETORNO' | 'EXAME' | 'CIRURGIA',
        acompanhanteId: acompanhanteId || undefined,
        orientacoes: orientacoes.trim() || undefined,
      })

      if (!result.success) {
        setServerError(result.error ?? 'Não foi possível criar o agendamento.')
        return
      }

      router.push(
        `/saude/tfd/processos/${processoId}/agendamentos/${result.data!.agendamentoId}`
      )
      router.refresh()
    })
  }

  return (
    <Card>
      <form onSubmit={handleSubmit} className="flex flex-col gap-[var(--space-4)]">
        <Input
          label="Data da consulta"
          type="date"
          value={dataConsulta}
          min={minDataConsulta}
          onChange={(event) => setDataConsulta(event.target.value)}
          disabled={isPending}
          required
          hint={`Antecedência mínima de 72 horas: consultas a partir de ${minDataConsultaLabel}.`}
        />

        <Input
          label="Hora da consulta (opcional)"
          type="time"
          value={horaConsulta}
          onChange={(event) => setHoraConsulta(event.target.value)}
          disabled={isPending}
        />

        <Select
          label="Prestador"
          value={prestadorId || undefined}
          placeholder={
            prestadorOptions.length > 0 ? 'Selecione o prestador' : 'Nenhum prestador cadastrado'
          }
          options={prestadorOptions}
          onValueChange={setPrestadorId}
          disabled={isPending || prestadorOptions.length === 0}
        />

        <Input
          label="Profissional que atenderá (opcional)"
          value={profissionalNome}
          onChange={(event) => setProfissionalNome(event.target.value)}
          disabled={isPending}
          maxLength={200}
        />

        <Select
          label="Tipo de atendimento"
          value={tipoAtendimento}
          options={[...TIPO_ATENDIMENTO_OPTIONS]}
          onValueChange={setTipoAtendimento}
          disabled={isPending}
          required
        />

        {acompanhanteOptions.length > 0 ? (
          <Select
            label="Acompanhante (opcional)"
            value={acompanhanteId || undefined}
            placeholder="Nenhum acompanhante selecionado"
            options={acompanhanteOptions}
            onValueChange={setAcompanhanteId}
            disabled={isPending}
          />
        ) : null}

        <Textarea
          label="Orientações (opcional)"
          value={orientacoes}
          onChange={(event) => setOrientacoes(event.target.value)}
          rows={4}
          disabled={isPending}
          hint="Máximo de 2.000 caracteres."
        />

        <PermissionGate session={session} permission={TFD_PERMISSIONS.CRIAR_AGENDAMENTO}>
          <Button type="submit" variant="primary" disabled={isPending}>
            {isPending ? (
              <>
                <Spinner className="mr-[var(--space-2)] size-4" />
                Salvando…
              </>
            ) : (
              'Confirmar agendamento'
            )}
          </Button>
        </PermissionGate>

        {serverError ? <ServerError message={serverError} /> : null}
      </form>
    </Card>
  )
}
