'use client'

import { criarSegmentoTransporte } from '@saude/mod-saude-tfd/actions/transporte'
import {
  formatCnhCategorias,
  type TfdMotoristaAgendamentoItem,
  type TfdPrestadorListItem,
  type TfdVeiculoAgendamentoItem,
} from '@saude/mod-saude-tfd/client'
import { listarMotoristasAgendamentoTfd } from '@saude/mod-saude-tfd/actions/viagem'
import { TFD_PERMISSIONS } from '@saude/mod-saude-tfd/permissions'
import type { SaudeMunicSession } from '@saude/core-auth/types/session'
import { Alert, Button, Card, Combobox, Input, Select, Spinner, Textarea } from '@saude/ui'
import { PermissionGate } from '@saude/ui/permission-gate'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'

import { TIPO_SEGMENTO_CONFIG } from '../../../components/transporte-constants'

const TIPO_SEGMENTO_OPTIONS = Object.entries(TIPO_SEGMENTO_CONFIG).map(([value, config]) => ({
  value,
  label: `${config.emoji} ${config.label}`,
}))

const RESPONSAVEL_OPTIONS = [
  { value: 'MUNICIPIO', label: 'Município' },
  { value: 'PACIENTE_REEMBOLSO', label: 'Paciente (reembolso)' },
] as const

function ServerError({ message }: { message: string }) {
  return (
    <p className="text-[length:var(--text-sm)] text-[var(--color-danger)]" role="alert">
      {message}
    </p>
  )
}

function isCnhVencendoEmBreve(validadeIso: string): boolean {
  const vencimento = new Date(`${validadeIso}T12:00:00`)
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const limite = new Date(hoje)
  limite.setDate(limite.getDate() + 30)
  return vencimento >= hoje && vencimento <= limite
}

export interface SegmentoTransporteFormProps {
  session: SaudeMunicSession
  prestadores: TfdPrestadorListItem[]
  veiculos: TfdVeiculoAgendamentoItem[]
  agendamentoId?: string
  viagemId?: string
  processoId?: string
  successRedirectPath: string
}

