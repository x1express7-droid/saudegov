# AUTH_PERMISSIONS.md
# saudegov — Autenticação e Permissões

> **Instruções para o agente do Cursor:** Consulte este arquivo antes de qualquer
> tarefa que envolva criação de rotas, Server Actions, componentes com conteúdo
> condicional por papel, middleware de proteção ou qualquer lógica que decida o
> que um usuário pode ou não fazer. Nunca implemente verificação de permissão sem
> consultar a matriz desta documentação. Toda verificação acontece no servidor —
> nunca confie em dados do cliente para determinar permissões.

---

## 1. Papéis do Sistema

A plataforma tem 4 papéis fixos em ordem hierárquica decrescente:

```
SUPERADMIN  →  ADMIN  →  GESTOR  →  SERVIDOR
```

| Papel | Escopo | Quem é |
|---|---|---|
| `SUPERADMIN` | Global — todos os municípios | O desenvolvedor da plataforma |
| `ADMIN` | Município inteiro | Gestor de TI ou secretário-geral da Saúde |
| `GESTOR` | Módulo/setor — seu escopo | Coordenador de TFD, chefe de setor |
| `SERVIDOR` | Setor — processos do seu setor | Atendente, regulador, assistente administrativo |

> **Sem papel CIDADÃO.** O sistema é operado exclusivamente por servidores públicos.
> Pacientes não têm acesso à plataforma.

### Regra de hierarquia
Um papel sempre pode fazer tudo que o papel abaixo pode. `ADMIN` pode fazer tudo
que `GESTOR` e `SERVIDOR` fazem dentro do seu município. `SUPERADMIN` pode fazer
tudo em qualquer município.

### Regra de permissões granulares
`ADMIN` e `SUPERADMIN` têm bypass automático — não são verificados por permissões
granulares, pois têm acesso total dentro do seu escopo.

Para `GESTOR` e `SERVIDOR`, o papel define o **teto máximo**: permissões granulares
só podem restringir, nunca expandir acima do papel.

---

## 2. Sessão e Token JWT

A sessão é gerenciada pelo NextAuth v5. O token JWT carrega o contexto mínimo
necessário para autorização sem consulta adicional ao banco na maioria das requisições.

### Estrutura do token JWT

```typescript
// packages/core-auth/src/types/session.ts

export interface SaudeMunicSession {
  user: {
    id: string              // UUID do usuário
    tenantId: string | null // null apenas para SUPERADMIN
    role: UserRole
    name: string
    email: string
    setorId?: string        // setor principal (SERVIDOR)
    permissions: Record<string, boolean> // permissões granulares carregadas no login
  }
  expires: string
}

export type UserRole = 'SUPERADMIN' | 'ADMIN' | 'GESTOR' | 'SERVIDOR'
```

### Permissões granulares no JWT
As permissões do campo `users.permissions` (JSONB) são carregadas no token
durante o login para evitar consulta ao banco em cada requisição.

Formato da chave: `{sistema}.{modulo}.{acao}`

```json
{
  "saude.tfd.analisar_laudo": true,
  "saude.tfd.agendar_viagem": true,
  "saude.tfd.registrar_contas": false
}
```

---

## 3. Permissões Granulares por Módulo

### 3.1 Catálogo de permissões do módulo TFD

Definidas em `modules/saude/tfd/src/permissions.ts`.

