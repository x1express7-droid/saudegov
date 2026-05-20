# CODING_STANDARDS.md
# saudegov — Padrões de Código

> **Instruções para o agente do Cursor:** Consulte este arquivo antes de escrever
> qualquer código. Todos os padrões aqui definidos são obrigatórios. Quando gerar
> código novo, siga exatamente as estruturas e nomenclaturas definidas aqui.
> Consistência entre arquivos gerados por IA e humanos depende desta documentação.

---

## 1. Princípios Fundamentais

1. **Servidor primeiro:** toda lógica de negócio, validação e acesso a dados
   acontece no servidor. O cliente recebe apenas dados prontos para exibição.

2. **Explícito sobre implícito:** código verboso e claro vale mais que código
   compacto e ambíguo.

3. **Falhe cedo:** valide inputs no início da função. Se algo estiver errado,
   retorne o erro imediatamente.

4. **Tipagem estrita:** TypeScript `strict: true`. Nenhum `any` — use `unknown`
   e faça o narrowing correto.

5. **Sem efeitos colaterais ocultos:** função com nome `get*` nunca altera estado.

---

## 2. Nomenclatura

### Arquivos e pastas
```
kebab-case para tudo
✅ get-solicitacoes.ts, tenant-resolver.ts, status-badge.tsx
❌ getSolicitacoes.ts, TenantResolver.ts, StatusBadge.tsx

Exceções obrigatórias do Next.js:
  page.tsx, layout.tsx, loading.tsx, error.tsx, not-found.tsx, route.ts
```

### Variáveis e funções
```typescript
// camelCase
const tenantId = '...'
const prazoEnvioAt = new Date()

// Prefixos obrigatórios por tipo de função:
get*      → leitura sem efeito     → getSolicitacoesTfd, getTenantContext
create*   → criação de registro    → createAuditLog, criarAgendamento
update*   → atualização            → updateStatusSolicitacao
delete*   → remoção                → deleteVeiculo
handle*   → event handler          → handleSubmit, handleAprovar
require*  → verifica + redireciona → requireAuth, requireTenantRole
assert*   → verifica + lança erro  → assertModuleActive
calc*     → cálculo                → calcPrazoPC, calcSaldoDisponivel
format*   → formata para exibição  → formatProtocolo, formatData
```

### Tipos e interfaces
```typescript
// PascalCase
type UserRole = 'SUPERADMIN' | 'ADMIN' | 'GESTOR' | 'SERVIDOR'

// Sufixos obrigatórios:
*Input    → dados de entrada de uma action   → AbrirSolicitacaoInput
*Output   → dados de saída                   → SolicitacaoOutput
*Response → resposta de API                  → ApiResponse<T>
*Context  → contexto injetado                → TenantContext
*Schema   → schema Zod (camelCase — é var)   → abrirSolicitacaoSchema
```

### Constantes
```typescript
// UPPER_SNAKE_CASE
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024
const PRAZO_PRESTACAO_DIAS = 10
const MIN_DISTANCIA_TFD_KM = 50
```

---

## 3. Estrutura Obrigatória de Server Action

Todo Server Action segue esta ordem de blocos, sem exceção:

