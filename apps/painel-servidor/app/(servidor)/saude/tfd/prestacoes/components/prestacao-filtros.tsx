'use client'

import { Button, Card, Select } from '@saude/ui'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useTransition } from 'react'

const ALL_FILTER_VALUE = '__all__'

const statusOptions = [
  { value: ALL_FILTER_VALUE, label: 'Todos os status' },
  { value: 'PENDENTE', label: 'Pendente' },
  { value: 'ENVIADA', label: 'Enviada' },
  { value: 'APROVADA', label: 'Aprovada' },
  { value: 'REJEITADA', label: 'Rejeitada' },
]

function buildQueryString(
  current: URLSearchParams,
  patch: Record<string, string | undefined>
): string {
  const next = new URLSearchParams(current.toString())

  for (const [key, value] of Object.entries(patch)) {
    if (!value) {
      next.delete(key)
    } else {
      next.set(key, value)
    }
  }

  next.delete('page')

  return next.toString()
}

export function PrestacaoFiltros() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const statusParam = searchParams.get('status') ?? ''
  const statusValue =
    statusParam && statusOptions.some((o) => o.value === statusParam)
      ? statusParam
      : ALL_FILTER_VALUE

  const pushParams = useCallback(
    (patch: Record<string, string | undefined>) => {
      const query = buildQueryString(searchParams, patch)
      startTransition(() => {
        router.push(query ? `${pathname}?${query}` : pathname)
      })
    },
    [pathname, router, searchParams]
  )

  return (
    <Card>
      <div className="flex flex-wrap items-end gap-[var(--space-4)]">
        <div className="min-w-[12rem] flex-1">
          <Select
            id="filtro-status-prestacao"
            label="Status da prestação"
            placeholder="Todos os status"
            options={statusOptions}
            value={statusValue}
            disabled={isPending}
            onValueChange={(value) =>
              pushParams({
                status: value === ALL_FILTER_VALUE ? undefined : value,
              })
            }
          />
        </div>

        <Button
          type="button"
          variant="secondary"
          disabled={isPending || statusValue === ALL_FILTER_VALUE}
          onClick={() => pushParams({ status: undefined })}
        >
          Limpar filtros
        </Button>
      </div>
    </Card>
  )
}