| Chave | Papel mínimo | O que autoriza |
|---|---|---|
| `saude.tfd.abrir_solicitacao` | SERVIDOR | Registrar nova solicitação de TFD |
| `saude.tfd.analisar_laudo` | SERVIDOR | Ver CID/diagnóstico e iniciar análise médica |
| `saude.tfd.solicitar_complemento` | SERVIDOR | Solicitar informações adicionais ao solicitante |
| `saude.tfd.agendar_viagem` | SERVIDOR | Definir data, veículo e motorista |
| `saude.tfd.registrar_retorno` | SERVIDOR | Registrar retorno após viagem realizada |
| `saude.tfd.registrar_despesa` | SERVIDOR | Lançar itens de despesa com comprovante |
| `saude.tfd.enviar_prestacao` | SERVIDOR | Enviar prestação de contas para aprovação |
| `saude.tfd.decidir_solicitacao` | GESTOR | Aprovar ou negar solicitação TFD |
| `saude.tfd.aprovar_prestacao` | GESTOR | Aprovar prestação de contas financeira |
| `saude.tfd.gerenciar_saldo` | GESTOR | Cadastrar e visualizar saldos financeiros |
| `saude.tfd.gerenciar_frota` | GESTOR | Cadastrar veículos e motoristas |
| `saude.tfd.cancelar_processo` | GESTOR | Cancelar solicitação com motivo obrigatório |
| `saude.tfd.ver_dashboard` | GESTOR | Acessar dashboard financeiro e KPIs |
| `saude.tfd.exportar_relatorio` | GESTOR | Gerar PDFs analíticos e exportar CSV das listagens TFD (fila, agendamentos, prestações, saldos) |
| `saude.tfd.configurar` | ADMIN | Configurações gerais do módulo TFD |
| `saude.tfd.configurar_especialidades` | ADMIN | CRUD de especialidades médicas |
| `saude.tfd.configurar_procedimentos` | GESTOR | CRUD de procedimentos vinculados a especialidades (aba Configurações TFD) |
| `saude.tfd.configurar_prestadores` | ADMIN | CRUD de prestadores de saúde externos |

### 3.2 Regras de gestão de permissões

- **Padrão:** ao criar um usuário, todas as permissões iniciam `false` (desligadas)
- **Configuração:** o ADMIN ativa/desativa via toggles no painel, servidor por servidor
- **Teto por papel:** não é possível conceder permissão acima do papel do usuário
  - Ex: SERVIDOR não pode receber `saude.tfd.decidir_solicitacao` (é de GESTOR)
- **Alteração invalida sessão:** ao alterar permissões, a sessão ativa do usuário
  deve ser invalidada para refletir as mudanças no próximo login
- **Auditoria:** toda alteração de permissão gera registro em `audit_logs`

---

## 4. Ordem de Verificação — 3 Camadas Obrigatórias

Toda Server Action e API Route deve verificar nesta ordem exata:

```
1. assertModuleActive('saude', 'tfd')   → módulo inativo = 404
2. requireTenantRole('PAPEL_MINIMO')    → papel insuficiente = redirect
3. requirePermission(session, 'chave')  → permissão OFF = 403
```

```typescript
// Exemplo completo em uma Server Action
export async function decidirSolicitacaoTfd(input: DecidirInput) {
  // Camada 1: módulo ativo?
  await assertModuleActive('saude', 'tfd')

  // Camada 2: papel mínimo GESTOR?
  const session = await requireTenantRole('GESTOR')

  // Camada 3: permissão granular?
  await requirePermission(session, 'saude.tfd.decidir_solicitacao')

  // Só aqui começa a lógica de negócio
}
```

**Regra de bypass:**
- `ADMIN` → bypass automático na camada 3 (permissões granulares)
- `SUPERADMIN` → bypass automático nas camadas 2 e 3

---

## 5. Funções de Autorização

Implementadas em `packages/core-auth/src/authorization.ts`.

```typescript
// Retorna sessão ou redireciona para /login
export async function requireAuth(): Promise<SaudeMunicSession>

// Exige papel mínimo — respeita hierarquia
export async function requireTenantRole(minimumRole: UserRole): Promise<SaudeMunicSession>

// Verifica permissão granular — lança erro 403 se OFF
export async function requirePermission(
  session: SaudeMunicSession,
  permissionKey: string
): Promise<void>

// Verifica módulo ativo — retorna 404 se inativo
export async function assertModuleActive(
  sistema: string,
  modulo: string
): Promise<void>

// Helpers booleanos para uso em componentes (sem redirect)
export function hasRole(session: SaudeMunicSession, minimumRole: UserRole): boolean
export function hasPermission(session: SaudeMunicSession, key: string): boolean
export function isSuperAdmin(session: SaudeMunicSession): boolean
```

---

## 6. Proteção de Rotas via Middleware

