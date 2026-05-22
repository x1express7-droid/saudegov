# MONOREPO.md
# saudegov — Estrutura do Monorepo

> **Instruções para o agente do Cursor:** Consulte este arquivo antes de criar
> qualquer arquivo, pasta, package ou import. Nunca crie arquivos fora da estrutura
> definida aqui. Nunca importe de um módulo dentro de outro módulo — use sempre
> o core. A estrutura abaixo é a fonte de verdade para onde cada tipo de código vive.

---

## 1. Estrutura Completa de Diretórios

```
saude-munic/
│
├── apps/
│   ├── painel-dev/              → Painel do desenvolvedor (porta 3000)
│   └── painel-servidor/         → Operação dos municípios (porta 3001)
│
├── packages/                    → Código compartilhado entre apps e módulos
│   ├── core-auth/               → @saude/core-auth
│   ├── core-db/                 → @saude/core-db
│   ├── core-documents/          → @saude/core-documents
│   ├── core-notifications/      → @saude/core-notifications
│   ├── ui/                      → @saude/ui
│   └── validators/              → @saude/validators
│
├── modules/                     → Módulos de negócio por sistema
│   └── saude/                   → Sistema de Saúde
│       └── tfd/                 → @saude/mod-saude-tfd (MVP)
│
├── docs/                        → Documentação lida pelo agente do Cursor
│   ├── ARCHITECTURE.md
│   ├── MUNICIPAL_MAP.md
│   ├── DATABASE_SCHEMA.md
│   ├── AUTH_PERMISSIONS.md
│   ├── BUSINESS_RULES.md
│   ├── MULTI_TENANT.md
│   ├── MONOREPO.md              ← este arquivo
│   ├── CODING_STANDARDS.md
│   ├── API_CONTRACTS.md
│   ├── DESIGN_SYSTEM.md
│   ├── SECURITY.md
│   ├── CADSUS.md
│   ├── SPRINTS.md
│   └── PROMPT_TEMPLATES.md
│
├── turbo.json
├── package.json                 → workspaces e scripts globais
├── tsconfig.base.json           → TypeScript base compartilhado
├── .env.example
├── .gitignore
├── .cursorrules                 → Instruções permanentes do agente
└── README.md
```

---

## 2. Estrutura Interna de Cada App

```
apps/painel-servidor/
│
├── app/                         → App Router do Next.js
│   ├── (auth)/                  → rotas sem autenticação
│   │   ├── login/
│   │   │   └── page.tsx
│   │   ├── recuperar-senha/
│   │   │   └── page.tsx
│   │   └── redefinir-senha/
│   │       └── [token]/
│   │           └── page.tsx
│   │
│   ├── (servidor)/              → rotas protegidas (SERVIDOR+)
│   │   ├── layout.tsx           → verifica sessão + tenant
│   │   ├── dashboard/
│   │   │   └── page.tsx
│   │   └── saude/
│   │       └── tfd/             → módulo TFD
│   │           ├── page.tsx     → fila de solicitações
│   │           ├── nova/
│   │           │   └── page.tsx → nova solicitação
│   │           ├── [id]/
│   │           │   └── page.tsx → detalhe da solicitação
│   │           ├── agendamentos/
│   │           │   └── page.tsx
│   │           ├── prestacoes/
│   │           │   └── page.tsx
│   │           └── dashboard/
│   │               └── page.tsx → dashboard TFD (GESTOR+)
│   │
│   ├── (admin)/                 → rotas protegidas (ADMIN+)
│   │   ├── layout.tsx
│   │   ├── configuracoes/
│   │   │   ├── organograma/
│   │   │   ├── servidores/
│   │   │   ├── responsaveis/
│   │   │   └── tema/
│   │   └── saude/
│   │       └── tfd/
│   │           └── configuracoes/
│   │               ├── especialidades/
│   │               ├── procedimentos/
│   │               ├── prestadores/
│   │               ├── veiculos/
│   │               └── motoristas/
│   │
│   ├── api/
│   │   └── auth/
│   │       └── [...nextauth]/
│   │           └── route.ts
│   │
│   └── layout.tsx               → layout raiz com tema do tenant
│
├── components/                  → componentes exclusivos deste app
├── lib/                         → utilitários exclusivos deste app
├── middleware.ts                → Tenant Resolver + Auth Guard
├── next.config.ts
├── package.json
├── tsconfig.json
└── tailwind.config.ts
```

```
apps/painel-dev/
│
├── app/
│   ├── (auth)/
│   │   └── login/
│   │       └── page.tsx
│   │
│   └── (dev)/                   → rotas protegidas (SUPERADMIN + IP)
│       ├── layout.tsx
│       ├── dashboard/
│       │   └── page.tsx
│       ├── municipios/
│       │   ├── page.tsx         → listagem de municípios
│       │   ├── novo/
│       │   │   └── page.tsx     → cadastrar município
│       │   └── [id]/
│       │       └── page.tsx     → configurar município
│       ├── audit-logs/
│       │   └── page.tsx
│       └── platform-features/
│           └── page.tsx         → registro de funcionalidades
│
├── middleware.ts                → IP allowlist + Auth Guard
└── ...
```