```typescript
'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { assertModuleActive, requireTenantRole, requirePermission } from '@saude/core-auth'
import { getPrismaForTenant } from '@saude/core-db'
import { gerarProtocolo, createAuditLog, registrarTramitacao } from '@saude/core-documents'
import { dispararNotificacao } from '@saude/core-notifications'
import { abrirSolicitacaoSchema } from '../validators/solicitacao.schema'
import type { ActionResponse } from '@saude/validators'
import { TFD_PERMISSIONS } from '../permissions'

export async function abrirSolicitacaoTfd(
  rawInput: unknown
): Promise<ActionResponse<{ protocolo: string }>> {

  // BLOCO 1: Verificar módulo ativo
  await assertModuleActive('saude', 'tfd')

  // BLOCO 2: Verificar autenticação e papel mínimo
  const session = await requireTenantRole('SERVIDOR')

  // BLOCO 3: Verificar permissão granular
  await requirePermission(session, TFD_PERMISSIONS.ABRIR_SOLICITACAO)

  // BLOCO 4: Validar input com Zod — NUNCA usar rawInput após esta linha
  const parsed = abrirSolicitacaoSchema.safeParse(rawInput)
  if (!parsed.success) {
    return {
      success: false,
      error: 'Dados inválidos.',
      fieldErrors: parsed.error.flatten().fieldErrors,
    }
  }
  const data = parsed.data

  // BLOCO 5: Lógica de negócio
  try {
    const db = await getPrismaForTenant(session.user.tenantId!)

    const protocolo = await gerarProtocolo(
      session.user.tenantId!,
      'SAUDE',
      'TFD',
      db
    )

    const resultado = await db.$transaction(async (tx) => {
      const processo = await tx.processo.create({
        data: {
          tenant_id: session.user.tenantId!,
          protocolo,
          modulo: 'saude.tfd',
          status: 'ABERTO',
          titulo: `TFD — ${data.especialidadeId}`,
          aberto_por_id: session.user.id,
        },
      })

      await tx.saudeTfdSolicitacao.create({
        data: {
          tenant_id: session.user.tenantId!,
          processo_id: processo.id,
          // ... demais campos
        },
      })

      return processo
    })

    // BLOCO 6: Auditoria
    await createAuditLog({
      tenantId: session.user.tenantId!,
      userId: session.user.id,
      acao: 'CREATE',
      entidade: 'saude_tfd_solicitacao',
      entidadeId: resultado.id,
      payloadDepois: { protocolo, modulo: 'saude.tfd' },
    })

    // BLOCO 7: Notificações
    await dispararNotificacao({
      tenantId: session.user.tenantId!,
      evento: 'SOLICITACAO_TFD_ENVIADA',
      processoId: resultado.id,
    })

    // BLOCO 8: Revalidar cache das páginas afetadas
    revalidatePath('/saude/tfd')

    // BLOCO 9: Retorno de sucesso
    return { success: true, data: { protocolo } }

  } catch (error) {
    // BLOCO 10: Tratamento de erro — log sem dados sensíveis
    console.error('[abrirSolicitacaoTfd] Erro:', {
      tenantId: session.user.tenantId,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    })
    return {
      success: false,
      error: 'Não foi possível registrar a solicitação. Tente novamente.',
    }
  }
}
```

---

## 4. Tipo Padrão de Resposta de Action

```typescript
// packages/validators/src/action-response.ts

export type ActionResponse<T = void> =
  | { success: true; data: T extends void ? undefined : T }
  | { success: false; error: string; fieldErrors?: Partial<Record<string, string[]>> }

// Uso no cliente:
const response = await abrirSolicitacaoTfd(formData)
if (!response.success) {
  setError(response.error)
  return
}
const { protocolo } = response.data
```

---

## 5. Estrutura de Queries de Leitura

```typescript
// modules/saude/tfd/src/queries/get-solicitacoes.ts

import { requireTenantRole, assertModuleActive } from '@saude/core-auth'
import { getPrismaForTenant } from '@saude/core-db'
import type { TfdSolicitacaoListItem } from '../types/tfd.types'

interface Filtros {
  status?: string
  urgencia?: string
  page?: number
  perPage?: number
}

export async function getSolicitacoesTfd(
  filtros: Filtros = {}
): Promise<{ items: TfdSolicitacaoListItem[]; total: number }> {
  await assertModuleActive('saude', 'tfd')
  const session = await requireTenantRole('SERVIDOR')

  const { page = 1, perPage = 20, ...where } = filtros
  const db = await getPrismaForTenant(session.user.tenantId!)

  // SERVIDOR: apenas do seu setor | GESTOR/ADMIN: todos do tenant
  const setorFilter = session.user.role === 'SERVIDOR'
    ? { setor_id: session.user.setorId }
    : {}

  const whereClause = {
    tenant_id: session.user.tenantId!, // sempre explícito além do RLS
    ...setorFilter,
    ...(where.status ? { status: where.status } : {}),
  }

  const [items, total] = await Promise.all([
    db.saudeTfdSolicitacao.findMany({
      where: whereClause,
      select: {
        id: true,
        processo: { select: { protocolo: true, status: true } },
        especialidade: { select: { nome: true } },
        urgencia: true,
        tipo_atendimento: true,
        created_at: true,
        // ❌ NUNCA selecionar: cid_principal, diagnostico
      },
      orderBy: { created_at: 'desc' },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    db.saudeTfdSolicitacao.count({ where: whereClause }),
  ])

  return { items: items.map(mapToListItem), total }
}
```

---

## 6. Schemas Zod — Padrão de Validação

