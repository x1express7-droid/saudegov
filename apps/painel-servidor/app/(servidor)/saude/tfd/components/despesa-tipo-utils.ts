import { TFD_TIPO_DESPESA_CONFIG, type TfdTipoDespesaConfigKey } from '@saude/ui'
import {
  AlertCircle,
  Anchor,
  ArrowLeftRight,
  Bed,
  Bus,
  Car,
  Hotel,
  MoreHorizontal,
  Plane,
  UserCheck,
  Utensils,
  type LucideIcon,
} from 'lucide-react'

const ICONE_DESPESA: Record<string, LucideIcon> = {
  Bus,
  Plane,
  Anchor,
  Hotel,
  UserCheck,
  AlertCircle,
  ArrowLeftRight,
  Car,
  Utensils,
  Bed,
  MoreHorizontal,
}

export function labelTipoDespesa(tipo: string | null): {
  label: string
  isLegado: boolean
  Icon: LucideIcon
} {
  if (!tipo) {
    return { label: 'Custo planejado', isLegado: false, Icon: MoreHorizontal }
  }

  const config = TFD_TIPO_DESPESA_CONFIG[tipo as TfdTipoDespesaConfigKey]
  if (!config) {
    return { label: tipo, isLegado: false, Icon: MoreHorizontal }
  }

  const Icon = ICONE_DESPESA[config.icone] ?? MoreHorizontal
  return { label: config.label, isLegado: config.grupo === 'LEGADO', Icon }
}
