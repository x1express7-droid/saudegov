# MULTI_TENANT.md
# saudegov — Arquitetura Multi-Tenant

> **Instruções para o agente do Cursor:** Leia este arquivo antes de qualquer tarefa
> que envolva criação de rotas, queries ao banco, middleware, autenticação ou
> configuração de tema visual. O isolamento multi-tenant é a camada de segurança
> mais crítica da plataforma — qualquer código que acesse dados sem filtrar por
> `tenant_id` é uma falha grave de segurança.

---

## 1. Conceito Central

A plataforma serve múltiplos municípios simultaneamente em uma única infraestrutura.
Cada município é um **tenant** — completamente isolado dos demais em dados,
configurações e identidade visual, mas compartilhando o mesmo código e banco.

O isolamento acontece em **duas camadas independentes e complementares:**

```
Camada 1 → Aplicação  → Tenant Resolver Middleware injeta tenant_id no contexto
Camada 2 → Banco      → Row Level Security (RLS) rejeita queries sem tenant_id válido
```

A Camada 2 protege contra falhas na Camada 1. Mesmo que um bug no código esqueça
de filtrar por `tenant_id`, o banco recusa a query. As duas camadas devem estar
sempre ativas.

---

## 2. Identificação do Tenant

O tenant é identificado pelo **domínio da requisição**. Cada município tem seu
próprio domínio configurado:

```
campograndems.<dominio-base>   → município: Campo Grande/MS (subdomínio da plataforma)
altamirapa.<dominio-base>      → município: Altamira/PA
saude.campogrande.ms.gov.br    → município: Campo Grande (domínio próprio)
admin.<dominio-base>           → Painel Dev (não é tenant; ver ADMIN_DOMAIN)
```

> `<dominio-base>` é o domínio raiz configurado na implantação (ex.: zona Cloudflare apontando para a VPS). Não há domínio padrão embutido no projeto.

### Tabela `public.tenants` — campos de domínio

```sql
domain          VARCHAR(255) UNIQUE  -- subdomínio da plataforma (sempre presente)
domain_custom   VARCHAR(255) UNIQUE  -- domínio .gov.br (opcional)
```

O Tenant Resolver busca o município por qualquer um dos dois domínios.

---

## 3. Tenant Resolver — Next.js Middleware

O Tenant Resolver é o **primeiro código** executado em qualquer requisição.
Roda antes de qualquer lógica de negócio, autenticação ou renderização.

**Localização:** `apps/painel-servidor/middleware.ts` (usa o resolver do core)
**Package:** `@saude/core-auth`

```typescript
// packages/core-auth/src/tenant-resolver.ts

import type { NextRequest } from 'next/server'
import { getTenantByDomain } from '@saude/core-db'

export interface TenantContext {
  id: string
  slug: string
  name: string
  theme: Record<string, string>
  modules: Record<string, Record<string, boolean>>
  settings: Record<string, unknown>
}

export async function resolveTenant(req: NextRequest): Promise<TenantContext | null> {
  const host = req.headers.get('host') ?? ''
  const domain = host.replace(/^www\./, '').split(':')[0] ?? ''
  if (!domain) return null

  // Painel Dev não é tenant
  if (domain === process.env.ADMIN_DOMAIN) return null

  const tenant = await getTenantByDomain(domain)
  if (!tenant || !tenant.active) return null

  return {
    id: tenant.id,
    slug: tenant.slug,
    name: tenant.name,
    theme: tenant.theme as Record<string, string>,
    modules: tenant.modules as Record<string, Record<string, boolean>>,
    settings: tenant.settings as Record<string, unknown>,
  }
}
```

> **Cache:** durante o desenvolvimento o resolver consulta o banco em toda requisição (dados sempre frescos). Cache em memória com TTL e `invalidateTenantCache` serão implementados na **fase final**, antes do go-live em produção.

### Middleware do Painel Servidor

```typescript
// apps/painel-servidor/middleware.ts

import { NextRequest, NextResponse } from 'next/server'
import { resolveTenant } from '@saude/core-auth'
import { auth } from '@saude/core-auth'

const PUBLIC_PATHS = ['/login', '/recuperar-senha', '/redefinir-senha', '/api/auth']

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // 1. Resolve o tenant pelo domínio
  const tenant = await resolveTenant(req)
  if (!tenant) return NextResponse.rewrite(new URL('/404', req.url))

  // 2. Rotas públicas passam direto
  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    const res = NextResponse.next()
    res.headers.set('x-tenant-id', tenant.id)
    return res
  }

  // 3. Verifica autenticação
  const session = await auth()
  if (!session?.user) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // 4. Usuário pertence ao tenant?
  if (session.user.role !== 'SUPERADMIN' && session.user.tenantId !== tenant.id) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // 5. Injeta contexto via headers internos
  const res = NextResponse.next()
  res.headers.set('x-tenant-id', tenant.id)
  res.headers.set('x-tenant-slug', tenant.slug)
  res.headers.set('x-tenant-modules', JSON.stringify(tenant.modules))
  res.headers.set('x-tenant-theme', JSON.stringify(tenant.theme))
  res.headers.set('x-user-id', session.user.id)
  res.headers.set('x-user-role', session.user.role)
  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png|.*\\.jpg|.*\\.svg).*)'],
}
```

