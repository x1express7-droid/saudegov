'use client'

import {
  atualizarDepartamento,
  atualizarSetor,
  criarDepartamento,
  criarSetor,
  desativarDepartamento,
  desativarSetor,
} from '../../../../../lib/actions/organograma'
import type {
  DepartamentoListItem,
  SecretariaSaudeItem,
  SetorListItem,
} from '../../../../../lib/types/organograma.types'
import { Badge, Button, Card, EmptyState, cn } from '@saude/ui'
import { Building2, ChevronDown, ChevronRight, Pencil, Plus, Power } from 'lucide-react'
import { useMemo, useState } from 'react'
import { DeactivateDialog } from './deactivate-dialog'
import { EntityFormDialog, type EntityFormValues, type EntityKind } from './entity-form-dialog'

interface OrganogramaViewProps {
  secretaria: SecretariaSaudeItem
  departamentos: DepartamentoListItem[]
  setores: SetorListItem[]
}

type DialogState =
  | { kind: 'form'; entity: EntityKind; mode: 'create' | 'edit'; targetId?: string; parentId?: string }
  | { kind: 'deactivate'; entity: EntityKind; targetId: string; nome: string }
  | null

function statusBadge(ativo: boolean) {
  return <Badge variant={ativo ? 'green' : 'gray'}>{ativo ? 'Ativo' : 'Inativo'}</Badge>
}

