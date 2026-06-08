'use client'

import { TfdSolicitacaoDetalhe } from '@saude/mod-saude-tfd/client'
import { anexarDocumentosSolicitacaoTfd } from '@saude/mod-saude-tfd/actions/solicitacao'
import { Alert, Card, CardHeader, EmptyState } from '@saude/ui'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'

import { SolicitacaoLaudoUpload } from '../../components/solicitacao-laudo-upload'
import { DocumentosAnexoDownload } from '../../processos/[id]/components/documentos-anexo-download'

const dateTimeFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

export interface SolicitacaoAnexosSectionProps {
  solicitacaoId: string
  processoId: string
  podeAnexar: boolean
  anexos: TfdSolicitacaoDetalhe['anexos']
}

export function SolicitacaoAnexosSection({
  solicitacaoId,
  processoId,
  podeAnexar,
  anexos,
}: SolicitacaoAnexosSectionProps) {
  const router = useRouter()
  const [isVinculando, setIsVinculando] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [uploadResetKey, setUploadResetKey] = useState(0)
  const vinculadosRef = useRef<Set<string>>(new Set(anexos.map((item) => item.id)))
  const vinculandoRef = useRef(false)
  const pendenteVinculoRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    vinculadosRef.current = new Set(anexos.map((item) => item.id))
  }, [anexos])

  const vincularDocumentos = useCallback(
    async (anexoIds: string[]) => {
      const novosIds = anexoIds.filter(
        (id) => !vinculadosRef.current.has(id) && !pendenteVinculoRef.current.has(id)
      )

      if (novosIds.length === 0 || !podeAnexar || vinculandoRef.current) {
        return
      }

      vinculandoRef.current = true
      novosIds.forEach((id) => pendenteVinculoRef.current.add(id))
      setIsVinculando(true)
      setServerError(null)
      setSuccessMessage(null)

      try {
        const response = await anexarDocumentosSolicitacaoTfd({
          solicitacaoId,
          anexoIds: novosIds,
        })

        if (!response.success) {
          novosIds.forEach((id) => pendenteVinculoRef.current.delete(id))
          setServerError(response.error)
          return
        }

        novosIds.forEach((id) => {
          vinculadosRef.current.add(id)
          pendenteVinculoRef.current.delete(id)
        })

        setUploadResetKey((key) => key + 1)
        setSuccessMessage(
          novosIds.length === 1
            ? 'Documento anexado à solicitação.'
            : `${novosIds.length} documentos anexados à solicitação.`
        )
        router.refresh()
      } finally {
        vinculandoRef.current = false
        setIsVinculando(false)
      }
    },
    [podeAnexar, solicitacaoId, router]
  )

  const handleUploadComplete = useCallback(
    (anexoIds: string[]) => {
      void vincularDocumentos(anexoIds)
    },
    [vincularDocumentos]
  )

  return (
    <Card
      header={
        <div>
          <CardHeader>Documentos da solicitação</CardHeader>
          <p className="mt-[var(--space-1)] text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
            Arquivos vinculados exclusivamente a esta solicitação.
          </p>
        </div>
      }
    >
      <div className="flex flex-col gap-[var(--space-4)]">
        {anexos.length > 0 ? (
          <ul className="divide-y divide-[var(--color-border)]">
            {anexos.map((anexo) => (
              <li
                key={anexo.id}
                className="flex flex-wrap items-center justify-between gap-[var(--space-3)] py-[var(--space-3)] first:pt-0 last:pb-0"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-[var(--color-text)]">
                    {anexo.nomeOriginal}
                  </p>
                  <p className="text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
                    {anexo.mimeType} · {dateTimeFormatter.format(new Date(anexo.createdAt))}
                  </p>
                </div>
                <DocumentosAnexoDownload anexoId={anexo.id} nomeOriginal={anexo.nomeOriginal} />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            titulo="Nenhum documento anexado"
            descricao="Envie laudos ou outros arquivos de apoio para consulta e análise desta solicitação."
          />
        )}

        {podeAnexar ? (
          <div className="border-t border-[var(--color-border)] pt-[var(--space-4)]">
            <SolicitacaoLaudoUpload
              key={uploadResetKey}
              processoId={processoId}
              disabled={isVinculando}
              onUploadComplete={handleUploadComplete}
              mensagemConcluido="Documento enviado. Vinculando à solicitação…"
            />
            {isVinculando ? (
              <p className="mt-[var(--space-2)] text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
                Vinculando documento à solicitação…
              </p>
            ) : null}
          </div>
        ) : null}

        {successMessage ? (
          <Alert variant="success" role="status">
            {successMessage}
          </Alert>
        ) : null}

        {serverError ? (
          <Alert variant="error" role="alert">
            {serverError}
          </Alert>
        ) : null}
      </div>
    </Card>
  )
}
