'use client'

import { salvarDadosClinicosTfd } from '@saude/mod-saude-tfd/actions/processo'
import type { TfdProcessoDadosClinicosOutput } from '@saude/mod-saude-tfd/client'
import type { SaudeMunicSession } from '@saude/core-auth/types/session'
import { TFD_PERMISSIONS } from '@saude/mod-saude-tfd/permissions'
import { Badge, Button, Textarea, formFieldsStackClassName } from '@saude/ui'
import { PermissionGate } from '@saude/ui/permission-gate'
import { useRouter } from 'next/navigation'
import { useMemo, useState, useTransition } from 'react'

import { SolicitacaoSecaoAccordion } from './solicitacao-secao-accordion'

function hasConteudoClinico(dados: TfdProcessoDadosClinicosOutput): boolean {
  return Boolean(
    dados.subjetivo?.trim() ||
      dados.objetivo?.trim() ||
      dados.avaliacao?.trim() ||
      dados.plano?.trim() ||
      dados.motivoQuadro?.trim() ||
      dados.observacao?.trim()
  )
}

export interface DadosClinicosSectionProps {
  session: SaudeMunicSession
  processoId: string
  dadosIniciais: TfdProcessoDadosClinicosOutput
}

export function DadosClinicosSection({
  session,
  processoId,
  dadosIniciais,
}: DadosClinicosSectionProps) {
  const router = useRouter()
  const [editando, setEditando] = useState(false)
  const [subjetivo, setSubjetivo] = useState(dadosIniciais.subjetivo ?? '')
  const [objetivo, setObjetivo] = useState(dadosIniciais.objetivo ?? '')
  const [avaliacao, setAvaliacao] = useState(dadosIniciais.avaliacao ?? '')
  const [plano, setPlano] = useState(dadosIniciais.plano ?? '')
  const [motivoQuadro, setMotivoQuadro] = useState(dadosIniciais.motivoQuadro ?? '')
  const [observacao, setObservacao] = useState(dadosIniciais.observacao ?? '')
  const [serverError, setServerError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const preenchido = useMemo(() => hasConteudoClinico(dadosIniciais), [dadosIniciais])
  const somenteLeitura = preenchido

  const atualizadoEm = dadosIniciais.updatedAt
    ? new Date(dadosIniciais.updatedAt).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null

  function iniciarPreenchimento() {
    setSubjetivo('')
    setObjetivo('')
    setAvaliacao('')
    setPlano('')
    setMotivoQuadro('')
    setObservacao('')
    setEditando(true)
    setServerError(null)
  }

  function handleSalvar() {
    setServerError(null)
    startTransition(async () => {
      const result = await salvarDadosClinicosTfd({
        processoId,
        subjetivo: subjetivo.trim() || undefined,
        objetivo: objetivo.trim() || undefined,
        avaliacao: avaliacao.trim() || undefined,
        plano: plano.trim() || undefined,
        motivoQuadro: motivoQuadro.trim() || undefined,
        observacao: observacao.trim() || undefined,
      })

      if (!result.success) {
        setServerError(result.error ?? 'Não foi possível salvar os dados clínicos.')
        return
      }

      setEditando(false)
      router.refresh()
    })
  }

  return (
    <SolicitacaoSecaoAccordion
      titulo="Dados clínicos (SOAP)"
      defaultOpen={preenchido}
      badge={
        preenchido ? (
          <Badge variant="green" size="sm">
            Preenchido
          </Badge>
        ) : (
          <Badge variant="gray" size="sm">
            Pendente
          </Badge>
        )
      }
      bodyClassName={formFieldsStackClassName()}
    >
      <div className="flex flex-col gap-[var(--space-4)]">
          {preenchido ? (
            <div className="flex flex-col gap-[var(--space-2)] text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
              <p>
                Última atualização
                {atualizadoEm ? `: ${atualizadoEm}` : ''}
                {dadosIniciais.registradoPorNome
                  ? ` — por ${dadosIniciais.registradoPorNome}`
                  : ''}
                .
              </p>
            </div>
          ) : (
            <p className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
              Não preenchido
            </p>
          )}

          {somenteLeitura && !editando ? (
            <dl className="grid gap-[var(--space-3)] text-[length:var(--text-sm)]">
              {dadosIniciais.subjetivo ? (
                <div>
                  <dt className="font-medium text-[var(--color-text)]">Subjetivo</dt>
                  <dd className="mt-1 whitespace-pre-wrap text-[var(--color-text-muted)]">
                    {dadosIniciais.subjetivo}
                  </dd>
                </div>
              ) : null}
              {dadosIniciais.objetivo ? (
                <div>
                  <dt className="font-medium text-[var(--color-text)]">Objetivo</dt>
                  <dd className="mt-1 whitespace-pre-wrap text-[var(--color-text-muted)]">
                    {dadosIniciais.objetivo}
                  </dd>
                </div>
              ) : null}
              {dadosIniciais.avaliacao ? (
                <div>
                  <dt className="font-medium text-[var(--color-text)]">Avaliação</dt>
                  <dd className="mt-1 whitespace-pre-wrap text-[var(--color-text-muted)]">
                    {dadosIniciais.avaliacao}
                  </dd>
                </div>
              ) : null}
              {dadosIniciais.plano ? (
                <div>
                  <dt className="font-medium text-[var(--color-text)]">Plano</dt>
                  <dd className="mt-1 whitespace-pre-wrap text-[var(--color-text-muted)]">
                    {dadosIniciais.plano}
                  </dd>
                </div>
              ) : null}
              {dadosIniciais.motivoQuadro ? (
                <div>
                  <dt className="font-medium text-[var(--color-text)]">Motivo / quadro</dt>
                  <dd className="mt-1 whitespace-pre-wrap text-[var(--color-text-muted)]">
                    {dadosIniciais.motivoQuadro}
                  </dd>
                </div>
              ) : null}
              {dadosIniciais.observacao ? (
                <div>
                  <dt className="font-medium text-[var(--color-text)]">Observação</dt>
                  <dd className="mt-1 whitespace-pre-wrap text-[var(--color-text-muted)]">
                    {dadosIniciais.observacao}
                  </dd>
                </div>
              ) : null}
            </dl>
          ) : null}

          {editando ? (
            <div className="flex flex-col gap-[var(--space-3)]">
              <Textarea
                id="soap-subjetivo"
                label="Subjetivo"
                value={subjetivo}
                onChange={(event) => setSubjetivo(event.target.value)}
                disabled={isPending}
                rows={3}
              />
              <Textarea
                id="soap-objetivo"
                label="Objetivo"
                value={objetivo}
                onChange={(event) => setObjetivo(event.target.value)}
                disabled={isPending}
                rows={3}
              />
              <Textarea
                id="soap-avaliacao"
                label="Avaliação"
                value={avaliacao}
                onChange={(event) => setAvaliacao(event.target.value)}
                disabled={isPending}
                rows={3}
              />
              <Textarea
                id="soap-plano"
                label="Plano"
                value={plano}
                onChange={(event) => setPlano(event.target.value)}
                disabled={isPending}
                rows={3}
              />
              <Textarea
                id="soap-motivo"
                label="Motivo / quadro clínico"
                value={motivoQuadro}
                onChange={(event) => setMotivoQuadro(event.target.value)}
                disabled={isPending}
                rows={3}
              />
              <Textarea
                id="soap-observacao"
                label="Observação"
                value={observacao}
                onChange={(event) => setObservacao(event.target.value)}
                disabled={isPending}
                rows={2}
              />

              {serverError ? (
                <p role="alert" className="text-[length:var(--text-sm)] text-[var(--color-error)]">
                  {serverError}
                </p>
              ) : null}

              <div className="flex flex-wrap gap-[var(--space-2)]">
                <Button
                  type="button"
                  variant="primary"
                  onClick={handleSalvar}
                  loading={isPending}
                >
                  Salvar dados clínicos
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setEditando(false)
                    setServerError(null)
                  }}
                  disabled={isPending}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          ) : !somenteLeitura ? (
            <PermissionGate session={session} permission={TFD_PERMISSIONS.REGISTRAR_DADOS_CLINICOS}>
              <Button type="button" variant="secondary" onClick={iniciarPreenchimento}>
                Preencher dados clínicos
              </Button>
            </PermissionGate>
          ) : null}
      </div>
    </SolicitacaoSecaoAccordion>
  )
}
