'use client'

import {
  criarAgendamentoTfd,
  listarMotoristasAgendamentoTfd,
  type TfdMotoristaAgendamentoItem,
  type TfdVeiculoAgendamentoItem,
} from '@saude/mod-saude-tfd'
import { Button, Input, Select, Spinner, Textarea } from '@saude/ui'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'

export interface AgendamentoFormProps {
  solicitacaoId: string
  veiculos: TfdVeiculoAgendamentoItem[]
  /** Título do bloco (primeira viagem vs. viagem adicional). */
  titulo?: string
}

function ServerError({ message }: { message: string }) {
  return (
    <p className="text-[length:var(--text-sm)] text-[var(--color-danger)]" role="alert">
      {message}
    </p>
  )
}

export function AgendamentoForm({
  solicitacaoId,
  veiculos,
  titulo = 'Agendar viagem',
}: AgendamentoFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [serverError, setServerError] = useState<string | null>(null)

  const [dataViagem, setDataViagem] = useState('')
  const [horaSaida, setHoraSaida] = useState('')
  const [motoristaId, setMotoristaId] = useState('')
  const [veiculoId, setVeiculoId] = useState('')
  const [observacoes, setObservacoes] = useState('')

  const [motoristas, setMotoristas] = useState<TfdMotoristaAgendamentoItem[]>([])
  const [loadingMotoristas, setLoadingMotoristas] = useState(false)
  const [motoristasError, setMotoristasError] = useState<string | null>(null)

  const veiculoOptions = veiculos.map((veiculo) => ({
    value: veiculo.id,
    label: `${veiculo.placa} — ${veiculo.modelo} (${veiculo.capacidadePassageiros} lugares)`,
  }))

  const motoristaOptions = motoristas.map((motorista) => ({
    value: motorista.id,
    label: `${motorista.nome} — CNH ${motorista.cnhCategoria} (válida até ${motorista.cnhValidade})`,
  }))

  useEffect(() => {
    if (!dataViagem) {
      setMotoristas([])
      setMotoristaId('')
      setMotoristasError(null)
      return
    }

    let cancelled = false
    setLoadingMotoristas(true)
    setMotoristasError(null)
    setMotoristaId('')

    void listarMotoristasAgendamentoTfd({ dataViagem }).then((result) => {
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
  }, [dataViagem])

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setServerError(null)

    if (!dataViagem) {
      setServerError('Informe a data da viagem.')
      return
    }
    if (!motoristaId) {
      setServerError('Selecione o motorista.')
      return
    }
    if (!veiculoId) {
      setServerError('Selecione o veículo.')
      return
    }

    startTransition(async () => {
      const result = await criarAgendamentoTfd({
        solicitacaoId,
        dataViagem,
        horaSaida: horaSaida.trim() || undefined,
        motoristaId,
        veiculoId,
        observacoes: observacoes.trim() || undefined,
      })

      if (!result.success) {
        setServerError(result.error ?? 'Não foi possível registrar o agendamento.')
        return
      }

      setDataViagem('')
      setHoraSaida('')
      setMotoristaId('')
      setVeiculoId('')
      setObservacoes('')
      router.refresh()
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-[var(--space-3)]">
      <h3 className="text-[length:var(--text-sm)] font-semibold text-[var(--color-text)]">
        {titulo}
      </h3>

      <Input
        label="Data da viagem"
        type="date"
        value={dataViagem}
        onChange={(event) => setDataViagem(event.target.value)}
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

      <Select
        label="Motorista"
        value={motoristaId || undefined}
        placeholder={
          !dataViagem
            ? 'Informe a data da viagem'
            : loadingMotoristas
              ? 'Carregando motoristas…'
              : 'Selecione o motorista'
        }
        options={motoristaOptions}
        onValueChange={setMotoristaId}
        disabled={isPending || !dataViagem || loadingMotoristas || motoristas.length === 0}
        required
      />
      {motoristasError ? (
        <p className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]" role="status">
          {motoristasError}
        </p>
      ) : null}

      <Select
        label="Veículo"
        value={veiculoId || undefined}
        placeholder={veiculoOptions.length > 0 ? 'Selecione o veículo' : 'Nenhum veículo disponível'}
        options={veiculoOptions}
        onValueChange={setVeiculoId}
        disabled={isPending || veiculoOptions.length === 0}
        required
      />

      <Textarea
        label="Observações (opcional)"
        value={observacoes}
        onChange={(event) => setObservacoes(event.target.value)}
        rows={3}
        disabled={isPending}
        hint="Máximo de 500 caracteres."
      />

      <Button type="submit" variant="primary" disabled={isPending}>
        {isPending ? (
          <>
            <Spinner className="mr-[var(--space-2)] size-4" />
            Agendando…
          </>
        ) : (
          'Confirmar agendamento'
        )}
      </Button>

      {serverError ? <ServerError message={serverError} /> : null}
    </form>
  )
}