```typescript
// apps/painel-servidor/middleware.ts

// Proteção por papel mínimo por grupo de rota
const ROLE_REQUIRED = [
  { path: '/admin',   role: 'ADMIN',   level: 3 },
  { path: '/gestao',  role: 'GESTOR',  level: 2 },
  { path: '/painel',  role: 'SERVIDOR', level: 1 },
]

// Módulo inativo → 404 na rota (sem expor existência)
// Ex: /saude/tfd/* → verifica tenant.modules.saude.tfd antes de renderizar
```

```typescript
// apps/painel-dev/middleware.ts

// Proteção absoluta: só SUPERADMIN + IP allowlist
// Qualquer outra combinação → redirect para /login
```

---

## 7. Matriz de Permissões — Módulo TFD

### Legenda
```
✅ Permitido
❌ Negado
🎯 Apenas do seu setor/escopo
```

### 7.1 Painel Dev — Gestão da Plataforma

| Ação | SUPERADMIN |
|---|---|
| Criar / suspender município | ✅ |
| Ativar / desativar módulo TFD por município | ✅ |
| Exportar dados de qualquer município | ✅ |
| Ver audit logs globais | ✅ |
| Criar ADMIN do município | ✅ |
| Ver platform_features | ✅ |

### 7.2 Painel Servidor — Configuração do Município

| Ação | SUPERADMIN | ADMIN | GESTOR | SERVIDOR |
|---|---|---|---|---|
| Configurar organograma (secretarias, setores) | ✅ | ✅ | ❌ | ❌ |
| Cadastrar servidores | ✅ | ✅ | ❌ | ❌ |
| Definir permissões dos servidores | ✅ | ✅ | ❌ | ❌ |
| Configurar tema visual | ✅ | ✅ | ❌ | ❌ |
| Definir setor responsável pelo TFD | ✅ | ✅ | ❌ | ❌ |
| Configurar integração CADSUS | ✅ | ✅ | ❌ | ❌ |

### 7.3 Painel Servidor — Cadastros do TFD (configuração)

| Ação | SUPERADMIN | ADMIN | GESTOR | SERVIDOR |
|---|---|---|---|---|
| CRUD especialidades | ✅ | ✅ | ❌ | ❌ |
| CRUD procedimentos | ✅ | ✅ | 🎯 `configurar_procedimentos` | ❌ |
| CRUD prestadores externos | ✅ | ✅ | ❌ | ❌ |
| Acessar layout `/saude/tfd/configuracoes/*` (abas permitidas) | ✅ | ✅ | 🎯 conforme permissão da aba | ❌ |
| CRUD veículos | ✅ | ✅ | 🎯 `gerenciar_frota` | ❌ |
| CRUD motoristas | ✅ | ✅ | 🎯 `gerenciar_frota` | ❌ |

### 7.4 Painel Servidor — Operação do TFD (fluxo principal)

| Ação | SUPERADMIN | ADMIN | GESTOR | SERVIDOR |
|---|---|---|---|---|
| Registrar nova solicitação | ✅ | ✅ | ✅ | 🎯 `abrir_solicitacao` |
| Consultar lista de solicitações | ✅ | ✅ | ✅ (todas) | 🎯 (seu setor) |
| Ver detalhe sem dados clínicos | ✅ | ✅ | ✅ | ✅ |
| Ver CID e diagnóstico | ✅ | ✅ | ✅ | 🎯 `analisar_laudo` |
| Visualizar laudo (URL assinada) | ✅ | ✅ | ✅ | 🎯 `analisar_laudo` |
| Iniciar análise (ENVIADO → EM_ANALISE) | ✅ | ✅ | ✅ | 🎯 `analisar_laudo` |
| Solicitar complemento | ✅ | ✅ | ✅ | 🎯 `solicitar_complemento` |
| Aprovar solicitação | ✅ | ✅ | 🎯 `decidir_solicitacao` | ❌ |
| Negar solicitação | ✅ | ✅ | 🎯 `decidir_solicitacao` | ❌ |
| Criar agendamento de viagem | ✅ | ✅ | ✅ | 🎯 `agendar_viagem` |
| Registrar retorno da viagem | ✅ | ✅ | ✅ | 🎯 `registrar_retorno` |
| Lançar itens de despesa | ✅ | ✅ | ✅ | 🎯 `registrar_despesa` |
| Enviar prestação de contas | ✅ | ✅ | ✅ | 🎯 `enviar_prestacao` |
| Visualizar comprovante (gestor) | ✅ | ✅ | 🎯 `aprovar_prestacao` | ❌ |
| Aprovar prestação de contas | ✅ | ✅ | 🎯 `aprovar_prestacao` | ❌ |
| Rejeitar prestação de contas | ✅ | ✅ | 🎯 `aprovar_prestacao` | ❌ |
| Cancelar solicitação | ✅ | ✅ | 🎯 `cancelar_processo` | ❌ |

