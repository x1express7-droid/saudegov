# SKILL_PERMISSIONS_CHECK.md
# Como Verificar e Implementar Permissões — saudegov

## Quando usar
Ao implementar qualquer Server Action, rota protegida ou componente com
renderização condicional por papel. Também ao revisar código existente.

---

## As 3 Camadas — Ordem Obrigatória

```
Camada 1 → assertModuleActive  → módulo inativo = 404 (nunca 403)
Camada 2 → requireTenantRole   → papel insuficiente = redirect /login
Camada 3 → requirePermission   → permissão OFF = erro 403
```

Toda Server Action deve ter as 3 camadas como primeiras linhas.
ADMIN e SUPERADMIN têm bypass na Camada 3 — não precisam de permissão granular.

---

## Passo 1 — Identificar o papel mínimo

Consulte `docs/AUTH_PERMISSIONS.md` seção 7 — Matriz de Permissões.

```
SERVIDOR  → operações diárias (abrir solicitação, registrar despesa)
GESTOR    → decisões e controle financeiro (aprovar, negar, gerenciar saldo)
ADMIN     → configuração do município (cadastros, permissões de servidores)
SUPERADMIN → gestão da plataforma (municípios, módulos)
```

---

## Passo 2 — Identificar a permissão granular

Consulte `docs/AUTH_PERMISSIONS.md` seção 3.1 — Catálogo TFD.

Formato da chave: `saude.{modulo}.{acao}`

```typescript
// modules/saude/tfd/src/permissions.ts
export const TFD_PERMISSIONS = {
  ABRIR_SOLICITACAO:      'saude.tfd.abrir_solicitacao',
  ANALISAR_LAUDO:         'saude.tfd.analisar_laudo',
  SOLICITAR_COMPLEMENTO:  'saude.tfd.solicitar_complemento',
  AGENDAR_VIAGEM:         'saude.tfd.agendar_viagem',
  REGISTRAR_RETORNO:      'saude.tfd.registrar_retorno',
  REGISTRAR_DESPESA:      'saude.tfd.registrar_despesa',
  ENVIAR_PRESTACAO:       'saude.tfd.enviar_prestacao',
  DECIDIR_SOLICITACAO:    'saude.tfd.decidir_solicitacao',
  APROVAR_PRESTACAO:      'saude.tfd.aprovar_prestacao',
  GERENCIAR_SALDO:        'saude.tfd.gerenciar_saldo',
  GERENCIAR_FROTA:        'saude.tfd.gerenciar_frota',
  CANCELAR_PROCESSO:      'saude.tfd.cancelar_processo',
  VER_DASHBOARD:          'saude.tfd.ver_dashboard',
  EXPORTAR_RELATORIO:     'saude.tfd.exportar_relatorio',
  CONFIGURAR:             'saude.tfd.configurar',
} as const
```

---

## Passo 3 — Implementar na Server Action

```typescript
// Ordem exata — não alterar
await assertModuleActive('saude', 'tfd')           // Camada 1
const session = await requireTenantRole('GESTOR')  // Camada 2
await requirePermission(session, TFD_PERMISSIONS.DECIDIR_SOLICITACAO) // Camada 3
```

---

## Passo 4 — Implementar no componente (PermissionGate)

```typescript
// PermissionGate é APENAS visual — não substitui a verificação no servidor
import { PermissionGate } from '@saude/ui'

// Esconder botão que o servidor não tem permissão
<PermissionGate session={session} permission={TFD_PERMISSIONS.DECIDIR_SOLICITACAO}>
  <BotoesDecisao />
</PermissionGate>

// Esconder seção por papel mínimo
<PermissionGate session={session} minimumRole="GESTOR">
  <SecaoFinanceira />
</PermissionGate>
```

---

## Passo 5 — Verificar acesso por setor (SERVIDOR)

```typescript
// SERVIDOR só vê processos do seu setor
const setorFilter = session.user.role === 'SERVIDOR'
  ? { setor_id: session.user.setorId }
  : {}  // GESTOR e ADMIN veem todos

const solicitacoes = await db.saudeTfdSolicitacao.findMany({
  where: {
    tenant_id: session.user.tenantId!,
    ...setorFilter,
  }
})
```

---

## Passo 6 — Checklist de revisão de permissões

Para cada Server Action ou rota protegida:

- [ ] `assertModuleActive` é a primeira linha?
- [ ] `requireTenantRole` com papel correto conforme matriz?
- [ ] `requirePermission` para GESTOR e SERVIDOR?
- [ ] ADMIN e SUPERADMIN têm bypass correto (sem requirePermission)?
- [ ] SERVIDOR filtrado pelo seu `setorId` em listagens?
- [ ] Dados sensíveis verificam permissão adicional (`analisar_laudo`)?
- [ ] `PermissionGate` no componente para ocultar ações não permitidas?
- [ ] `tenant_id` da sessão — nunca de parâmetro externo?

---

## Erros Comuns

```
❌ Verificar apenas no cliente (PermissionGate sem action)
   → Sempre verificar no servidor também

❌ Aceitar tenant_id da URL ou body
   → Sempre de session.user.tenantId

❌ Retornar 403 para módulo inativo
   → Sempre notFound() → 404

❌ SERVIDOR vendo processos de outros setores
   → Filtrar por session.user.setorId quando role = SERVIDOR

❌ Dados clínicos sem verificação de analisar_laudo
   → Verificar permissão antes de incluir CID/diagnóstico no retorno
```