```typescript
// modules/saude/tfd/src/validators/solicitacao.schema.ts

import { z } from 'zod'

export const abrirSolicitacaoSchema = z.object({
  pacienteId: z.string().uuid('ID de paciente inválido.'),
  especialidadeId: z.string().uuid('Especialidade inválida.'),
  procedimentos: z.array(z.string().uuid()).min(1, 'Selecione pelo menos um procedimento.'),
  prestadorId: z.string().uuid('Prestador inválido.'),
  tipoAtendimento: z.enum(['CONSULTA', 'RETORNO', 'EXAME', 'CIRURGIA'], {
    errorMap: () => ({ message: 'Tipo de atendimento inválido.' }),
  }),
  solicitacaoOrigemId: z.string().uuid().optional(),
  urgencia: z.enum(['BAIXA', 'INTERMEDIARIA', 'GRAVE', 'MUITO_URGENTE']),
  laudoAnexoId: z.string().uuid('Laudo obrigatório.'),
  acompanhanteNecessario: z.boolean().default(false),
  acompanhante: z.object({
    nome: z.string().min(3).max(200),
    cpf: z.string().length(11, 'CPF deve ter 11 dígitos.'),
    relacao: z.enum(['CONJUGE', 'FILHO_A', 'PAI_MAE', 'RESPONSAVEL_LEGAL', 'CUIDADOR', 'OUTRO']),
    telefone: z.string().optional(),
  }).optional(),
}).refine(
  (data) => {
    // RETORNO exige solicitacao_origem_id
    if (data.tipoAtendimento === 'RETORNO' && !data.solicitacaoOrigemId) return false
    return true
  },
  { message: 'Retorno exige vínculo com consulta anterior.', path: ['solicitacaoOrigemId'] }
).refine(
  (data) => {
    // Acompanhante necessário exige dados do acompanhante
    if (data.acompanhanteNecessario && !data.acompanhante) return false
    return true
  },
  { message: 'Informe os dados do acompanhante.', path: ['acompanhante'] }
)
```

---

## 7. Componentes React — Padrões

### Server Component (padrão — use sempre que possível)

```typescript
// apps/painel-servidor/app/(servidor)/saude/tfd/page.tsx
// Sem 'use client' — Server Component por padrão

import { notFound } from 'next/navigation'
import { getTenantContext, requireTenantRole } from '@saude/core-auth'
import { getSolicitacoesTfd } from '@saude/mod-saude-tfd'
import { SolicitacaoLista } from './components/solicitacao-lista'

export default async function TfdPage() {
  const tenant = await getTenantContext()
  if (!tenant.modules?.saude?.tfd) notFound()

  const session = await requireTenantRole('SERVIDOR')
  const { items, total } = await getSolicitacoesTfd()

  return <SolicitacaoLista items={items} total={total} />
}
```

### Client Component (apenas quando necessário)

```typescript
// apps/painel-servidor/app/(servidor)/saude/tfd/components/solicitacao-form.tsx
'use client'

// Apenas para: interatividade, estado local, eventos do browser
// Nunca acessar banco diretamente — receber dados via props do Server Component

import { useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { abrirSolicitacaoTfd } from '@saude/mod-saude-tfd'
import { abrirSolicitacaoSchema } from '@saude/mod-saude-tfd'
import { Button } from '@saude/ui'

export function SolicitacaoForm() {
  const [isPending, startTransition] = useTransition()
  const [serverError, setServerError] = useState<string | null>(null)

  const form = useForm({
    resolver: zodResolver(abrirSolicitacaoSchema),
  })

  async function onSubmit(data: unknown) {
    setServerError(null)
    startTransition(async () => {
      const response = await abrirSolicitacaoTfd(data)
      if (!response.success) {
        setServerError(response.error)
        return
      }
      // redirecionar para detalhe com response.data.protocolo
    })
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      {serverError && <p role="alert" className="text-red-600">{serverError}</p>}
      <Button type="submit" disabled={isPending}>
        {isPending ? 'Enviando...' : 'Enviar Solicitação'}
      </Button>
    </form>
  )
}
```

---

## 8. Padrões de Query ao Banco (Prisma)