---

## 4. Leitura do Contexto em Server Components e Actions

```typescript
// packages/core-auth/src/get-tenant-context.ts

import { headers } from 'next/headers'
import type { TenantContext } from './tenant-resolver'

export async function getTenantContext(): Promise<TenantContext> {
  const h = await headers()
  const id = h.get('x-tenant-id')
  if (!id) throw new Error('Tenant context não encontrado. Middleware não executou.')

  return {
    id,
    slug: h.get('x-tenant-slug') ?? '',
    name: '',
    theme: JSON.parse(h.get('x-tenant-theme') ?? '{}'),
    modules: JSON.parse(h.get('x-tenant-modules') ?? '{}'),
    settings: {},
  }
}

// Verifica se módulo está ativo — retorna 404 se não
export async function assertModuleActive(sistema: string, modulo: string): Promise<void> {
  const tenant = await getTenantContext()
  const ativo = tenant.modules?.[sistema]?.[modulo]
  if (!ativo) {
    const { notFound } = await import('next/navigation')
    notFound() // → 404, nunca 403
  }
}
```

---

## 5. Row Level Security (RLS) — Isolamento no Banco

O RLS garante que **nenhuma query retorne dados de outro tenant**, independente
do que o código faça.

### Configuração nas tabelas

```sql
-- Padrão aplicado em TODAS as tabelas de negócio
ALTER TABLE {schema}.{tabela} ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON {schema}.{tabela}
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
```

**Exceções (sem RLS):**
- `public.tenants` — lida pelo Tenant Resolver antes do contexto estar disponível
- `public.audit_logs` — SUPERADMIN precisa ler de todos os tenants
- `public.platform_features` — dado global da plataforma, sem tenant

### Prisma com RLS

```typescript
// packages/core-db/src/tenant-client.ts

import { PrismaClient } from '@prisma/client'
import { prisma } from './prisma'

// USE SEMPRE ESTA FUNÇÃO — nunca use `prisma` diretamente em código de negócio
export async function getPrismaForTenant(tenantId: string) {
  await prisma.$executeRaw`
    SELECT set_config('app.current_tenant_id', ${tenantId}, TRUE)
  `
  return prisma
}
```

### Uso correto em Server Actions

```typescript
// ✅ CORRETO — sempre getPrismaForTenant
import { getPrismaForTenant } from '@saude/core-db'
import { getTenantContext } from '@saude/core-auth'

export async function getSolicitacoesTfd() {
  const tenant = await getTenantContext()
  const db = await getPrismaForTenant(tenant.id)

  return db.tfdSolicitacao.findMany({
    where: { tenant_id: tenant.id }, // explícito além do RLS
    orderBy: { created_at: 'desc' },
  })
}

// ❌ ERRADO — nunca usar prisma direto
import { prisma } from '@saude/core-db'
export async function getSolicitacoesTfd() {
  return prisma.tfdSolicitacao.findMany() // FALHA DE SEGURANÇA CRÍTICA
}
```

---

## 6. Verificação de Módulo Ativo

```typescript
// Em Server Components
import { getTenantContext } from '@saude/core-auth'
import { notFound } from 'next/navigation'

export default async function TfdPage() {
  const tenant = await getTenantContext()

  // Módulo inativo → 404 (nunca 403)
  if (!tenant.modules?.saude?.tfd) notFound()

  // ... renderiza a página
}

// Em Server Actions
import { assertModuleActive } from '@saude/core-auth'

export async function abrirSolicitacaoTfd(input: AbrirInput) {
  await assertModuleActive('saude', 'tfd') // primeira linha, sempre
  // ...
}
```

---

## 7. Tema Visual por Tenant

O tema é carregado no layout raiz e aplicado via CSS custom properties.

```typescript
// apps/painel-servidor/app/layout.tsx

import { getTenantContext } from '@saude/core-auth'

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const tenant = await getTenantContext()
  const { theme } = tenant

  const cssVars = {
    '--color-primary': theme.primaryColor ?? '#1a5fa8',
    '--color-header-bg': theme.headerBgColor ?? theme.primaryColor ?? '#1a5fa8',
    '--color-header-text': theme.headerTextColor ?? '#ffffff',
  }

  return (
    <html lang="pt-BR">
      <head>
        <title>{theme.municipalityName ?? 'Sistema de Saúde'}</title>
        {theme.faviconUrl && <link rel="icon" href={theme.faviconUrl} />}
      </head>
      <body style={cssVars as React.CSSProperties}>
        {children}
      </body>
    </html>
  )
}
```

---

## 8. Configuração de Domínio via Cloudflare API

Ao cadastrar um município no Painel Dev, o sistema chama a API do Cloudflare
automaticamente para criar o subdomínio.

