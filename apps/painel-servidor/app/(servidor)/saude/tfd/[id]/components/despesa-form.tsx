'use client'

import { MIN_VALOR_COMPROVANTE, TFD_PERMISSIONS, type TfdViagemSolicitacaoItem } from '@saude/mod-saude-tfd/client'
import { registrarDespesa } from '@saude/mod-saude-tfd/actions/financeiro'
import type { SaudeMunicSession } from '@saude/core-auth/types/session'

import { Alert, Button, Input, Select, Spinner, Textarea } from '@saude/ui'
import { PermissionGate } from '@saude/ui/permission-gate'
import { useRouter } from 'next/navigation'
import { useMemo, useState, useTransition } from 'react'

import { DespesaComprovanteUpload } from './despesa-comprovante-upload'
import { EnviarPrestacaoAcao } from './enviar-prestacao-acao'

const TIPO_DESPESA_OPTIONS = [
  { value: 'TRANSPORTE', label: 'Transporte' },
  { value: 'ALIMENTACAO', label: 'Alimentação' },
  { value: 'HOSPEDAGEM', label: 'Hospedagem' },
  { value: 'OUTRO', label: 'Outro' },
] as const

const RESPONSAVEL_OPTIONS = [
  { value: 'MUNICIPIO', label: 'Município' },
  { value: 'PACIENTE_REEMBOLSO', label: 'Paciente (reembolso)' },
] as const

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

function ServerError({ message }: { message: string }) {
  return (
    <p className="text-[length:var(--text-sm)] text-[var(--color-danger)]" role="alert">
      {message}
    </p>
  )
}

export interface DespesaFormProps {
  session: SaudeMunicSession
  processoId: string
  viagens: TfdViagemSolicitacaoItem[]
}

export function DespesaForm({ session, processoId, viagens }: DespesaFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [serverError, setServerError] = useState<string | null>(null)

  const viagensElegiveis = useMemo(
    () =>
      viagens.filter(
        (viagem) =>
          viagem.status === 'REALIZADA' &&
          viagem.prestacao !== null &&
          (viagem.prestacao.status === 'PENDENTE' ||
            viagem.prestacao.status === 'REJEITADA')
      ),
    [viagens]
  )

  const [viagemId, setViagemId] = useState(viagensElegiveis[0]?.id ?? '')
  const [tipo, setTipo] = useState<string>('TRANSPORTE')
  const [descricao, setDescricao] = useState('')
  const [valor, setValor] = useState('')
  const [responsavelPagamento, setResponsavelPagamento] = useState('MUNICIPIO')
  const [comprovanteAnexoId, setComprovanteAnexoId] = useState<string | null>(null)
  const [uploadKey, setUploadKey] = useState(0)

  const viagemSelecionada = viagensElegiveis.find((v) => v.id === viagemId)
  const valorNumerico = Number.parseFloat(valor.replace(',', '.'))
  const exigeComprovante =
    Number.isFinite(valorNumerico) && valorNumerico >= MIN_VALOR_COMPROVANTE

  const viagemOptions = viagensElegiveis.map((viagem) => ({
    value: viagem.id,
    label: `Viagem ${viagem.sequencia}${
      viagem.prestacao?.status === 'REJEITADA' ? ' (correção)' : ''
    }`,
  }))

  if (viagensElegiveis.length === 0) {
    return null
  }

  function resetFormulario() {
    setDescricao('')
    setValor('')
    setComprovanteAnexoId(null)
    setUploadKey((key) => key + 1)
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setServerError(null)

    if (!viagemId) {
      setServerError('Selecione a viagem.')
      return
    }

    if (!Number.isFinite(valorNumerico) || valorNumerico <= 0) {
      setServerError('Informe um valor positivo.')
      return
    }

    if (exigeComprovante && !comprovanteAnexoId) {
      setServerError(
        `Comprovante obrigatório para valores iguais ou superiores a R$ ${MIN_VALOR_COMPROVANTE},00.`
      )
      return
    }

    startTransition(async () => {
      const result = await registrarDespesa({
        viagemId,
        tipo: tipo as 'TRANSPORTE' | 'ALIMENTACAO' | 'HOSPEDAGEM' | 'OUTRO',
        descricao: descricao.trim() || undefined,
        valor: valorNumerico,
        comprovanteAnexoId: comprovanteAnexoId ?? undefined,
        responsavelPagamento: responsavelPagamento as 'MUNICIPIO' | 'PACIENTE_REEMBOLSO',
      })

      if (!result.success) {
        setServerError(result.error ?? 'Não foi possível registrar a despesa.')
        return
      }

      resetFormulario()
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col border-t border-[var(--color-border)] pt-[var(--space-4)]">
      <PermissionGate session={session} permission={TFD_PERMISSIONS.REGISTRAR_DESPESA}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-[var(--space-4)]">
        <h3 className="text-[length:var(--text-sm)] font-semibold text-[var(--color-text)]">
          Lançar despesa
        </h3>

        {viagemSelecionada?.prestacao?.status === 'REJEITADA' &&
        viagemSelecionada.prestacao.observacoesGestor ? (
          <Alert variant="warning" role="status">
            Prestação rejeitada: {viagemSelecionada.prestacao.observacoesGestor}
          </Alert>
        ) : null}

        {viagensElegiveis.length > 1 ? (
          <Select
            label="Viagem"
            value={viagemId || undefined}
            onValueChange={setViagemId}
            options={viagemOptions}
            disabled={isPending}
          />
        ) : null}

        <Select
          label="Tipo de despesa"
          value={tipo}
          onValueChange={setTipo}
          options={[...TIPO_DESPESA_OPTIONS]}
          disabled={isPending}
        />

        <Textarea
          label="Descrição (opcional)"
          value={descricao}
          onChange={(event) => setDescricao(event.target.value)}
          rows={2}
          disabled={isPending}
        />

        <Input
          label="Valor (R$)"
          type="text"
          inputMode="decimal"
          value={valor}
          onChange={(event) => setValor(event.target.value)}
          disabled={isPending}
          placeholder="0,00"
        />

        {exigeComprovante ? (
          <Alert variant="warning" role="status">
            Valores a partir de {currencyFormatter.format(MIN_VALOR_COMPROVANTE)} exigem
            comprovante anexado (PDF, JPEG ou PNG, máx. 10 MB).
          </Alert>
        ) : null}

        <Select
          label="Responsável pelo pagamento"
          value={responsavelPagamento}
          onValueChange={setResponsavelPagamento}
          options={[...RESPONSAVEL_OPTIONS]}
          disabled={isPending}
        />

        <DespesaComprovanteUpload
          key={uploadKey}
          processoId={processoId}
          disabled={isPending}
          onUploadComplete={setComprovanteAnexoId}
          onUploadClear={() => setComprovanteAnexoId(null)}
        />

        <Button type="submit" variant="primary" disabled={isPending}>
          {isPending ? (
            <>
              <Spinner className="mr-[var(--space-2)] size-4" />
              Registrando…
            </>
          ) : (
            'Registrar despesa'
          )}
        </Button>

        {serverError ? <ServerError message={serverError} /> : null}
        </form>
      </PermissionGate>

      <EnviarPrestacaoAcao
        session={session}
        viagensElegiveis={viagensElegiveis}
        viagemId={viagemId}
        onViagemChange={setViagemId}
      />
    </div>
  )
}
