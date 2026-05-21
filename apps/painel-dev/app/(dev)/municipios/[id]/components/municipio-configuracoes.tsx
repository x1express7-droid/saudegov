'use client'

import type { SaldoListItem } from '@saude/mod-saude-tfd'
import Link from 'next/link'
import { useState, useTransition } from 'react'
import { alterarModulo } from '../../../../../lib/actions/alterar-modulo'
import { alterarStatusMunicipio } from '../../../../../lib/actions/alterar-status-municipio'
import type { MunicipioDetalhe } from '../../../../../lib/queries/get-municipio'
import { TfdSaldoLista } from './tfd-saldo-lista'

const MODULOS_DISPONIVEIS = [
  { key: 'tfd', label: 'TFD — Tratamento Fora de Domicílio' },
  { key: 'regul', label: 'Regulação' },
  { key: 'visa', label: 'Vigilância Sanitária' },
  { key: 'farma', label: 'Farmácia' },
  { key: 'ubs', label: 'UBS' },
  { key: 'sment', label: 'Saúde Mental' },
  { key: 'vacin', label: 'Vacinação' },
] as const

type ModuloKey = (typeof MODULOS_DISPONIVEIS)[number]['key']

type FeedbackState = 'idle' | 'saving' | 'saved' | 'error'

type MunicipioTab = 'configuracao' | 'tfd-saldos'

interface MunicipioConfiguracoesProps {
  municipio: MunicipioDetalhe
  saldosTfd: SaldoListItem[] | null
}

function formatDisplayDomain(municipio: MunicipioDetalhe): string {
  return municipio.domainCustom ?? municipio.domain
}