```typescript
// packages/core-auth/src/cloudflare-domains.ts

export async function criarSubdominio(slug: string): Promise<string> {
  // slug: 'campo-grande-ms'
  // domínio criado: campograndems.<dominio-base> (domínio base da implantação)
  const subdomain = slug.replace(/-/g, '')
  const fullDomain = `${subdomain}.<dominio-base>`

  await fetch(`https://api.cloudflare.com/client/v4/zones/${process.env.CF_ZONE_ID}/dns_records`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.CF_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: 'CNAME',
      name: subdomain,
      content: 'cname.vercel-dns.com',
      proxied: true,
    }),
  })

  return fullDomain
}

export async function registrarDominioCustomizado(domain: string): Promise<void> {
  // Registra domínio .gov.br apontado pelo município
  await fetch(`https://api.cloudflare.com/client/v4/zones/${process.env.CF_ZONE_ID}/dns_records`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.CF_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: 'CNAME',
      name: domain,
      content: 'cname.vercel-dns.com',
      proxied: true,
    }),
  })
}
```

---

## 9. Processo para Adicionar Novo Município

Executado via Painel Dev:

```
1. SUPERADMIN preenche formulário:
   - Nome do município, slug, CNPJ, endereço
   - Opção de domínio (subdomínio automático ou .gov.br)
   - Tema visual (cores, logo)
   - Módulos a ativar

2. Sistema cria registro em public.tenants

3. Sistema chama API do Cloudflare → cria subdomínio automaticamente

4. Sistema cria o primeiro usuário ADMIN do município
   (senha temporária gerada e exibida uma única vez)

5. Sistema registra em audit_logs com acao = 'TENANT_CRIADO'
```

---

## 10. Processo para Suspender Município

```sql
-- Suspensão: todos os dados preservados, acesso bloqueado
UPDATE public.tenants SET active = false WHERE id = 'uuid-do-tenant';
```

O Tenant Resolver retorna `null` para tenants inativos → middleware retorna 404.
Todos os dados permanecem intactos no banco.

Para **reativar**: `UPDATE public.tenants SET active = true` — na próxima requisição o resolver já enxerga o tenant ativo.

---

## 11. Exportação de Dados por Município

```typescript
// Filtrar TUDO por tenant_id — nenhum dado de outro município sai junto
export async function exportarDadosMunicipio(tenantId: string) {
  const db = await getPrismaForTenant(tenantId)

  // RLS garante isolamento + tenant_id explícito como segunda camada
  const dados = {
    pacientes: await db.saudeBasePaciente.findMany({
      where: { tenant_id: tenantId }
    }),
    solicitacoes: await db.saudeTfdSolicitacao.findMany({
      where: { tenant_id: tenantId }
    }),
    // ... demais tabelas
  }

  // Registrar exportação em audit_logs
  await createAuditLog({
    tenantId,
    acao: 'EXPORT',
    entidade: 'tenant_completo',
    payloadDepois: { timestamp: new Date(), solicitadoPor: 'superadmin' }
  })

  return dados
}
```

---

## 12. Checklist de Segurança Multi-Tenant

Execute antes de commitar qualquer código que acesse dados:

- [ ] A query usa `getPrismaForTenant(tenant.id)` e não `prisma` diretamente?
- [ ] O `where` da query inclui `tenant_id` explicitamente além do RLS?
- [ ] A rota verificou se o módulo está ativo (`assertModuleActive`)?
- [ ] O `tenant_id` foi lido de `getTenantContext()` e não de parâmetros da URL?
- [ ] Nenhum `tenant_id` foi aceito como input do usuário?
- [ ] Dados retornados pela API não expõem `tenant_id` desnecessariamente?
- [ ] Logs da operação não incluem dados sensíveis do paciente?

---

## 13. Erros Comuns e Como Evitar

| Erro | Causa | Solução |
|---|---|---|
| Dados de outro município aparecendo | RLS desabilitado ou `prisma` usado direto | Sempre `getPrismaForTenant`, RLS obrigatório |
| Tenant não resolvido em Server Component | Middleware não cobre a rota | Verificar `matcher` no `middleware.ts` |
| Módulo 403 em vez de 404 | Verificação retorna proibido | Usar `notFound()` do Next.js |
| `tenant_id` aceito da URL | Input não validado | `tenant_id` vem sempre de `getTenantContext()` |

---

## 14. Variáveis de Ambiente

```env
# Domínio do Painel Dev (não é tenant)
ADMIN_DOMAIN=admin.plataforma.exemplo

# Cloudflare
CF_API_TOKEN=        # token com permissão de DNS edit
CF_ZONE_ID=          # ID da zona DNS do domínio-base no Cloudflare

# Banco
DATABASE_URL=postgresql://user:pass@host:5432/saudegov?schema=public
```

---

## 15. Documentos Relacionados

- `ARCHITECTURE.md` — decisões de infraestrutura e isolamento
- `DATABASE_SCHEMA.md` — schema completo com políticas RLS por tabela
- `AUTH_PERMISSIONS.md` — como o tenant_id interage com o sistema de permissões
- `SECURITY.md` — exportação de dados, LGPD e auditoria por tenant