### 7.5 Painel Servidor — Financeiro do TFD

| Ação | SUPERADMIN | ADMIN | GESTOR | SERVIDOR |
|---|---|---|---|---|
| Cadastrar saldo financeiro | ✅ | ✅ | 🎯 `gerenciar_saldo` | ❌ |
| Ver saldos disponíveis | ✅ | ✅ | 🎯 `gerenciar_saldo` | ❌ |
| Ver extrato de movimentações | ✅ | ✅ | 🎯 `gerenciar_saldo` | ❌ |
| Exportar extrato CSV (completo no período) | ✅ | ✅ | 🎯 `gerenciar_saldo` | ❌ |
| Inativar saldo (`ativo = false`, extrato preservado) | ✅ | ✅ | 🎯 `gerenciar_saldo` | ❌ |
| Dashboard financeiro e KPIs | ✅ | ✅ | 🎯 `ver_dashboard` | ❌ |
| Bloco Financeiro no dashboard (KPI consolidado, saldos em alerta, extrato 5 mov.) | ✅ | ✅ | 🎯 `ver_dashboard` | ❌ |
| Submenu **Financeiro** no sidebar TFD (Saldos / Prestações / Relatórios) | ✅ | ✅ | 🎯 item conforme permissão do link | ❌ |
| Exportar relatórios PDF (competência, paciente, prestador, motorista, produção) | ✅ | ✅ | 🎯 `exportar_relatorio` | ❌ |
| Exportar CSV das listagens (fila, agendamentos, prestações, saldos) | ✅ | ✅ | 🎯 `exportar_relatorio` | ❌ |

> Exportações registram `acao = EXPORT` apenas na Server Action de download, não na leitura paginada. Ver `BUSINESS_RULES.md` §1.12 e `API_CONTRACTS.md` §7.4–7.8.
>
> **Navegação Financeiro (Sprint 2.2):** Saldos → `gerenciar_saldo`; Prestações → `aprovar_prestacao`; Relatórios → `exportar_relatorio` (rota `/saude/tfd/dashboard`). Ver `modules/saude/tfd/src/utils/tfd-financeiro-nav.ts`.

### 7.6 Painel Dev — plataforma (sem permissão granular de tenant)

| Ação | Quem | Verificação |
|---|---|---|
| Exportar dados do município (JSON/CSV) | SUPERADMIN | `requireSuperAdmin()` — `tenantId` no input, não na sessão |
| Ver extrato de saldo TFD de qualquer tenant | SUPERADMIN | `requireSuperAdmin()` + queries em `apps/painel-dev/lib/queries/tfd-saldos.ts` |

Action: `exportarDadosMunicipio` em `apps/painel-dev/lib/actions/exportar-dados-municipio.ts`. Contrato: `API_CONTRACTS.md` §3.5.

---

## 8. Componente PermissionGate

Para renderização condicional no frontend baseada em papel ou permissão:

```typescript
// packages/ui/src/components/permission-gate.tsx

interface PermissionGateProps {
  session: SaudeMunicSession
  // Verificação por papel mínimo
  minimumRole?: UserRole
  // Verificação por permissão granular
  permission?: string
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function PermissionGate({ session, minimumRole, permission, children, fallback = null }) {
  if (minimumRole && !hasRole(session, minimumRole)) return <>{fallback}</>
  if (permission && !hasPermission(session, permission)) return <>{fallback}</>
  return <>{children}</>
}

// Uso no componente:
// <PermissionGate session={session} permission="saude.tfd.decidir_solicitacao">
//   <BotaoAprovar />
// </PermissionGate>
```