function formatCreatedAt(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getModuloAtivo(municipio: MunicipioDetalhe, modulo: ModuloKey): boolean {
  return municipio.modules.saude?.[modulo] === true
}

export function MunicipioConfiguracoes({
  municipio: initialMunicipio,
  saldosTfd,
}: MunicipioConfiguracoesProps) {
  const [municipio, setMunicipio] = useState(initialMunicipio)
  const [activeTab, setActiveTab] = useState<MunicipioTab>('configuracao')
  const [moduloFeedback, setModuloFeedback] = useState<Partial<Record<ModuloKey, FeedbackState>>>({})
  const [statusFeedback, setStatusFeedback] = useState<FeedbackState>('idle')
  const [statusError, setStatusError] = useState<string | null>(null)
  const [showSuspendDialog, setShowSuspendDialog] = useState(false)
  const [isPending, startTransition] = useTransition()

  const tfdAtivo = municipio.modules.saude?.tfd === true
  const saldosVisiveis = tfdAtivo && saldosTfd !== null

  function handleModuloToggle(modulo: ModuloKey, ativo: boolean) {
    setModuloFeedback((prev) => ({ ...prev, [modulo]: 'saving' }))

    startTransition(async () => {
      const response = await alterarModulo({
        tenantId: municipio.id,
        modulo,
        ativo,
      })

      if (!response.success) {
        setModuloFeedback((prev) => ({ ...prev, [modulo]: 'error' }))
        return
      }

      setMunicipio((prev) => ({
        ...prev,
        modules: {
          ...prev.modules,
          saude: {
            ...prev.modules.saude,
            [modulo]: ativo,
          },
        },
      }))
      if (modulo === 'tfd' && !ativo && activeTab === 'tfd-saldos') {
        setActiveTab('configuracao')
      }
      setModuloFeedback((prev) => ({ ...prev, [modulo]: 'saved' }))

      window.setTimeout(() => {
        setModuloFeedback((prev) => ({ ...prev, [modulo]: 'idle' }))
      }, 2000)
    })
  }

  function handleStatusChange(ativo: boolean) {
    setStatusFeedback('saving')
    setStatusError(null)
    setShowSuspendDialog(false)

    startTransition(async () => {
      const response = await alterarStatusMunicipio({
        tenantId: municipio.id,
        ativo,
      })

      if (!response.success) {
        setStatusFeedback('error')
        setStatusError(response.error)
        return
      }

      setMunicipio((prev) => ({ ...prev, ativo }))
      setStatusFeedback('saved')

      window.setTimeout(() => {
        setStatusFeedback('idle')
      }, 2000)
    })
  }

  function renderModuloFeedback(modulo: ModuloKey) {
    const state = moduloFeedback[modulo] ?? 'idle'
    if (state === 'saving') {
      return <span className="text-xs text-neutral-500">Salvando...</span>
    }
    if (state === 'saved') {
      return <span className="text-xs text-green-700 dark:text-green-400">Salvo</span>
    }
    if (state === 'error') {
      return <span className="text-xs text-red-600">Erro ao salvar</span>
    }
    return null
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href="/municipios"
            className="text-sm text-neutral-600 hover:underline dark:text-neutral-400"
          >
            ← Voltar para municípios
          </Link>
          <h1 className="mt-2 text-2xl font-semibold">{municipio.nome}</h1>
        </div>
        <span
          className={
            municipio.ativo
              ? 'inline-flex rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800 dark:bg-green-950 dark:text-green-200'
              : 'inline-flex rounded-full bg-neutral-200 px-3 py-1 text-sm font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300'
          }
        >
          {municipio.ativo ? 'Ativo' : 'Suspenso'}
        </span>
      </div>

      {saldosVisiveis ? (
        <nav
          aria-label="Seções do município"
          className="flex flex-wrap gap-2 border-b border-neutral-200 dark:border-neutral-800"
        >
          <button
            type="button"
            onClick={() => setActiveTab('configuracao')}
            className={
              activeTab === 'configuracao'
                ? 'border-b-2 border-neutral-900 px-3 py-2 text-sm font-semibold text-neutral-900 dark:border-neutral-100 dark:text-neutral-100'
                : 'border-b-2 border-transparent px-3 py-2 text-sm font-medium text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100'
            }
          >
            Configuração
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('tfd-saldos')}
            className={
              activeTab === 'tfd-saldos'
                ? 'border-b-2 border-neutral-900 px-3 py-2 text-sm font-semibold text-neutral-900 dark:border-neutral-100 dark:text-neutral-100'
                : 'border-b-2 border-transparent px-3 py-2 text-sm font-medium text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100'
            }
          >
            TFD — Saldos
          </button>
        </nav>
      ) : null}

      {activeTab === 'tfd-saldos' && saldosVisiveis ? (
        <section className="flex flex-col gap-4 rounded-lg border border-neutral-200 p-6 dark:border-neutral-800">
          <h2 className="text-lg font-medium">TFD — Saldos financeiros</h2>
          <TfdSaldoLista
            tenantId={municipio.id}
            municipioNome={municipio.nome}
            items={saldosTfd}
          />
        </section>
      ) : null}

      {activeTab === 'configuracao' ? (
        <>
      <section className="flex flex-col gap-4 rounded-lg border border-neutral-200 p-6 dark:border-neutral-800">
        <h2 className="text-lg font-medium">Informações</h2>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-neutral-500">Nome</dt>
            <dd className="font-medium">{municipio.nome}</dd>
          </div>
          <div>
            <dt className="text-neutral-500">UF</dt>
            <dd className="font-medium">{municipio.uf ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-neutral-500">Slug</dt>
            <dd className="font-mono">{municipio.slug}</dd>
          </div>
          <div>
            <dt className="text-neutral-500">Domínio</dt>
            <dd className="font-mono text-xs">{formatDisplayDomain(municipio)}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-neutral-500">Criado em</dt>
            <dd>{formatCreatedAt(municipio.createdAt)}</dd>
          </div>
        </dl>
      </section>

      <section className="flex flex-col gap-4 rounded-lg border border-neutral-200 p-6 dark:border-neutral-800">
        <h2 className="text-lg font-medium">Módulos</h2>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Ative ou desative módulos do sistema de saúde para este município.
        </p>
        {!tfdAtivo ? (
          <p className="rounded-md border border-dashed border-neutral-300 bg-neutral-50 px-4 py-3 text-sm text-neutral-600 dark:border-neutral-700 dark:bg-neutral-900/40 dark:text-neutral-400">
            O módulo TFD está desativado. Ative-o para visualizar os saldos financeiros deste
            município na aba <strong>TFD — Saldos</strong>.
          </p>
        ) : null}
        <ul className="flex flex-col gap-3">
          {MODULOS_DISPONIVEIS.map(({ key, label }) => (
            <li
              key={key}
              className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-neutral-100 px-4 py-3 dark:border-neutral-800"
            >
              <label className="flex flex-1 cursor-pointer items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={getModuloAtivo(municipio, key)}
                  disabled={isPending}
                  onChange={(e) => handleModuloToggle(key, e.target.checked)}
                  className="h-4 w-4 rounded border-neutral-300"
                />
                {label}
              </label>
              {renderModuloFeedback(key)}
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-4 rounded-lg border border-neutral-200 p-6 dark:border-neutral-800">
        <h2 className="text-lg font-medium">Status</h2>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Municípios suspensos deixam de resolver tenant pelo domínio — o acesso retorna 404 até
          reativação. Os dados permanecem no banco.
        </p>

        {statusFeedback === 'saving' && (
          <p className="text-sm text-neutral-500">Atualizando status...</p>
        )}
        {statusFeedback === 'saved' && (
          <p className="text-sm text-green-700 dark:text-green-400">Status atualizado.</p>
        )}
        {statusFeedback === 'error' && statusError && (
          <p role="alert" className="text-sm text-red-600">
            {statusError}
          </p>
        )}

        {municipio.ativo ? (
          <>
            <button
              type="button"
              disabled={isPending}
              onClick={() => setShowSuspendDialog(true)}
              className="w-fit rounded bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60 hover:bg-red-700"
            >
              Suspender município
            </button>

            {showSuspendDialog && (
              <div
                role="dialog"
                aria-labelledby="suspender-titulo"
                className="flex flex-col gap-4 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/30"
              >
                <h3 id="suspender-titulo" className="font-medium text-red-900 dark:text-red-100">
                  Confirmar suspensão
                </h3>
                <p className="text-sm text-red-800 dark:text-red-200">
                  O município <strong>{municipio.nome}</strong> ficará inacessível até ser
                  reativado. Deseja continuar?
                </p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleStatusChange(false)}
                    className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                  >
                    Sim, suspender
                  </button>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => setShowSuspendDialog(false)}
                    className="rounded border border-neutral-300 px-4 py-2 text-sm dark:border-neutral-600"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <button
            type="button"
            disabled={isPending}
            onClick={() => handleStatusChange(true)}
            className="w-fit rounded bg-green-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60 hover:bg-green-700"
          >
            Reativar município
          </button>
        )}
      </section>
        </>
      ) : null}
    </div>
  )
}
