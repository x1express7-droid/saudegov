import type { GestaoTfdCentralOutput } from '@saude/mod-saude-tfd/client'
import { TfdDashboardAlertas } from '../../dashboard/components/tfd-dashboard-alertas'
import { TfdDashboardOperacionalAlertas } from '../../dashboard/components/tfd-dashboard-operacional-alertas'

export interface GestaoAlertasPanelProps {
  dados: GestaoTfdCentralOutput
}

export function GestaoAlertasPanel({ dados }: GestaoAlertasPanelProps) {
  return (
    <div
      className={`grid gap-[var(--space-6)] ${dados.alertasGestor ? 'lg:grid-cols-2' : 'grid-cols-1'}`}
    >
      <TfdDashboardOperacionalAlertas alertas={dados.alertasOperacional} />
      {dados.alertasGestor ? (
        <TfdDashboardAlertas
          alertasUrgentes={dados.alertasGestor.alertasUrgentes}
          saldosBaixo={dados.alertasGestor.saldosEmAlerta}
          alertasPrestacao={dados.alertasGestor.alertasPrestacao}
          alertasPendente30={dados.alertasGestor.alertasPendente30}
          alertasPendente60={dados.alertasGestor.alertasPendente60}
          alertasLembreteViagem={dados.alertasGestor.alertasLembreteViagem}
        />
      ) : null}
    </div>
  )
}