> **Regra:** o `PermissionGate` é apenas visual — nunca é a única proteção.
> A Server Action correspondente sempre verifica `requirePermission` no servidor.

---

## 9. Fluxo Completo de Autenticação

```
Servidor acessa o host do painel-servidor (ex.: `campograndems.<dominio-base>`)
  ↓
Middleware: Tenant Resolver identifica município pelo domínio
  ↓
Middleware: verifica sessão JWT válida
  ↓ (sem sessão)
Redireciona para /login
  ↓
Servidor informa e-mail + senha
  ↓
NextAuth.authorize(): busca user por (tenant_id, email) → valida senha
  ↓
JWT gerado com { id, tenantId, role, setorId, permissions }
  ↓
Servidor redirecionado para destino original
  ↓
Server Component / Server Action executa com verificação em 3 camadas
  ↓
Prisma + RLS → retorna apenas dados do município correto
```

---

## 10. Regras de Segurança de Autenticação

1. **Senhas:** mínimo 8 caracteres, hash com bcrypt (custo 12). Nunca em texto puro. Nunca em log.

2. **JWT:** expiração de 8 horas para servidores. Refresh automático pelo NextAuth.

3. **Tentativas de login:** bloquear após 5 tentativas falhas por 15 minutos. Registrar em `audit_logs`.

4. **SUPERADMIN:** acesso restrito por IP fixo configurado em variável de ambiente.

5. **Troca de senha:** exige senha atual. Token de recuperação expira em 1 hora. Uso único.

6. **`tenant_id` nunca vem do cliente:** sempre extraído do contexto de sessão JWT ou do Tenant Resolver. Qualquer `tenant_id` em body, query string ou parâmetro de URL é ignorado.

7. **Verificação em 3 camadas:** `assertModuleActive` → `requireTenantRole` → `requirePermission`. Obrigatória em toda Server Action.

8. **Módulo inativo → 404:** jamais 403. O município não deve saber da existência de módulos não contratados.

9. **Dados sensíveis no JWT:** o token não carrega CPF, CNS, CID, dados de saúde ou qualquer dado pessoal além do necessário para autorização.

10. **Alteração de permissão:** invalida sessão ativa do usuário afetado. O usuário precisa fazer login novamente para refletir as mudanças.

---

## 11. Variáveis de Ambiente de Autenticação

```env
# Segredo do JWT — mínimo 32 caracteres
AUTH_SECRET=

# URL base da aplicação
NEXTAUTH_URL=https://campograndems.<dominio-base>

# IPs permitidos para acesso ao Painel Dev (separados por vírgula)
SUPERADMIN_ALLOWED_IPS=

# Tempo de expiração do JWT em segundos (padrão: 8 horas)
JWT_EXPIRY=28800
```

---

## 12. Checklist de Autorização

Execute antes de commitar qualquer rota, Server Action ou componente com dados restritos:

- [ ] A action chama `assertModuleActive('saude', '{modulo}')` como primeira linha?
- [ ] A action chama `requireTenantRole(papel)` como segunda verificação?
- [ ] A action chama `requirePermission(session, chave)` para GESTOR/SERVIDOR?
- [ ] O papel mínimo foi verificado na matriz da seção 7?
- [ ] Para SERVIDOR: acesso limitado ao seu setor (`setorId` na sessão)?
- [ ] O `tenant_id` é lido da sessão JWT, nunca de parâmetro externo?
- [ ] Componentes visuais usam `PermissionGate` para ocultar ações não permitidas?
- [ ] A verificação ocorre no servidor (Server Action), nunca só no cliente?
- [ ] O audit log foi registrado para toda ação de escrita?
- [ ] Dados sensíveis (CID, CPF) não estão sendo retornados sem verificação?

---

## 13. Documentos Relacionados

- `ARCHITECTURE.md` — visão geral da hierarquia de acesso e painéis
- `MULTI_TENANT.md` — como o tenant_id é resolvido e injetado na sessão
- `DATABASE_SCHEMA.md` — tabelas `users` e `audit_logs`
- `BUSINESS_RULES.md` — regras de negócio que definem quem pode fazer o quê
- `SECURITY.md` — LGPD, auditoria e proteção de dados de saúde