---

## 3. Estrutura Interna dos Packages do Core

```
packages/core-auth/
├── src/
│   ├── index.ts                 → barrel exports
│   ├── auth.config.ts           → configuração NextAuth
│   ├── tenant-resolver.ts       → Tenant Resolver
│   ├── get-tenant-context.ts    → getTenantContext, assertModuleActive
│   ├── authorization.ts         → requireAuth, requireTenantRole, requirePermission
│   ├── cloudflare-domains.ts    → API Cloudflare para domínios
│   ├── crypto.ts                → hash de senha
│   ├── masking.ts               → maskCPF, maskEmail, maskToken
│   └── types/
│       └── session.ts           → SaudeMunicSession, UserRole
├── package.json
└── tsconfig.json

packages/core-db/
├── prisma/
│   ├── schema.prisma            → schema multi-schema
│   ├── migrations/              → migrations versionadas
│   └── seed.ts                  → seed de desenvolvimento
├── src/
│   ├── index.ts
│   ├── prisma.ts                → instância global do Prisma
│   └── tenant-client.ts         → getPrismaForTenant com RLS
├── package.json
└── tsconfig.json

packages/core-documents/
├── src/
│   ├── index.ts
│   ├── protocol.ts              → gerarProtocolo (formato: 2025-SAUDE-TFD-000001)
│   ├── tramitacao.ts            → registrarTramitacao, getTramitacoes
│   ├── audit.ts                 → createAuditLog com sanitização
│   └── storage.ts               → solicitarUrlUpload, confirmarUpload (S3/R2)
├── package.json
└── tsconfig.json

packages/core-notifications/
├── src/
│   ├── index.ts
│   ├── dispatcher.ts            → dispararNotificacao
│   ├── email.ts                 → envio de e-mail
│   ├── inapp.ts                 → notificações in-app
│   └── templates/               → templates de mensagem por evento
├── package.json
└── tsconfig.json

packages/ui/
├── src/
│   ├── index.ts
│   ├── tokens.css               → CSS custom properties do design system
│   └── components/
│       ├── button.tsx
│       ├── input.tsx
│       ├── select.tsx
│       ├── textarea.tsx
│       ├── card.tsx
│       ├── badge.tsx
│       ├── data-table.tsx
│       ├── page-header.tsx
│       ├── sidebar.tsx
│       ├── empty-state.tsx
│       ├── status-badge.tsx     → badges de status TFD com cores
│       ├── urgencia-badge.tsx   → BAIXA / INTERMEDIARIA / GRAVE / MUITO_URGENTE
│       ├── protocolo-badge.tsx  → exibe protocolo em fonte mono
│       ├── tramitacao-timeline.tsx
│       ├── file-upload.tsx      → upload de laudos e comprovantes
│       └── permission-gate.tsx  → renderização condicional por permissão
├── package.json
└── tsconfig.json

packages/validators/
├── src/
│   ├── index.ts
│   ├── action-response.ts       → tipo ActionResponse<T>
│   ├── errors.ts                → classes de erro padronizadas
│   ├── cpf.ts                   → validador CPF
│   ├── cns.ts                   → validador CNS (Cartão Nacional de Saúde)
│   ├── cnpj.ts                  → validador CNPJ
│   └── cep.ts                   → validador e lookup de CEP
├── package.json
└── tsconfig.json
```

---

## 4. Estrutura Interna de Cada Módulo de Negócio

```
modules/saude/tfd/
│
├── src/
│   ├── index.ts                 → barrel exports do módulo
│   │
│   ├── permissions.ts           → catálogo de permissões TFD_PERMISSIONS
│   │
│   ├── actions/                 → Server Actions (lógica de negócio com efeito)
│   │   ├── solicitacao.ts       → abrir, enviar, cancelar
│   │   ├── regulacao.ts         → iniciar análise, solicitar complemento
│   │   ├── decisao.ts           → aprovar, negar
│   │   ├── viagem.ts            → criar agendamento, registrar retorno
│   │   ├── financeiro.ts        → registrar despesa, enviar/aprovar prestação
│   │   └── configuracao.ts      → CRUD especialidades, prestadores, frota, saldo
│   │
│   ├── queries/                 → leitura de dados (sem efeito colateral)
│   │   ├── get-solicitacoes.ts  → listagem com filtros e paginação
│   │   ├── get-solicitacao.ts   → detalhe por ID
│   │   ├── get-agendamentos.ts
│   │   ├── get-prestacoes.ts
│   │   ├── get-saldos.ts
│   │   ├── get-dashboard.ts     → KPIs e métricas
│   │   └── get-extrato.ts       → extrato financeiro do saldo
│   │
│   ├── validators/              → schemas Zod específicos do módulo
│   │   ├── solicitacao.schema.ts
│   │   ├── agendamento.schema.ts
│   │   ├── despesa.schema.ts
│   │   └── configuracao.schema.ts
│   │
│   ├── types/                   → tipos TypeScript do módulo
│   │   └── tfd.types.ts
│   │
│   └── utils/                   → utilitários do módulo
│       ├── cadsus.ts            → integração CADSUS (stub → real)
│       ├── saldo.ts             → cálculo de saldo disponível
│       └── prazos.ts            → cálculo de prazos (10 dias PC, etc.)
│
├── package.json
└── tsconfig.json
```

