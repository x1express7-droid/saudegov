# SKILL_NOTIFICATION_EVENT.md
# Como Criar Evento de Notificação — saudegov

## Quando usar
Ao adicionar qualquer novo evento que deve gerar notificação — in-app
ou e-mail. Consulte `docs/BUSINESS_RULES.md` seção 1.14 para ver os
eventos já mapeados.

---

## Passo 1 — Verificar se o evento já existe

```
docs/BUSINESS_RULES.md seção 1.14 → tabela de notificações obrigatórias
packages/core-notifications/src/templates/ → templates existentes
```

Se o evento existe mas não está implementado → implemente.
Se não existe → documente em `BUSINESS_RULES.md` primeiro.

---

## Passo 2 — Definir o evento

```typescript
// packages/core-notifications/src/events.ts

export const NOTIFICATION_EVENTS = {
  // TFD
  SOLICITACAO_TFD_ENVIADA:      'SOLICITACAO_TFD_ENVIADA',
  SOLICITACAO_TFD_MUITO_URGENTE:'SOLICITACAO_TFD_MUITO_URGENTE',
  COMPLEMENTO_SOLICITADO:       'COMPLEMENTO_SOLICITADO',
  SOLICITACAO_TFD_APROVADA:     'SOLICITACAO_TFD_APROVADA',
  SOLICITACAO_TFD_NEGADA:       'SOLICITACAO_TFD_NEGADA',
  LEMBRETE_VIAGEM_48H:          'LEMBRETE_VIAGEM_48H',
  LEMBRETE_PC_48H:              'LEMBRETE_PC_48H',
  PRESTACAO_ENVIADA:            'PRESTACAO_ENVIADA',
  PRESTACAO_APROVADA:           'PRESTACAO_APROVADA',
  PRESTACAO_REJEITADA:          'PRESTACAO_REJEITADA',
  PROCESSO_CANCELADO:           'PROCESSO_CANCELADO',
  SALDO_BAIXO:                  'SALDO_BAIXO',  // Sprint 2.2 — in-app; gestores ver_dashboard
  // Adicionar novos eventos aqui
} as const

export type NotificationEvent = keyof typeof NOTIFICATION_EVENTS
```

---

## Passo 3 — Criar template do evento

```typescript
// packages/core-notifications/src/templates/{evento}.ts

import type { NotificationTemplate } from '../types'

export const solicitacaoTfdEnviadaTemplate: NotificationTemplate = {
  evento: 'SOLICITACAO_TFD_ENVIADA',
  titulo: (ctx) => `Nova solicitação TFD — ${ctx.protocolo}`,
  corpo: (ctx) =>
    `Nova solicitação de TFD aberta para ${ctx.pacienteNome}. ` +
    `Especialidade: ${ctx.especialidade}. Urgência: ${ctx.urgencia}. ` +
    `Protocolo: ${ctx.protocolo}.`,
  canais: ['IN_APP', 'EMAIL'],
  // destinatarios: resolvidos pelo dispatcher
}
```

---

## Passo 4 — Implementar o dispatcher

```typescript
// packages/core-notifications/src/dispatcher.ts

interface DispararInput {
  tenantId: string
  evento: NotificationEvent
  processoId?: string
  context?: Record<string, string>
}

export async function dispararNotificacao(input: DispararInput): Promise<void> {
  const db = await getPrismaForTenant(input.tenantId)
  const template = getTemplate(input.evento)
  const destinatarios = await resolverDestinatarios(input.evento, input.tenantId, db)

  for (const userId of destinatarios) {
    await db.notificacao.create({
      data: {
        tenant_id: input.tenantId,
        user_id: userId,
        processo_id: input.processoId ?? null,
        canal: 'IN_APP',
        status: 'PENDENTE',
        titulo: template.titulo(input.context ?? {}),
        corpo: template.corpo(input.context ?? {}),
      },
    })
  }

  // E-mail enfileirado separadamente se canal incluir EMAIL
  // ...
}
```

---

## Passo 5 — Resolver destinatários por evento

```typescript
// packages/core-notifications/src/resolver.ts

async function resolverDestinatarios(
  evento: NotificationEvent,
  tenantId: string,
  db: PrismaClient
): Promise<string[]> {

  switch (evento) {
    case 'SOLICITACAO_TFD_ENVIADA':
    case 'SOLICITACAO_TFD_MUITO_URGENTE':
      // Gestor + servidores do setor responsável pelo TFD
      return buscarServidoresSetor(tenantId, 'saude.tfd', db)

    case 'COMPLEMENTO_SOLICITADO':
    case 'SOLICITACAO_TFD_APROVADA':
    case 'SOLICITACAO_TFD_NEGADA':
      // Servidor que abriu a solicitação
      return [solicitante_id]

    case 'PRESTACAO_ENVIADA':
      // Gestor financeiro do TFD
      return buscarGestoresTfd(tenantId, db)

    default:
      return []
  }
}
```

---

## Passo 6 — Registrar na BUSINESS_RULES.md

Ao criar um novo evento, adicionar na tabela da seção 1.14:

```markdown
| {Evento}          | {Destinatário}     | {Canal}           |
```

---

## Checklist

- [ ] Evento definido em `NOTIFICATION_EVENTS`?
- [ ] Template criado com título e corpo?
- [ ] Destinatários corretos no resolver?
- [ ] Nenhum dado sensível (CPF, CID) no corpo da notificação?
- [ ] Audit log da falha de entrega registrado?
- [ ] Fallback in-app quando e-mail falha?
- [ ] Evento documentado em `BUSINESS_RULES.md` seção 1.14?
- [ ] `dispararNotificacao` chamado na Server Action correspondente?
