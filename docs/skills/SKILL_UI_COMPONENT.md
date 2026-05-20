# SKILL_UI_COMPONENT.md
# Como Criar Componentes de UI — saudegov

## Quando usar
Ao criar qualquer componente React — shared em `packages/ui` ou
específico de um app.

---

## Passo 1 — Verificar se já existe

```bash
# Procurar componente existente antes de criar
ls packages/ui/src/components/

# Procurar no app específico
ls apps/painel-servidor/components/
```

Consulte `docs/DESIGN_SYSTEM.md` seção 7 — lista de todos os componentes existentes.
**Se já existe: use e melhore. Nunca duplique.**

---

## Passo 2 — Decidir onde fica

```
Componente usado em MAIS de um app:
  → packages/ui/src/components/{nome}.tsx
  → Exportar em packages/ui/src/index.ts

Componente específico de um app:
  → apps/painel-servidor/components/{nome}.tsx

Componente específico de uma rota:
  → apps/painel-servidor/app/(servidor)/saude/tfd/components/{nome}.tsx
```

---

## Passo 3 — Tokens obrigatórios

```typescript
// NUNCA hardcode de cor, tamanho ou espaçamento
// SEMPRE usar tokens CSS do design system

// ❌ ERRADO
<div style={{ color: '#1a5fa8', padding: '16px' }}>

// ✅ CORRETO — tokens CSS
<div className="text-primary p-4">

// ✅ CORRETO — CSS vars
<div style={{ color: 'var(--color-primary)', padding: 'var(--space-4)' }}>
```

Consulte `docs/DESIGN_SYSTEM.md` para todos os tokens disponíveis.

---

## Passo 4 — Server Component vs Client Component

```typescript
// Server Component (padrão — sem 'use client')
// Use quando: busca dados, sem interatividade, sem estado local
export default async function SolicitacaoLista() {
  const { items } = await getSolicitacoesTfd()
  return <DataTable data={items} columns={columns} />
}

// Client Component (apenas quando necessário)
// Use quando: useState, useEffect, event handlers, browser APIs
'use client'
export function SolicitacaoForm() {
  const [isPending, startTransition] = useTransition()
  // ...
}
```

**Regra:** componente Client nunca acessa banco diretamente.
Recebe dados via props do Server Component pai.

---

## Passo 5 — Template de componente compartilhado

```typescript
// packages/ui/src/components/{nome}.tsx

import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../utils/cn'

interface {Nome}Props extends ComponentPropsWithoutRef<'div'> {
  // props específicas do componente
}

export function {Nome}({ className, ...props }: {Nome}Props) {
  return (
    <div
      className={cn(
        'base-classes-aqui',
        className
      )}
      {...props}
    />
  )
}
```

---

## Passo 6 — Acessibilidade obrigatória

```typescript
// Todo campo de formulário tem label associado
<label htmlFor="email">E-mail</label>
<input id="email" type="email" />

// Botões icon-only têm aria-label
<button aria-label="Fechar modal">×</button>

// Estados de loading comunicados
<div aria-busy={isPending} aria-live="polite">
  {isPending ? <Spinner /> : content}
</div>

// Área clicável mínima 44x44px
className="min-h-[44px] min-w-[44px]"
```

---

## Passo 7 — Checklist antes de commitar

- [ ] Componente não duplica algo existente em `packages/ui`?
- [ ] Nenhuma cor, tamanho ou espaçamento hardcoded?
- [ ] Tokens CSS do design system usados?
- [ ] Client Component só quando estritamente necessário?
- [ ] Acessibilidade: labels, aria-*, área mínima clicável?
- [ ] Exportado em `packages/ui/src/index.ts` se compartilhado?
- [ ] Props tipadas — sem `any`?
- [ ] PermissionGate usado para ações condicionais por papel?
