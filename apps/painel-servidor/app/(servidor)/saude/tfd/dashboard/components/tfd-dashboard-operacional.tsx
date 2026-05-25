'use client'

import type { TfdDashboardOperacionalOutput } from '@saude/mod-saude-tfd/client'
import { Alert, Button, PageHeader, Spinner } from '@saude/ui'
import { CalendarDays, List, PlusCircle } from 'lucide-react'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'

import { TfdDashboardOperacionalAtividade } from './tfd-dashboard-operacional-atividade'
import { TfdDashboardOperacionalAlertas } from './tfd-dashboard-operacional-alertas'
import { TfdDashboardOperacionalKpis } from './tfd-dashboard-operacional-kpis'

const API_URL = '/api/saude/tfd/dashboard-operacional'

export function TfdDashboardOperacional() {
  const [data, setData] = useState<TfdDashboardOperacionalOutput | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(API_URL, { cache: 'no-store' })
      const body = (await response.json()) as TfdDashboardOperacionalOutput & { error?: string }

      if (!response.ok) {
        throw new Error(body.error ?? 'Não foi possível carregar o dashboard.')
      }

      setData(body)
    } catch (err) {
      setData(null)
      setError(err instanceof Error ? err.message : 'Erro ao carregar o dashboard.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const hoje = new Date().toISOString().slice(0, 10)

  return (
    <div className="flex flex-col gap-[var(--space-6)]">
      <PageHeader
        titulo="Dashboard TFD"
        subtitulo="Visão operacional do módulo de Tratamento Fora de Domicílio"
      />

      {loading ? (
        <div
          className="flex min-h-[200px] items-center justify-center gap-[var(--space-3)] text-[var(--color-text-muted)]"
          role="status"
          aria-live="polite"
        >
          <Spinner className="size-6" />
          <span className="text-[length:var(--text-sm)]">Carregando indicadores…</span>
        </div>
      ) : null}

      {error && !loading ? (
        <Alert variant="error" titulo="Erro ao carregar o dashboard" role="alert">
          <p className="text-[length:var(--text-sm)]">{error}</p>
          <Button type="button" variant="outline" className="mt-[var(--space-3)]" onClick={() => void load()}>
            Tentar novamente
          </Button>
        </Alert>
      ) : null}

      {data && !loading ? (
        <>
          <TfdDashboardOperacionalKpis kpis={data.kpis} />

          <section aria-labelledby="acoes-rapidas-tfd">
            <h2
              id="acoes-rapidas-tfd"
              className="mb-[var(--space-3)] text-[length:var(--text-lg)] font-semibold text-[var(--color-text)]"
            >
              Ações rápidas
            </h2>
            <div className="grid gap-[var(--space-3)] sm:grid-cols-2 lg:grid-cols-3">
              <Button asChild variant="primary" className="h-auto min-h-[52px] justify-start py-[var(--space-3)]">
                <Link href="/saude/tfd/nova">
                  <PlusCircle className="size-5 shrink-0" aria-hidden="true" />
                  Nova Solicitação
                </Link>
              </Button>
              <Button asChild variant="secondary" className="h-auto min-h-[52px] justify-start py-[var(--space-3)]">
                <Link href="/saude/tfd">
                  <List className="size-5 shrink-0" aria-hidden="true" />
                  Ver Fila
                </Link>
              </Button>
              <Button asChild variant="secondary" className="h-auto min-h-[52px] justify-start py-[var(--space-3)]">
                <Link href={`/saude/tfd/agendamentos?dataInicio=${hoje}&dataFim=${hoje}`}>
                  <CalendarDays className="size-5 shrink-0" aria-hidden="true" />
                  Agendamentos de Hoje
                </Link>
              </Button>
            </div>
          </section>

          <TfdDashboardOperacionalAlertas alertas={data.alertas} />

          <section className="flex flex-col gap-[var(--space-3)]">
            <h2 className="text-[length:var(--text-lg)] font-semibold text-[var(--color-text)]">
              Atividade recente
            </h2>
            <TfdDashboardOperacionalAtividade items={data.atividadeRecente} />
          </section>
        </>
      ) : null}
    </div>
  )
}
