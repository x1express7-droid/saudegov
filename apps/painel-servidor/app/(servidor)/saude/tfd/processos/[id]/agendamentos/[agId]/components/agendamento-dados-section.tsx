'use client'

import { atualizarAgendamentoTfd } from '@saude/mod-saude-tfd/actions/agendamento'
import type {
  AgendamentoDetalheOutput,
  AcompanhanteSolicitacaoOption,
  TfdPrestadorListItem,
} from '@saude/mod-saude-tfd/client'
import { labelRelacaoAcompanhante } from '@saude/mod-saude-tfd/client'
import { TFD_PERMISSIONS } from '@saude/mod-saude-tfd/permissions'
import type { SaudeMunicSession } from '@saude/core-auth/types/session'
import {
  Alert,
  Button,
  Card,
  CardHeader,
  Combobox,
  Input,
  Spinner,
  Textarea,
  formFieldsGridClassName,
  formFieldsStackClassName,
} from '@saude/ui'
import { PermissionGate } from '@saude/ui/permission-gate'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

const TIPO_ATENDIMENTO_OPTIONS = [
  { value: 'CONSULTA', label: 'Consulta' },
  { value: 'RETORNO', label: 'Retorno' },
  { value: 'EXAME', label: 'Exame' },
  { value: 'CIRURGIA', label: 'Cirurgia' },
] as const

const CONVENIO_OPTIONS = [
  { value: 'SUS', label: 'SUS' },
  { value: 'PARTICULAR', label: 'Particular' },
] as const

const TIPO_VIAGEM_OPTIONS = [
  { value: 'IDA', label: 'Somente ida' },
  { value: 'VOLTA', label: 'Somente volta' },
  { value: 'IDA_VOLTA', label: 'Ida e volta' },
] as const

const TIPO_ATENDIMENTO_LABEL: Record<string, string> = {
  CONSULTA: 'Consulta',
  RETORNO: 'Retorno',
  EXAME: 'Exame',
  CIRURGIA: 'Cirurgia',
}

const CONVENIO_LABEL: Record<string, string> = {
  SUS: 'SUS',
  PARTICULAR: 'Particular',
}

const TIPO_VIAGEM_LABEL: Record<string, string> = {
  IDA: 'Somente ida',
  VOLTA: 'Somente volta',
  IDA_VOLTA: 'Ida e volta',
}

function formatDataConsulta(iso: string, hora: string | null): string {
  const parsed = iso.length === 10 ? `${iso}T12:00:00` : iso
  const data = new Date(parsed).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
  return hora ? `${data} às ${hora}` : data
}

function labelPrestador(
  prestador: {
    nome: string | null
    cidade: string | null
    estado: string | null
  } | null
): string {
  if (!prestador?.nome) {
    return '—'
  }
  if (prestador.cidade && prestador.estado) {
    return `${prestador.nome} (${prestador.cidade}/${prestador.estado})`
  }
  return prestador.nome
}

function DetalheCampo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[length:var(--text-xs)] text-[var(--color-text-muted)]">{label}</dt>
      <dd className="mt-[var(--space-1)] text-[length:var(--text-sm)] text-[var(--color-text)]">
        {children}
      </dd>
    </div>
  )
}

export interface AgendamentoDadosSectionProps {
  session: SaudeMunicSession
  agendamento: AgendamentoDetalheOutput
  podeEditar: boolean
  minDataConsulta: string
  minDataConsultaLabel: string
  prestadores: TfdPrestadorListItem[]
  acompanhantes: AcompanhanteSolicitacaoOption[]
}

