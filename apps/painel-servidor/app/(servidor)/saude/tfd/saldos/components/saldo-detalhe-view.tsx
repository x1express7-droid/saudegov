'use client'

import { desativarSaldoTfd } from '@saude/mod-saude-tfd/actions/configuracao'
import { TFD_PERMISSIONS, type SaldoListItem } from '@saude/mod-saude-tfd/client'
import type { SaudeMunicSession } from '@saude/core-auth/types/session'
import { Badge, Button, PageHeader } from '@saude/ui'
import { PermissionGate } from '@saude/ui/permission-gate'
import { Power } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { DeactivateDialog } from '@/app/(admin)/configuracoes/organograma/components/deactivate-dialog'
import { ExtratoView } from './extrato-view'
import { FONTE_LABELS, formatCompetenciaBr } from './saldos-ui'

// BLOCO-11-SALDOS
const SALDOS_BASE = '/saude/tfd/saldos'

interface SaldoDetalheViewProps {
  saldo: SaldoListItem
  session: SaudeMunicSession
}

export function SaldoDetalheView({ saldo, session }: SaldoDetalheViewProps) {
  const router = useRouter()
  const [deactivateOpen, setDeactivateOpen] = useState(false)

  const subtitulo = `Fonte: ${FONTE_LABELS[saldo.fonte]} · Competência: ${formatCompetenciaBr(
    saldo.competenciaInicio,
    saldo.competenciaFim
  )}`

  return (
    <div className="flex flex-col gap-[var(--space-6)]">
      <PageHeader
        titulo={saldo.descricao}
        subtitulo={subtitulo}
        breadcrumbs={[
          { label: 'TFD', href: '/saude/tfd' },
          { label: 'Saldos', href: SALDOS_BASE },
          { label: saldo.descricao },
        ]}
        acoes={
          <div className="flex flex-wrap items-center gap-[var(--space-3)]">
            <Badge variant={saldo.ativo ? 'green' : 'gray'}>
              {saldo.ativo ? 'Ativo' : 'Inativo'}
            </Badge>
            {saldo.ativo ? (
              <PermissionGate session={session} permission={TFD_PERMISSIONS.GERENCIAR_SALDO}>
                <Button type="button" variant="outline" onClick={() => setDeactivateOpen(true)}>
                  <Power className="size-4" aria-hidden="true" />
                  Desativar
                </Button>
              </PermissionGate>
            ) : (
              // BLOCO-11-SALDOS: reativação não exposta nas actions atuais do módulo TFD.
              <Button type="button" variant="outline" disabled title="Reativação indisponível">
                Ativar
              </Button>
            )}
          </div>
        }
      />

      <ExtratoView saldo={saldo} session={session} />

      <DeactivateDialog
        open={deactivateOpen}
        titulo="Desativar saldo financeiro"
        descricao={`Confirma a inativação do saldo “${saldo.descricao}”? O extrato e todas as movimentações serão preservados; o saldo deixará de aparecer em novas aprovações.`}
        onOpenChange={setDeactivateOpen}
        onConfirm={async () => {
          const response = await desativarSaldoTfd({ saldoId: saldo.id })
          if (!response.success) {
            return { success: false, error: response.error }
          }
          router.refresh()
          router.push(SALDOS_BASE)
          return { success: true }
        }}
      />
    </div>
  )
}
