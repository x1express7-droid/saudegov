import type { PermissaoCatalogoItem } from '../utils/permissoes-catalogo'
import type { ServidorRolePermissoes } from '../utils/permissoes-catalogo'

export interface PermissoesServidorContext {
  id: string
  name: string
  role: ServidorRolePermissoes
  active: boolean
  permissions: Record<string, boolean>
}

export interface ModuloPermissoesGrupo {
  moduloChave: string
  moduloLabel: string
  catalogo: PermissaoCatalogoItem[]
  valores: Record<string, boolean>
}
