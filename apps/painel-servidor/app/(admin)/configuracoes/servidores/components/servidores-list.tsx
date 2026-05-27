'use client'

import { desativarServidor } from '../../../../../lib/actions/servidores'
import type { ServidorListItem } from '../../../../../lib/types/servidores.types'
import {
  Badge,
  Button,
  Card,
  Dialog,
  DialogContent,
  DialogFooter,
  EmptyState,
  Spinner,
} from '@saude/ui'
import { KeyRound, Pencil, Plus, Power, Users } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

interface ServidoresListProps {
  servidores: ServidorListItem[]
  incluirInativos: boolean
}

function roleLabel(role: ServidorListItem['role']) {
  if (role === 'ADMIN') return 'Administrador'
  if (role === 'GESTOR') return 'Gestor'
  return 'Servidor'
}

function formatSetores(setores: ServidorListItem['setores']) {
  if (setores.length === 0) {
    return '—'
  }
  return setores
    .map((s) => {
      const nome = s.setorSigla ? `${s.setorNome} (${s.setorSigla})` : s.setorNome
      return s.principal ? `${nome} (principal)` : nome
    })
    .join(', ')
}

export function ServidoresList({ servidores, incluirInativos }: ServidoresListProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [deactivateTarget, setDeactivateTarget] = useState<ServidorListItem | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  function confirmDeactivate() {
    if (!deactivateTarget) {
      return
    }

    setActionError(null)
    startTransition(async () => {
      const res = await desativarServidor({ id: deactivateTarget.id })
      if (!res.success) {
        setActionError(res.error)
        return
      }
      setDeactivateTarget(null)
      router.refresh()
    })
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-[var(--space-4)]">
        <Button asChild variant="primary">
          <Link href="/configuracoes/servidores/novo">
            <Plus className="size-4" aria-hidden="true" />
            Novo servidor
          </Link>
        </Button>
        <Button asChild variant="secondary" className="min-h-0 min-w-0 py-[var(--space-1)]">
          <Link
            href={
              incluirInativos
                ? '/configuracoes/servidores'
                : '/configuracoes/servidores?inativos=1'
            }
          >
            {incluirInativos ? 'Ocultar inativos' : 'Mostrar inativos'}
          </Link>
        </Button>
      </div>

      {servidores.length === 0 ? (
        <EmptyState
          icon={<Users className="size-10" aria-hidden="true" />}
          titulo="Nenhum servidor cadastrado"
          descricao="Cadastre gestores e servidores vinculados aos setores do organograma."
          cta={
            <Button asChild variant="primary">
              <Link href="/configuracoes/servidores/novo">Cadastrar servidor</Link>
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-[var(--space-3)]">
          {servidores.map((servidor) => (
            <Card key={servidor.id} className="p-[var(--space-4)]">
              <div className="flex flex-col gap-[var(--space-3)] sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 flex-1 flex-col gap-[var(--space-2)]">
                  <div className="flex flex-wrap items-center gap-[var(--space-2)]">
                    <h3 className="text-[length:var(--text-base)] font-semibold text-[var(--color-text)]">
                      {servidor.name}
                    </h3>
                    <Badge variant={servidor.active ? 'green' : 'gray'}>
                      {servidor.active ? 'Ativo' : 'Inativo'}
                    </Badge>
                    <Badge variant="blue">{roleLabel(servidor.role)}</Badge>
                  </div>
                  <p className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
                    {servidor.email} · CPF {servidor.cpfMascarado}
                    {servidor.matricula ? ` · Mat. ${servidor.matricula}` : ''}
                  </p>
                  <p className="text-[length:var(--text-sm)] text-[var(--color-text)]">
                    <span className="font-medium">Setores:</span> {formatSetores(servidor.setores)}
                  </p>
                </div>
                <div className="flex shrink-0 gap-[var(--space-2)]">
                  <Button asChild variant="secondary" className="min-h-0 min-w-0 py-[var(--space-1)]">
                    <Link href={`/configuracoes/servidores/${servidor.id}`}>
                      <Pencil className="size-4" aria-hidden="true" />
                      Editar
                    </Link>
                  </Button>
                  {servidor.active && servidor.role !== 'ADMIN' ? (
                    <Button asChild variant="secondary" className="min-h-0 min-w-0 py-[var(--space-1)]">
                      <Link href={`/configuracoes/servidores/${servidor.id}/permissoes`}>
                        <KeyRound className="size-4" aria-hidden="true" />
                        Permissões
                      </Link>
                    </Button>
                  ) : null}
                  {servidor.active ? (
                    <Button
                      type="button"
                      variant="ghost"
                      className="min-h-0 min-w-0 py-[var(--space-1)]"
                      onClick={() => {
                        setActionError(null)
                        setDeactivateTarget(servidor)
                      }}
                    >
                      <Power className="size-4" aria-hidden="true" />
                      Desativar
                    </Button>
                  ) : null}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog
        open={deactivateTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeactivateTarget(null)
            setActionError(null)
          }
        }}
      >
        <DialogContent titulo="Desativar servidor">
          <p className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
            O usuário <strong>{deactivateTarget?.name}</strong> não poderá mais acessar o
            sistema. Os dados são preservados (ativo = false).
          </p>
          {actionError ? (
            <p role="alert" className="text-[length:var(--text-sm)] text-[var(--color-error)]">
              {actionError}
            </p>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setDeactivateTarget(null)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={confirmDeactivate}
              disabled={isPending}
            >
              {isPending ? <Spinner className="size-4" /> : 'Desativar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