---

## 5. Regras de Importação entre Packages

Esta é a regra mais importante do monorepo. Violá-la cria acoplamento incorreto.

```
APPS         → podem importar de packages/* e modules/*
MODULES      → podem importar de packages/* APENAS
PACKAGES     → podem importar de outros packages/* APENAS

❌ Módulo nunca importa de outro módulo
❌ Package do core nunca importa de módulo
❌ Package nunca importa de app
```

### Exemplos corretos

```typescript
// ✅ App importa de package
import { getTenantContext } from '@saude/core-auth'
import { Button } from '@saude/ui'

// ✅ App importa de módulo
import { getSolicitacoesTfd } from '@saude/mod-saude-tfd'

// ✅ Módulo importa de package
import { requireTenantRole } from '@saude/core-auth'
import { getPrismaForTenant } from '@saude/core-db'
import { gerarProtocolo } from '@saude/core-documents'
```

### Exemplos proibidos

```typescript
// ❌ Módulo importando de outro módulo (quando existirem)
import { getPaciente } from '@saude/mod-saude-regul' // PROIBIDO

// ❌ Package importando de módulo
import { getTfdSolicitacao } from '@saude/mod-saude-tfd' // PROIBIDO em package
```

---

## 6. Convenções de Arquivo por Tipo

| Tipo | Onde fica | Nomenclatura |
|---|---|---|
| Página Next.js | `app/**/page.tsx` | `page.tsx` |
| Layout Next.js | `app/**/layout.tsx` | `layout.tsx` |
| Server Action | `modules/*/src/actions/` | `{entidade}.ts` |
| Query de leitura | `modules/*/src/queries/` | `get-{entidade}.ts` |
| Schema Zod | `modules/*/src/validators/` | `{entidade}.schema.ts` |
| Tipos TypeScript | `*/src/types/` | `{entidade}.types.ts` |
| Componente React | `packages/ui/src/components/` | `kebab-case.tsx` |
| Hook React | `packages/ui/src/hooks/` | `use-{nome}.ts` |
| Utilitário puro | `*/src/utils/` | `{nome}.ts` |
| Migration Prisma | `packages/core-db/prisma/migrations/` | `YYYYMMDDHHMMSS_{descricao}/` |

---

## 7. Package.json Raiz

```json
{
  "name": "saude-munic",
  "private": true,
  "workspaces": ["apps/*", "packages/*", "modules/*", "modules/saude/*"],
  "scripts": {
    "dev": "turbo dev",
    "dev:dev": "turbo dev --filter=@saude/app-painel-dev",
    "dev:servidor": "turbo dev --filter=@saude/app-painel-servidor",
    "build": "turbo build",
    "lint": "turbo lint",
    "type-check": "turbo type-check",
    "db:generate": "turbo db:generate --filter=@saude/core-db",
    "db:migrate": "turbo db:migrate --filter=@saude/core-db",
    "db:studio": "cd packages/core-db && npx prisma studio"
  },
  "engines": {
    "node": ">=20.0.0",
    "npm": ">=10.0.0"
  }
}
```

---

## 8. tsconfig Base Compartilhado

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "skipLibCheck": true,
    "paths": {
      "@saude/core-auth":            ["../../packages/core-auth/src/index.ts"],
      "@saude/core-db":              ["../../packages/core-db/src/index.ts"],
      "@saude/core-documents":       ["../../packages/core-documents/src/index.ts"],
      "@saude/core-notifications":   ["../../packages/core-notifications/src/index.ts"],
      "@saude/ui":                   ["../../packages/ui/src/index.ts"],
      "@saude/validators":           ["../../packages/validators/src/index.ts"],
      "@saude/mod-saude-tfd":        ["../../modules/saude/tfd/src/index.ts"]
    }
  }
}
```

---

## 9. Portas de Desenvolvimento Local

| App | Porta | Comando |
|---|---|---|
| `painel-dev` | 3000 | `npm run dev:dev` |
| `painel-servidor` | 3001 | `npm run dev:servidor` |

```env
# apps/painel-servidor/.env.local
NEXTAUTH_URL=http://localhost:3001
DEV_TENANT_SLUG=campo-grande-ms   # tenant simulado localmente
```

---

## 10. Documentos Relacionados

- `ARCHITECTURE.md` — decisões que definem a estrutura do monorepo
- `CODING_STANDARDS.md` — convenções de código dentro de cada arquivo
- `MUNICIPAL_MAP.md` — nomenclatura de packages e schemas por módulo
