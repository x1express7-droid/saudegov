'use client'

import { desativarSaldoTfd } from '@saude/mod-saude-tfd/actions/configuracao'
import { exportarSaldosTfdCsv } from '@saude/mod-saude-tfd/actions/exportacao'
import { TFD_PERMISSIONS, type SaldoListItem } from '@saude/mod-saude-tfd/client'
import type { SaudeMunicSession } from '@saude/core-auth/types/session'
import { Button, EmptyState } from '@saude/ui'
import { PermissionGate } from '@saude/ui/permission-gate'
import { Plus, Wallet } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'

import { DeactivateDialog } from '@/app/(admin)/configuracoes/organograma/components/deactivate-dialog'
import { TfdExportCsvButton } from '../../components/tfd-export-csv-button'
import { matchesFonteFiltro, SaldoFiltros } from './saldo-filtros'
import { SaldoAlertaCritico } from './saldo-alerta-critico'
import { SaldoListaCompactaView } from './saldo-lista-compacta-view'
import { SaldoListaResumo } from './saldo-lista-resumo'
import { SaldoForm } from './saldo-form'
import { normalizeSaldoSearch, type SaldoStatusFiltro } from './saldos-ui'

// BLOCO-11-SALDOS
// BLOCO-11.1-SALDOS
type DeactivateDialogState = { saldo: SaldoListItem } | null

interface SaldoListaProps {
  items: SaldoListItem[]
  session: SaudeMunicSession
}

export function SaldoLista({ items, session }: SaldoListaProps) {
  const router = useRouter()
  const [formOpen, setFormOpen] = useState(false)
  const [deactivateDialog, setDeactivateDialog] = useState<DeactivateDialogState>(null)
  const [statusFiltro, setStatusFiltro] = useState<SaldoStatusFiltro>('ativo')
  const [fonteFiltro, setFonteFiltro] = useState('__all__')
  const [descricaoBusca, setDescricaoBusca] = useState('')

  const saldosEmAlerta = useMemo(
    () => items.filter((item) => item.alertaBaixo && item.ativo),
    [items]
  )

  const filteredItems = useMemo(() => {
    const busca = normalizeSaldoSearch(descricaoBusca)

    return items.filter((item) => {
      if (statusFiltro === 'ativo' && !item.ativo) {
        return false
      }
      if (statusFiltro === 'inativo' && item.ativo) {
        return false
      }
      if (!matchesFonteFiltro(item.fonte, fonteFiltro)) {
        return false
      }
      if (busca && !normalizeSaldoSearch(item.descricao).includes(busca)) {
        return false
      }
      return true
    })
  }, [descricaoBusca, fonteFiltro, items, statusFiltro])

  return (
    <div className="flex flex-col gap-[var(--space-4)]">
      {items.length > 0 ? (
        <>
          <SaldoListaResumo items={items} />
          <SaldoAlertaCritico saldos={saldosEmAlerta} />
        </>
      ) : null}

      <div className="flex flex-wrap items-center justify-end gap-[var(--space-2)]">
        <TfdExportCsvButton
          session={session}
          onExport={() => exportarSaldosTfdCsv({ incluirInativos: true })}
        />
        <PermissionGate session={session} permission={TFD_PERMISSIONS.GERENCIAR_SALDO}>
          <Button type="button" onClick={() => setFormOpen(true)} className="shrink-0">
            <Plus className="size-4" aria-hidden="true" />
            Novo saldo
          </Button>
        </PermissionGate>
      </div>

      {items.length > 0 ? (
        <SaldoFiltros
          statusFiltro={statusFiltro}
          onStatusFiltroChange={setStatusFiltro}
          fonteFiltro={fonteFiltro}
          onFonteFiltroChange={setFonteFiltro}
          descricaoBusca={descricaoBusca}
          onDescricaoBuscaChange={setDescricaoBusca}
        />
      ) : null}

      {items.length === 0 ? (
        <EmptyState
          icon={<Wallet className="size-6" aria-hidden="true" />}
          titulo="Nenhum saldo financeiro cadastrado"
          descricao="Clique em '+ Novo saldo' para cadastrar o primeiro recurso destinado ao TFD."
          cta={
            <PermissionGate session={session} permission={TFD_PERMISSIONS.GERENCIAR_SALDO}>
              <Button type="button" onClick={() => setFormOpen(true)}>
                <Plus className="size-4" aria-hidden="true" />
                Novo saldo
              </Button>
            </PermissionGate>
          }
        />
      ) : (
        <>
          <SaldoListaCompactaView
            items={filteredItems}
            session={session}
            onDesativar={(saldo) => setDeactivateDialog({ saldo })}
          />
          {filteredItems.length > 0 ? (
            <p className="text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
              Clique no nome do saldo para ver o extrato completo de movimentações. Saldos inativos
              permanecem visíveis com histórico preservado.
            </p>
          ) : null}
        </>
      )}

      <SaldoForm open={formOpen} onOpenChange={setFormOpen} />

      {deactivateDialog ? (
        <DeactivateDialog
          open
          titulo="Desativar saldo financeiro"
          descricao={`Confirma a inativação do saldo “${deactivateDialog.saldo.descricao}”? O extrato e todas as movimentações serão preservados; o saldo deixará de aparecer em novas aprovações.`}
          onOpenChange={(open) => {
            if (!open) {
              setDeactivateDialog(null)
            }
          }}
          onConfirm={async () => {
            const response = await desativarSaldoTfd({ saldoId: deactivateDialog.saldo.id })
            if (!response.success) {
              return { success: false, error: response.error }
            }
            router.refresh()
            return { success: true }
          }}
        />
      ) : null}
    </div>
  )
}