```typescript
// ✅ CORRETO — sempre getPrismaForTenant, sempre tenant_id explícito
const db = await getPrismaForTenant(session.user.tenantId!)
const solicitacao = await db.saudeTfdSolicitacao.findUnique({
  where: {
    id: solicitacaoId,
    tenant_id: session.user.tenantId!, // explícito além do RLS
  },
})

// ✅ CORRETO — verificar null antes de usar
if (!solicitacao) {
  return { success: false, error: 'Solicitação não encontrada.' }
}

// ✅ CORRETO — select explícito, nunca buscar tudo
const paciente = await db.saudeBasePaciente.findUnique({
  where: { id: pacienteId, tenant_id: tenantId },
  select: {
    id: true,
    nome: true,
    cpf: true,
    cns: true,
    data_nascimento: true,
    // ❌ Nunca: cid_principal, diagnostico (esses ficam em solicitacoes)
  },
})

// ✅ CORRETO — transação para operações que afetam múltiplas tabelas
await db.$transaction(async (tx) => {
  await tx.processo.update({ where: { id }, data: { status: 'CONCLUIDO' } })
  await tx.tramitacao.create({ data: { tipo: 'CONCLUSAO', /* ... */ } })
})

// ❌ ERRADO — nunca prisma direto
import { prisma } from '@saude/core-db'
const dados = await prisma.saudeTfdSolicitacao.findMany() // FALHA CRÍTICA
```

---

## 9. Tratamento de Erros

```typescript
// Padrão de log em Server Actions — sem dados sensíveis
console.error('[nomeDaAction] Descrição do erro:', {
  tenantId: session?.user?.tenantId,
  error: error instanceof Error ? error.message : 'Erro desconhecido',
  // ❌ NUNCA incluir: cpf, cns, cid, email, senha, dados de saúde
})

// Error boundary em páginas
// apps/*/app/error.tsx
'use client'
export default function ErrorBoundary({ reset }: { reset: () => void }) {
  return (
    <div>
      <h2>Algo deu errado.</h2>
      <p>Tente novamente ou entre em contato com o suporte.</p>
      <button onClick={reset}>Tentar novamente</button>
      {/* Nunca exibir error.message — pode conter dados internos */}
    </div>
  )
}
```

---

## 10. Formatação e Estilo

```json
// .prettierrc
{
  "semi": false,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100
}
```

```json
// .eslintrc.json (regras principais)
{
  "rules": {
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/no-unused-vars": "error",
    "no-console": ["warn", { "allow": ["error", "warn"] }]
  }
}
```

### Ordem de imports (obrigatória)
```typescript
// 1. Dependências externas
import { z } from 'zod'
import { revalidatePath } from 'next/cache'

// 2. Packages internos @saude/*
import { requireTenantRole } from '@saude/core-auth'
import { getPrismaForTenant } from '@saude/core-db'

// 3. Imports relativos
import { abrirSolicitacaoSchema } from '../validators/solicitacao.schema'
import type { TfdSolicitacao } from '../types/tfd.types'
```

### Exports
```typescript
// Exports nomeados para actions e queries — nunca default export
export async function abrirSolicitacaoTfd() { }   // ✅
export default async function abrirSolicitacaoTfd() { }  // ❌ para actions

// Default export apenas em componentes React e pages Next.js
export default function TfdPage() { }  // ✅ para page.tsx
```

---

## 11. Checklist de Qualidade de Código

**Segurança:**
- [ ] Nenhum `prisma` direto — sempre `getPrismaForTenant`?
- [ ] `tenant_id` explícito em toda query além do RLS?
- [ ] Input validado com Zod antes de qualquer uso?
- [ ] Dados sensíveis (CID, CPF) fora dos logs?
- [ ] 3 camadas de verificação no início da action?

**Qualidade:**
- [ ] Nenhum `any` — TypeScript strict respeitado?
- [ ] Erros tratados com `try/catch` e retorno `ActionResponse`?
- [ ] Null check antes de usar dados do banco?
- [ ] `revalidatePath` chamado após mutations?
- [ ] Auditoria registrada para toda escrita?

**Estrutura:**
- [ ] Arquivo no lugar correto conforme `MONOREPO.md`?
- [ ] Nomenclatura seguindo as convenções da seção 2?
- [ ] Imports na ordem correta?
- [ ] Nenhum módulo importando de outro módulo?
- [ ] Barrel exports atualizados em `src/index.ts`?
- [ ] Funcionalidade registrada em `platform_features`?

---

## 12. Documentos Relacionados

- `MONOREPO.md` — onde cada arquivo deve viver
- `AUTH_PERMISSIONS.md` — funções de autorização disponíveis
- `DATABASE_SCHEMA.md` — schema Prisma e modelos disponíveis
- `BUSINESS_RULES.md` — regras de negócio que as actions devem implementar
- `API_CONTRACTS.md` — contratos de entrada e saída de cada endpoint