export function SegmentoTransporteForm({
  session,
  agendamentoId,
  viagemId,
  prestadores,
  veiculos,
  successRedirectPath,
}: SegmentoTransporteFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [serverError, setServerError] = useState<string | null>(null)

  const [tipoSegmento, setTipoSegmento] = useState('TERRESTRE_PROPRIO')
  const [origemDescricao, setOrigemDescricao] = useState('')
  const [destinoDescricao, setDestinoDescricao] = useState('')
  const [dataSaida, setDataSaida] = useState('')
  const [horaSaida, setHoraSaida] = useState('')
  const [dataChegada, setDataChegada] = useState('')
  const [horaChegada, setHoraChegada] = useState('')
  const [custoEstimado, setCustoEstimado] = useState('')
  const [responsavelPagamento, setResponsavelPagamento] = useState('MUNICIPIO')
  const [observacoes, setObservacoes] = useState('')
  const [veiculoId, setVeiculoId] = useState('')
  const [motoristaId, setMotoristaId] = useState('')
  const [origemAtalhoReset, setOrigemAtalhoReset] = useState(0)
  const [destinoAtalhoReset, setDestinoAtalhoReset] = useState(0)

  const [motoristas, setMotoristas] = useState<TfdMotoristaAgendamentoItem[]>([])
  const [loadingMotoristas, setLoadingMotoristas] = useState(false)
  const [motoristasError, setMotoristasError] = useState<string | null>(null)

  const isTerrestreProprio = tipoSegmento === 'TERRESTRE_PROPRIO'

  const prestadorAtalhos = prestadores.map((p) => ({
    value: p.id,
    label: `${p.nome} (${p.cidade}/${p.estado})`,
  }))

  const veiculoOptions = veiculos.map((v) => ({
    value: v.id,
    label: `${v.placa} — ${v.modelo} (${v.capacidadePassageiros} lugares)`,
  }))

  const motoristaOptions = motoristas.map((m) => ({
    value: m.id,
    label: `${m.nome} — CNH ${formatCnhCategorias(m.cnhCategoria)} (válida até ${m.cnhValidade})`,
  }))

  const motoristaSelecionado = motoristas.find((m) => m.id === motoristaId)

  useEffect(() => {
    if (!isTerrestreProprio || !dataSaida) {
      setMotoristas([])
      setMotoristaId('')
      setMotoristasError(null)
      return
    }

    let cancelled = false
    setLoadingMotoristas(true)
    setMotoristasError(null)
    setMotoristaId('')

    void listarMotoristasAgendamentoTfd({ dataViagem: dataSaida }).then((result) => {
      if (cancelled) {
        return
      }
      setLoadingMotoristas(false)

      if (!result.success) {
        setMotoristas([])
        setMotoristasError(result.error ?? 'Não foi possível carregar os motoristas.')
        return
      }

      setMotoristas(result.data)
      if (result.data.length === 0) {
        setMotoristasError('Nenhum motorista disponível com CNH válida nesta data.')
      }
    })

    return () => {
      cancelled = true
    }
  }, [dataSaida, isTerrestreProprio])

  function aplicarPrestadorOrigem(prestadorId: string) {
    const prestador = prestadores.find((p) => p.id === prestadorId)
    if (prestador) {
      setOrigemDescricao(`${prestador.nome} — ${prestador.cidade}/${prestador.estado}`)
    }
  }

  function aplicarPrestadorDestino(prestadorId: string) {
    const prestador = prestadores.find((p) => p.id === prestadorId)
    if (prestador) {
      setDestinoDescricao(`${prestador.nome} — ${prestador.cidade}/${prestador.estado}`)
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setServerError(null)

    if (!origemDescricao.trim() || !destinoDescricao.trim()) {
      setServerError('Informe origem e destino.')
      return
    }

    if (!dataSaida) {
      setServerError('Informe a data de saída.')
      return
    }

    if (isTerrestreProprio && (!veiculoId || !motoristaId)) {
      setServerError('Selecione veículo e motorista para transporte terrestre próprio.')
      return
    }

    const custo = custoEstimado.trim()
      ? Number.parseFloat(custoEstimado.replace(',', '.'))
      : undefined

    if (custo !== undefined && (!Number.isFinite(custo) || custo <= 0)) {
      setServerError('Informe um custo estimado válido.')
      return
    }

    startTransition(async () => {
      const result = await criarSegmentoTransporte({
        ...(agendamentoId ? { agendamentoId } : {}),
        ...(viagemId ? { viagemId } : {}),
        tipoSegmento: tipoSegmento as
          | 'TERRESTRE_PROPRIO'
          | 'TERRESTRE_TERCEIRO'
          | 'AEREO'
          | 'FLUVIAL'
          | 'OUTRO',
        origemDescricao: origemDescricao.trim(),
        destinoDescricao: destinoDescricao.trim(),
        dataSaida,
        horaSaida: horaSaida.trim() || undefined,
        dataChegada: dataChegada.trim() || undefined,
        horaChegada: horaChegada.trim() || undefined,
        custoEstimado: custo,
        responsavelPagamento: responsavelPagamento as 'MUNICIPIO' | 'PACIENTE_REEMBOLSO',
        observacoes: observacoes.trim() || undefined,
        veiculoId: isTerrestreProprio ? veiculoId : undefined,
        motoristaId: isTerrestreProprio ? motoristaId : undefined,
      })

      if (!result.success) {
        setServerError(result.error ?? 'Não foi possível criar o segmento.')
        return
      }

      router.push(successRedirectPath)
      router.refresh()
    })
  }

  return (
    <Card>
      <form onSubmit={handleSubmit} className="flex flex-col gap-[var(--space-4)]">
        <Select
          label="Tipo do segmento"
          value={tipoSegmento}
          onValueChange={setTipoSegmento}
          options={[...TIPO_SEGMENTO_OPTIONS]}
          disabled={isPending}
        />

        {prestadores.length > 0 ? (
          <div className="grid gap-[var(--space-3)] sm:grid-cols-2">
            <Combobox
              key={`origem-atalho-${origemAtalhoReset}`}
              label="Atalho origem (prestador)"
              value=""
              onChange={(prestadorId) => {
                aplicarPrestadorOrigem(prestadorId)
                setOrigemAtalhoReset((current) => current + 1)
              }}
              options={prestadorAtalhos}
              placeholder="Buscar prestador…"
              disabled={isPending}
            />
            <Combobox
              key={`destino-atalho-${destinoAtalhoReset}`}
              label="Atalho destino (prestador)"
              value=""
              onChange={(prestadorId) => {
                aplicarPrestadorDestino(prestadorId)
                setDestinoAtalhoReset((current) => current + 1)
              }}
              options={prestadorAtalhos}
              placeholder="Buscar prestador…"
              disabled={isPending}
            />
          </div>
        ) : null}

        <Input
          label="Origem"
          value={origemDescricao}
          onChange={(event) => setOrigemDescricao(event.target.value)}
          disabled={isPending}
          required
        />

        <Input
          label="Destino"
          value={destinoDescricao}
          onChange={(event) => setDestinoDescricao(event.target.value)}
          disabled={isPending}
          required
        />

        <div className="grid gap-[var(--space-4)] sm:grid-cols-2">
          <Input
            label="Data de saída"
            type="date"
            value={dataSaida}
            onChange={(event) => setDataSaida(event.target.value)}
            disabled={isPending}
            required
          />
          <Input
            label="Hora de saída (opcional)"
            type="time"
            value={horaSaida}
            onChange={(event) => setHoraSaida(event.target.value)}
            disabled={isPending}
          />
          <Input
            label="Data de chegada (opcional)"
            type="date"
            value={dataChegada}
            onChange={(event) => setDataChegada(event.target.value)}
            disabled={isPending}
          />
          <Input
            label="Hora de chegada (opcional)"
            type="time"
            value={horaChegada}
            onChange={(event) => setHoraChegada(event.target.value)}
            disabled={isPending}
          />
        </div>

        <Input
          label="Custo estimado (R$, opcional)"
          type="text"
          inputMode="decimal"
          value={custoEstimado}
          onChange={(event) => setCustoEstimado(event.target.value)}
          disabled={isPending}
          placeholder="0,00"
        />

        <Select
          label="Responsável pelo pagamento"
          value={responsavelPagamento}
          onValueChange={setResponsavelPagamento}
          options={[...RESPONSAVEL_OPTIONS]}
          disabled={isPending}
        />

        {isTerrestreProprio ? (
          <>
            <Combobox
              label="Veículo"
              value={veiculoId}
              onChange={setVeiculoId}
              options={veiculoOptions}
              disabled={isPending || veiculoOptions.length === 0}
              placeholder={
                veiculoOptions.length === 0
                  ? 'Nenhum veículo com capacidade adequada'
                  : 'Selecione o veículo'
              }
            />

            <Combobox
              label="Motorista"
              value={motoristaId}
              onChange={setMotoristaId}
              options={motoristaOptions}
              loading={loadingMotoristas}
              disabled={isPending || loadingMotoristas || !dataSaida}
              placeholder={
                !dataSaida
                  ? 'Informe a data de saída primeiro'
                  : loadingMotoristas
                    ? 'Carregando…'
                    : 'Selecione o motorista'
              }
            />

            {motoristasError ? (
              <Alert variant="warning" role="status">
                {motoristasError}
              </Alert>
            ) : null}

            {motoristaSelecionado && isCnhVencendoEmBreve(motoristaSelecionado.cnhValidade) ? (
              <Alert variant="warning" role="status">
                A CNH do motorista {motoristaSelecionado.nome} vence em até 30 dias (
                {motoristaSelecionado.cnhValidade}).
              </Alert>
            ) : null}
          </>
        ) : null}

        <Textarea
          label="Observações (opcional)"
          value={observacoes}
          onChange={(event) => setObservacoes(event.target.value)}
          rows={3}
          disabled={isPending}
        />

        {serverError ? <ServerError message={serverError} /> : null}

        <PermissionGate session={session} permission={TFD_PERMISSIONS.GERENCIAR_TRANSPORTE}>
          <Button type="submit" variant="primary" disabled={isPending}>
            {isPending ? (
              <>
                <Spinner className="mr-[var(--space-2)] size-4" />
                Salvando…
              </>
            ) : (
              'Criar segmento'
            )}
          </Button>
        </PermissionGate>
      </form>
    </Card>
  )
}