export function AgendamentoDadosSection({
  session,
  agendamento,
  podeEditar,
  minDataConsulta,
  minDataConsultaLabel,
  prestadores,
  acompanhantes,
}: AgendamentoDadosSectionProps) {
  const router = useRouter()
  const [editando, setEditando] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [serverError, setServerError] = useState<string | null>(null)

  const [dataConsulta, setDataConsulta] = useState(agendamento.dataConsulta)
  const [horaConsulta, setHoraConsulta] = useState(agendamento.horaConsulta ?? '')
  const [tipoAtendimento, setTipoAtendimento] = useState(agendamento.tipoAtendimento)
  const [prestadorId, setPrestadorId] = useState(agendamento.prestador.id ?? '')
  const [profissionalNome, setProfissionalNome] = useState(agendamento.profissionalNome ?? '')
  const [convenio, setConvenio] = useState(agendamento.convenio ?? 'SUS')
  const [tipoViagem, setTipoViagem] = useState(agendamento.tipoViagem ?? 'IDA_VOLTA')
  const [acompanhanteId, setAcompanhanteId] = useState(agendamento.acompanhante.id ?? '')
  const [orientacoes, setOrientacoes] = useState(agendamento.orientacoes ?? '')

  const prestadorOptions = prestadores.map((item) => ({
    value: item.id,
    label: item.cidade && item.estado ? `${item.nome} (${item.cidade}/${item.estado})` : item.nome,
  }))

  const acompanhanteOptions = acompanhantes.map((item) => ({
    value: item.id,
    label: `${item.nome} — ${labelRelacaoAcompanhante(item.relacao)}`,
  }))

  function resetForm() {
    setDataConsulta(agendamento.dataConsulta)
    setHoraConsulta(agendamento.horaConsulta ?? '')
    setTipoAtendimento(agendamento.tipoAtendimento)
    setPrestadorId(agendamento.prestador.id ?? '')
    setProfissionalNome(agendamento.profissionalNome ?? '')
    setConvenio(agendamento.convenio ?? 'SUS')
    setTipoViagem(agendamento.tipoViagem ?? 'IDA_VOLTA')
    setAcompanhanteId(agendamento.acompanhante.id ?? '')
    setOrientacoes(agendamento.orientacoes ?? '')
    setServerError(null)
  }

  function validarFormulario(): string | null {
    if (!dataConsulta) {
      return 'Informe a data da consulta.'
    }
    if (dataConsulta < minDataConsulta) {
      return `A data da consulta deve ser igual ou posterior à data de aprovação da solicitação (a partir de ${minDataConsultaLabel}).`
    }
    if (!convenio) {
      return 'Selecione o convênio.'
    }
    if (!tipoViagem) {
      return 'Selecione o tipo de viagem.'
    }
    return null
  }

  function handleSalvar() {
    setServerError(null)
    const validationError = validarFormulario()
    if (validationError) {
      setServerError(validationError)
      return
    }

    startTransition(async () => {
      const result = await atualizarAgendamentoTfd({
        agendamentoId: agendamento.id,
        dataConsulta,
        horaConsulta: horaConsulta.trim() || undefined,
        prestadorId: prestadorId || undefined,
        profissionalNome: profissionalNome.trim() || undefined,
        tipoAtendimento: tipoAtendimento as 'CONSULTA' | 'RETORNO' | 'EXAME' | 'CIRURGIA',
        convenio: convenio as 'SUS' | 'PARTICULAR',
        tipoViagem: tipoViagem as 'IDA' | 'VOLTA' | 'IDA_VOLTA',
        acompanhanteId: acompanhanteId || '',
        orientacoes: orientacoes.trim() || undefined,
      })

      if (!result.success) {
        setServerError(result.error ?? 'Não foi possível salvar o agendamento.')
        return
      }

      setEditando(false)
      router.refresh()
    })
  }

  return (
    <Card
      header={
        <div className="flex flex-wrap items-center justify-between gap-[var(--space-2)]">
          <CardHeader className="border-0 p-0">Dados do agendamento</CardHeader>
          {podeEditar && !editando ? (
            <PermissionGate session={session} permission={TFD_PERMISSIONS.CRIAR_AGENDAMENTO}>
              <Button
                type="button"
                variant="secondary"
                className="text-[length:var(--text-xs)]"
                onClick={() => {
                  resetForm()
                  setEditando(true)
                }}
              >
                Editar
              </Button>
            </PermissionGate>
          ) : null}
        </div>
      }
      bodyClassName={editando ? formFieldsStackClassName() : undefined}
    >
      {editando ? (
        <>
          <div className={formFieldsGridClassName()}>
            <Input
              label="Data da consulta"
              type="date"
              value={dataConsulta}
              min={minDataConsulta}
              onChange={(event) => setDataConsulta(event.target.value)}
              disabled={isPending}
              required
              hint={`A partir da data de aprovação (${minDataConsultaLabel}).`}
            />
            <Input
              label="Hora da consulta (opcional)"
              type="time"
              value={horaConsulta}
              onChange={(event) => setHoraConsulta(event.target.value)}
              disabled={isPending}
            />
            <Combobox
              label="Tipo de atendimento"
              value={tipoAtendimento}
              options={[...TIPO_ATENDIMENTO_OPTIONS]}
              onChange={setTipoAtendimento}
              disabled={isPending}
            />
            <Combobox
              label="Prestador (opcional)"
              value={prestadorId}
              options={prestadorOptions}
              onChange={setPrestadorId}
              disabled={isPending}
              placeholder="Selecione o prestador"
            />
            <Input
              label="Profissional (opcional)"
              value={profissionalNome}
              onChange={(event) => setProfissionalNome(event.target.value)}
              disabled={isPending}
            />
            <Combobox
              label="Convênio"
              value={convenio}
              options={[...CONVENIO_OPTIONS]}
              onChange={setConvenio}
              disabled={isPending}
            />
            <Combobox
              label="Tipo de viagem"
              value={tipoViagem}
              options={[...TIPO_VIAGEM_OPTIONS]}
              onChange={setTipoViagem}
              disabled={isPending}
            />
            <Combobox
              label="Acompanhante (opcional)"
              value={acompanhanteId}
              options={acompanhanteOptions}
              onChange={setAcompanhanteId}
              disabled={isPending}
              placeholder="Nenhum"
            />
          </div>
          <Textarea
            label="Orientações (opcional)"
            value={orientacoes}
            onChange={(event) => setOrientacoes(event.target.value)}
            disabled={isPending}
            rows={4}
            maxLength={2000}
            hint="Máximo de 2.000 caracteres."
          />

          {serverError ? (
            <Alert variant="error" role="alert">
              {serverError}
            </Alert>
          ) : null}

          <div className="flex flex-wrap gap-[var(--space-2)]">
            <Button type="button" variant="primary" disabled={isPending} onClick={handleSalvar}>
              {isPending ? (
                <>
                  <Spinner className="size-4" />
                  Salvando...
                </>
              ) : (
                'Salvar alterações'
              )}
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={isPending}
              onClick={() => {
                resetForm()
                setEditando(false)
              }}
            >
              Cancelar
            </Button>
          </div>
        </>
      ) : (
        <dl className="grid gap-[var(--space-3)] sm:grid-cols-2">
          <DetalheCampo label="Data / hora">
            {formatDataConsulta(agendamento.dataConsulta, agendamento.horaConsulta)}
          </DetalheCampo>
          <DetalheCampo label="Tipo de atendimento">
            {TIPO_ATENDIMENTO_LABEL[agendamento.tipoAtendimento] ?? agendamento.tipoAtendimento}
          </DetalheCampo>
          <DetalheCampo label="Prestador">{labelPrestador(agendamento.prestador)}</DetalheCampo>
          <DetalheCampo label="Profissional">{agendamento.profissionalNome ?? '—'}</DetalheCampo>
          <DetalheCampo label="Convênio">
            {agendamento.convenio ? (CONVENIO_LABEL[agendamento.convenio] ?? agendamento.convenio) : '—'}
          </DetalheCampo>
          <DetalheCampo label="Tipo de viagem">
            {agendamento.tipoViagem
              ? (TIPO_VIAGEM_LABEL[agendamento.tipoViagem] ?? agendamento.tipoViagem)
              : '—'}
          </DetalheCampo>
          <DetalheCampo label="Acompanhante">{agendamento.acompanhante.nome ?? '—'}</DetalheCampo>
          <div className="sm:col-span-2">
            <DetalheCampo label="Orientações">
              <span className="whitespace-pre-wrap">
                {agendamento.orientacoes?.trim() || '—'}
              </span>
            </DetalheCampo>
          </div>
        </dl>
      )}
    </Card>
  )
}