export function OrganogramaView({
  secretaria,
  departamentos,
  setores,
}: OrganogramaViewProps) {
  const [dialog, setDialog] = useState<DialogState>(null)
  const [expandedDepartamentos, setExpandedDepartamentos] = useState<Set<string>>(
    () => new Set(departamentos.filter((d) => d.ativo).map((d) => d.id))
  )

  const setoresPorDepartamento = useMemo(() => {
    const map = new Map<string, SetorListItem[]>()
    for (const setor of setores) {
      const list = map.get(setor.departamentoId) ?? []
      list.push(setor)
      map.set(setor.departamentoId, list)
    }
    return map
  }, [setores])

  function toggleDepartamento(id: string) {
    setExpandedDepartamentos((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  function openCreate(entity: EntityKind, parentId?: string) {
    setDialog({ kind: 'form', entity, mode: 'create', parentId })
  }

  function openEdit(entity: EntityKind, targetId: string) {
    setDialog({ kind: 'form', entity, mode: 'edit', targetId })
  }

  function openDeactivate(entity: EntityKind, targetId: string, nome: string) {
    setDialog({ kind: 'deactivate', entity, targetId, nome })
  }

  function closeDialog() {
    setDialog(null)
  }

  async function handleFormSubmit(values: EntityFormValues): Promise<{
    success: boolean
    error?: string
  }> {
    if (!dialog || dialog.kind !== 'form') {
      return { success: false, error: 'Estado inválido.' }
    }

    if (dialog.mode === 'create') {
      if (dialog.entity === 'departamento') {
        const res = await criarDepartamento({ nome: values.nome, sigla: values.sigla })
        return res.success ? { success: true } : { success: false, error: res.error }
      }
      const res = await criarSetor({
        nome: values.nome,
        sigla: values.sigla,
        departamentoId: values.parentId ?? dialog.parentId ?? '',
        emailSetor: values.emailSetor,
      })
      return res.success ? { success: true } : { success: false, error: res.error }
    }

    const id = dialog.targetId
    if (!id) {
      return { success: false, error: 'Registro não identificado.' }
    }

    if (dialog.entity === 'departamento') {
      const res = await atualizarDepartamento({ id, nome: values.nome, sigla: values.sigla })
      return res.success ? { success: true } : { success: false, error: res.error }
    }
    const res = await atualizarSetor({
      id,
      nome: values.nome,
      sigla: values.sigla,
      emailSetor: values.emailSetor,
    })
    return res.success ? { success: true } : { success: false, error: res.error }
  }

  async function handleDeactivate(): Promise<{ success: boolean; error?: string }> {
    if (!dialog || dialog.kind !== 'deactivate') {
      return { success: false, error: 'Estado inválido.' }
    }

    const { entity, targetId } = dialog
    if (entity === 'departamento') {
      const res = await desativarDepartamento({ id: targetId })
      return res.success ? { success: true } : { success: false, error: res.error }
    }
    const res = await desativarSetor({ id: targetId })
    return res.success ? { success: true } : { success: false, error: res.error }
  }

  const formDialogOpen = dialog?.kind === 'form'
  const deactivateDialogOpen = dialog?.kind === 'deactivate'

  let formInitial: EntityFormValues | undefined
  let parentOptions: { value: string; label: string }[] = []

  if (formDialogOpen && dialog.kind === 'form') {
    if (dialog.mode === 'edit' && dialog.targetId) {
      if (dialog.entity === 'departamento') {
        const row = departamentos.find((d) => d.id === dialog.targetId)
        formInitial = row ? { nome: row.nome, sigla: row.sigla ?? '' } : undefined
      } else {
        const row = setores.find((s) => s.id === dialog.targetId)
        formInitial = row
          ? {
              nome: row.nome,
              sigla: row.sigla ?? '',
              emailSetor: row.emailSetor ?? '',
              parentId: row.departamentoId,
            }
          : undefined
      }
    } else if (dialog.mode === 'create') {
      if (dialog.entity === 'setor') {
        parentOptions = departamentos
          .filter((d) => d.ativo)
          .map((d) => ({
            value: d.id,
            label: d.sigla ? `${d.nome} (${d.sigla})` : d.nome,
          }))
        formInitial = { nome: '', sigla: '', parentId: dialog.parentId ?? parentOptions[0]?.value }
      } else {
        formInitial = { nome: '', sigla: '' }
      }
    }
  }

  return (
    <div className="flex flex-col gap-[var(--space-6)]">
      <Card
        header={
          <div className="flex flex-wrap items-center gap-[var(--space-3)]">
            <Building2 className="size-5 shrink-0 text-[var(--color-primary)]" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="text-[length:var(--text-sm)] font-medium text-[var(--color-text-muted)]">
                Sistema de Saúde (fixo)
              </p>
              <p className="font-semibold text-[var(--color-text)]">{secretaria.nome}</p>
              {secretaria.sigla ? (
                <p className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
                  {secretaria.sigla}
                </p>
              ) : null}
            </div>
            {statusBadge(secretaria.ativa)}
          </div>
        }
      >
        <p className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
          A Secretaria Municipal de Saúde é única por município e não pode ser alterada aqui.
          Configure abaixo os departamentos e setores do organograma.
        </p>
      </Card>

      <div className="flex flex-wrap items-center justify-end gap-[var(--space-2)]">
        <Button type="button" onClick={() => openCreate('departamento')}>
          <Plus className="size-4" aria-hidden="true" />
          Novo departamento
        </Button>
      </div>

      {departamentos.length === 0 ? (
        <EmptyState
          icon={<Building2 className="size-10" aria-hidden="true" />}
          titulo="Nenhum departamento cadastrado"
          descricao="Crie o primeiro departamento da secretaria de saúde e, em seguida, os setores."
          cta={
            <Button type="button" onClick={() => openCreate('departamento')}>
              <Plus className="size-4" aria-hidden="true" />
              Novo departamento
            </Button>
          }
        />
      ) : (
        <ul className="flex flex-col gap-[var(--space-3)]">
          {departamentos.map((dep) => {
            const setoresDep = setoresPorDepartamento.get(dep.id) ?? []
            const depExpanded = expandedDepartamentos.has(dep.id)

            return (
              <li
                key={dep.id}
                className={cn(
                  'rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)]',
                  !dep.ativo && 'opacity-70'
                )}
              >
                <div className="flex flex-wrap items-center justify-between gap-[var(--space-2)] p-[var(--space-4)]">
                  <div className="flex min-w-0 items-center gap-[var(--space-2)]">
                    <button
                      type="button"
                      className="rounded-[var(--radius)] p-1 text-[var(--color-text-muted)] hover:bg-[var(--color-bg)]"
                      aria-expanded={depExpanded}
                      aria-label={depExpanded ? 'Recolher setores' : 'Expandir setores'}
                      onClick={() => toggleDepartamento(dep.id)}
                    >
                      {depExpanded ? (
                        <ChevronDown className="size-5" aria-hidden="true" />
                      ) : (
                        <ChevronRight className="size-5" aria-hidden="true" />
                      )}
                    </button>
                    <div>
                      <p className="font-semibold text-[var(--color-text)]">{dep.nome}</p>
                      {dep.sigla ? (
                        <p className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
                          {dep.sigla}
                        </p>
                      ) : null}
                    </div>
                    {statusBadge(dep.ativo)}
                  </div>
                  {dep.ativo ? (
                    <div className="flex flex-wrap gap-[var(--space-1)]">
                      <Button
                        type="button"
                        variant="ghost"
                        className="min-h-9 min-w-0 px-2 py-1"
                        onClick={() => openCreate('setor', dep.id)}
                      >
                        <Plus className="size-4" aria-hidden="true" />
                        Setor
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        className="min-h-9 min-w-0 px-2 py-1"
                        onClick={() => openEdit('departamento', dep.id)}
                      >
                        <Pencil className="size-4" aria-hidden="true" />
                        Editar
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        className="min-h-9 min-w-0 px-2 py-1"
                        onClick={() => openDeactivate('departamento', dep.id, dep.nome)}
                      >
                        <Power className="size-4" aria-hidden="true" />
                        Desativar
                      </Button>
                    </div>
                  ) : null}
                </div>

                {depExpanded ? (
                  <ul className="border-t border-[var(--color-border)] px-[var(--space-4)] py-[var(--space-3)]">
                    {setoresDep.length === 0 ? (
                      <li className="py-[var(--space-2)] text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
                        Nenhum setor cadastrado.
                      </li>
                    ) : (
                      setoresDep.map((setor) => (
                        <li
                          key={setor.id}
                          className={cn(
                            'flex flex-wrap items-center justify-between gap-[var(--space-2)] rounded-[var(--radius)] px-[var(--space-2)] py-[var(--space-2)]',
                            !setor.ativo && 'opacity-70'
                          )}
                        >
                          <div>
                            <p className="text-[length:var(--text-sm)] font-medium text-[var(--color-text)]">
                              {setor.nome}
                            </p>
                            <div className="flex flex-wrap items-center gap-[var(--space-2)]">
                              {setor.sigla ? (
                                <span className="text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
                                  {setor.sigla}
                                </span>
                              ) : null}
                              {statusBadge(setor.ativo)}
                            </div>
                            {setor.emailSetor ? (
                              <p className="text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
                                {setor.emailSetor}
                              </p>
                            ) : null}
                          </div>
                          {setor.ativo ? (
                            <div className="flex gap-[var(--space-1)]">
                              <Button
                                type="button"
                                variant="ghost"
                                className="min-h-9 min-w-0 px-2 py-1"
                                onClick={() => openEdit('setor', setor.id)}
                              >
                                <Pencil className="size-4" aria-hidden="true" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                className="min-h-9 min-w-0 px-2 py-1"
                                onClick={() => openDeactivate('setor', setor.id, setor.nome)}
                              >
                                <Power className="size-4" aria-hidden="true" />
                              </Button>
                            </div>
                          ) : null}
                        </li>
                      ))
                    )}
                  </ul>
                ) : null}
              </li>
            )
          })}
        </ul>
      )}

      {formDialogOpen && dialog?.kind === 'form' ? (
        <EntityFormDialog
          open
          kind={dialog.entity}
          mode={dialog.mode}
          initialValues={formInitial}
          parentOptions={parentOptions}
          parentLabel="Departamento"
          onOpenChange={(open) => !open && closeDialog()}
          onSubmit={handleFormSubmit}
        />
      ) : null}

      {deactivateDialogOpen && dialog?.kind === 'deactivate' ? (
        <DeactivateDialog
          open
          titulo={`Desativar ${dialog.entity}`}
          descricao={`Confirma a desativação de "${dialog.nome}"? Registros inativos não aparecem em novos vínculos.`}
          onOpenChange={(open) => !open && closeDialog()}
          onConfirm={handleDeactivate}
        />
      ) : null}
    </div>
  )
}
