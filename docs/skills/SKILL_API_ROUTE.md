# SKILL_API_ROUTE.md
# Como Criar uma Server Action — saudegov

## Quando usar
Ao criar qualquer Server Action de negócio no projeto. Toda action segue
esta estrutura — sem exceção.

---

## Passo 1 — Consultar o contrato antes de escrever código

```
1. docs/API_CONTRACTS.md    → input, output, papel, erros esperados
2. docs/BUSINESS_RULES.md   → regras que a action deve aplicar
3. docs/AUTH_PERMISSIONS.md → papel mínimo e chave de permissão
```

Se a action não está documentada em `API_CONTRACTS.md`, documente primeiro.

---

## Passo 2 — Localização correta do arquivo

```
Operação com efeito (escrita):
  modules/saude/{modulo}/src/actions/{entidade}.ts

Leitura sem efeito:
  modules/saude/{modulo}/src/queries/get-{entidade}.ts

Schema de validação:
  modules/saude/{modulo}/src/validators/{entidade}.schema.ts
```

---

## Passo 3 — Estrutura obrigatória dos 10 blocos

```typescript
'use server'

// Imports externos
import { z } from 'zod'
import { revalidatePath } from 'next/cache'

// Imports internos @saude/*
import { assertModuleActive, requireTenantRole, requirePermission } from '@saude/core-auth'
import { getPrismaForTenant } from '@saude/core-db'
import { gerarProtocolo, createAuditLog, registrarTramitacao } from '@saude/core-documents'
import { dispararNotificacao } from '@saude/core-notifications'

// Imports do módulo
import { {entidade}Schema } from '../validators/{entidade}.schema'
import type { ActionResponse } from '@saude/validators'
import { TFD_PERMISSIONS } from '../permissions'

export async function nomeDaAction(rawInput: unknown): Promise<ActionResponse<{ReturnType}>> {

  // BLOCO 1: Módulo ativo?
  await assertModuleActive('saude', '{modulo}')

  // BLOCO 2: Papel mínimo
  const session = await requireTenantRole('{PAPEL_MINIMO}')

  // BLOCO 3: Permissão granular (pular para ADMIN/SUPERADMIN)
  await requirePermission(session, TFD_PERMISSIONS.{CHAVE})

  // BLOCO 4: Validar input — rawInput nunca usado após aqui
  const parsed = {entidade}Schema.safeParse(rawInput)
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

    const resultado = await db.$transaction(async (tx) => {
      // ... operações no banco
    })

    // BLOCO 6: Auditoria
    await createAuditLog({
      tenantId: session.user.tenantId!,
      userId: session.user.id,
      acao: 'CREATE',           // CREATE | UPDATE | DELETE | READ_SENSITIVE
      entidade: '{tabela}',
      entidadeId: resultado.id,
      payloadDepois: { /* sem dados sensíveis */ },
    })

    // BLOCO 7: Tramitação (se processo)
    await registrarTramitacao({
      tenantId: session.user.tenantId!,
      processoId: resultado.processoId,
      tipo: '{TIPO_TRAMITACAO}',
      descricao: '{Descrição legível}',
      usuarioId: session.user.id,
    })

    // BLOCO 8: Notificações
    await dispararNotificacao({
      tenantId: session.user.tenantId!,
      evento: '{NOME_EVENTO}',
      processoId: resultado.id,
    })

    // BLOCO 9: Revalidar cache
    revalidatePath('/saude/{modulo}')

    // BLOCO 10: Retorno
    return { success: true, data: { /* resultado */ } }

  } catch (error) {
    console.error('[nomeDaAction] Erro:', {
      tenantId: session.user.tenantId,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    })
    return { success: false, error: 'Não foi possível completar a operação.' }
  }
}
```

---

## Passo 4 — Checklist antes de commitar

**Segurança:**
- [ ] `assertModuleActive` é a primeira linha?
- [ ] `requireTenantRole` é a segunda verificação?
- [ ] `requirePermission` é a terceira (se GESTOR/SERVIDOR)?
- [ ] `rawInput` nunca usado após a validação Zod?
- [ ] `getPrismaForTenant` usado — nunca `prisma` direto?
- [ ] `tenant_id` explícito em todo `where` além do RLS?
- [ ] `tenant_id` lido da sessão — nunca de parâmetro externo?
- [ ] Nenhum dado sensível (CPF, CNS, CID) em `console.error`?

**Funcionalidade:**
- [ ] `createAuditLog` chamado para toda escrita?
- [ ] `revalidatePath` chamado nas rotas afetadas?
- [ ] Tramitação registrada se é processo?
- [ ] Notificação disparada conforme `BUSINESS_RULES.md`?
- [ ] Funcionalidade registrada em `platform_features`?
- [ ] Existe equivalente no outro painel (se aplicável)?

**Qualidade:**
- [ ] Nenhum `any` no TypeScript?
- [ ] `null` checado antes de usar dados do banco?
- [ ] Operações multi-tabela dentro de `$transaction`?
- [ ] Retorno segue `ActionResponse<T>`?
