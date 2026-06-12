'use client'

import { criarSegmentoTransporte } from '@saude/mod-saude-tfd/actions/transporte'
import { TFD_PERMISSIONS } from '@saude/mod-saude-tfd/permissions'
import type { SaudeMunicSession } from '@saude/core-auth/types/session'
import {
  Alert,
  Button,
  Card,
  Input,
  Select,
  Spinner,
  Textarea,
  formFieldsGridClassName,
  formFieldsStackClassName,
} from '@saude/ui'
import { PermissionGate } from '@saude/ui/permission-gate'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

import { LocalEnderecoAutocomplete } from '../../../../../../../viagens/nova/components/local-endereco-autocomplete'
import { TIPO_SEGMENTO_CONFIG } from '../../../components/transporte-constants'

const TIPO_SEGMENTO_OPTIONS = Object.entries(TIPO_SEGMENTO_CONFIG).map(([value, config]) => ({
  value,
  label: `${config.emoji} ${config.label}`,
}))

function ServerError({ message }: { message: string }) {
  return (
    <p className="text-[length:var(--text-sm)] text-[var(--color-danger)]" role="alert">
      {message}
    </p>
  )
}

export interface SegmentoTransporteFormProps {
  session: SaudeMunicSession
  agendamentoId?: string
  viagemId?: string
  processoId?: string
  successRedirectPath: string
  viagemVeiculo?: { id: string; placa: string; modelo: string } | null
  viagemMotorista?: { id: string; nome: string } | null
}

export function SegmentoTransporteForm({
  session,
  agendamentoId,
  viagemId,
  successRedirectPath,
  viagemVeiculo,
  viagemMotorista,
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
  const [observacoes, setObservacoes] = useState('')

  const isTerrestreProprio = tipoSegmento === 'TERRESTRE_PROPRIO'
  const isAereo = tipoSegmento === 'AEREO'
  const viagemTemFrota = Boolean(viagemVeiculo?.id && viagemMotorista?.id)

  function renderInfoVeiculoMotorista() {
    if (!isTerrestreProprio) {
      return null
    }

    if (viagemId) {
      if (viagemTemFrota) {
        return (
          // BLOCO-3: veículo e motorista herdados da viagem
          <p className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
            Veículo e motorista herdados da viagem: {viagemVeiculo!.placa} —{' '}
            {viagemVeiculo!.modelo} / {viagemMotorista!.nome}
          </p>
        )
      }

      return (
        <Alert variant="warning" role="status">
          Defina o veículo e motorista na viagem antes de criar segmentos terrestres.
        </Alert>
      )
    }

    return (
      <Alert variant="info" role="status">
        Transporte terrestre próprio em agendamentos avulsos deve ser criado pela Viagem TFD. Use o
        botão acima ou escolha outro tipo de segmento.
      </Alert>
    )
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setServerError(null)

    if (!origemDescricao.trim() || !destinoDescricao.trim()) {
      setServerError('Informe origem/local e destino/local.')
      return
    }

    if (!dataSaida) {
      setServerError('Informe a data de saída.')
      return
    }

    let veiculoId: string | undefined
    let motoristaId: string | undefined

    if (isTerrestreProprio) {
      if (viagemId) {
        if (!viagemVeiculo?.id || !viagemMotorista?.id) {
          setServerError('Defina o veículo e motorista na viagem antes de criar segmentos terrestres.')
          return
        }
        veiculoId = viagemVeiculo.id
        motoristaId = viagemMotorista.id
      } else {
        setServerError(
          'Transporte terrestre próprio deve ser criado pela Viagem TFD. Escolha outro tipo de segmento.'
        )
        return
      }
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
        responsavelPagamento: 'MUNICIPIO', // BLOCO-3: sempre município na UI
        observacoes: observacoes.trim() || undefined,
        veiculoId,
        motoristaId,
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
      <form onSubmit={handleSubmit} className={formFieldsStackClassName()}>
        {/* BLOCO-3: instrução no topo do formulário de segmento */}
        <p className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
          Um segmento representa um trecho da viagem. Para a maioria das viagens municipais, um
          único segmento é suficiente. Use múltiplos segmentos apenas quando houver mudança de modal
          de transporte (ex: van até o aeroporto + voo até o destino).
        </p>

        <Select
          label="Tipo do segmento"
          value={tipoSegmento}
          onValueChange={setTipoSegmento}
          options={[...TIPO_SEGMENTO_OPTIONS]}
          disabled={isPending}
        />

        <div className={formFieldsGridClassName()}>
          <LocalEnderecoAutocomplete
            id="segmento-origem"
            label="Origem / Local"
            placeholder="Ex: Rua das Flores, 100 — Campo Grande, MS"
            value={origemDescricao}
            onChange={setOrigemDescricao}
            required
            disabled={isPending}
          />
          <LocalEnderecoAutocomplete
            id="segmento-destino"
            label="Destino / Local"
            placeholder="Ex: Hospital das Clínicas — São Paulo, SP"
            value={destinoDescricao}
            onChange={setDestinoDescricao}
            required
            disabled={isPending}
          />
        </div>

        <div className={formFieldsGridClassName()}>
          <Input
            label="Data de saída"
            type="date"
            value={dataSaida}
            onChange={(event) => setDataSaida(event.target.value)}
            disabled={isPending}
            required
          />
          <Input
            label="Hora de saída"
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

        {/* BLOCO-3: custo estimado removido — registrado na PC */}
        <p className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
          O custo deste trecho será registrado na Prestação de Contas após a conclusão da viagem.
        </p>

        {renderInfoVeiculoMotorista()}

        {isAereo ? (
          // BLOCO-3: instrução para segmento aéreo
          <p className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
            Anexe o comprovante da passagem na Prestação de Contas após a viagem.
          </p>
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
