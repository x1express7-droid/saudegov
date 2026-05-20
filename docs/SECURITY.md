# SECURITY.md
# saudegov — Segurança e Proteção de Dados

> **Instruções para o agente do Cursor:** Consulte este arquivo antes de qualquer
> tarefa que envolva armazenamento ou exibição de dados pessoais, logs de aplicação,
> exportação de dados, upload de arquivos ou qualquer dado de pacientes. A
> conformidade com a LGPD não é opcional — é requisito legal.

---

## 1. Base Legal

| Norma | Aplicação |
|---|---|
| LGPD — Lei 13.709/2018 | Proteção de dados pessoais e sensíveis de saúde |
| Marco Civil — Lei 12.965/2014 | Logs de acesso, responsabilidade civil |
| Decreto 8.771/2016 | Retenção de logs de acesso |
| Resolução CFM 1.821/2007 | Prontuários e dados de saúde (retenção 10 anos) |
| Portaria SAS/MS nº 55/1999 | Dados do TFD e controle de gastos públicos |

---

## 2. Classificação de Dados

### Dados Internos (acesso autenticado)
Nome do paciente, telefone, endereço, processos e tramitações sem dados clínicos,
organograma do município, dados de servidores.

### Dados Restritos (papéis específicos)
CPF completo do paciente, CNS, dados financeiros (saldos, prestações, valores),
fundamentação de decisões médicas.

### Dados Sensíveis — LGPD Art. 11 (acesso extremamente restrito)
- **CID e diagnóstico** — apenas com permissão `saude.tfd.analisar_laudo`
- **Laudos médicos** — URL pré-assinada 15min + registro READ_SENSITIVE obrigatório
- **CPF do acompanhante** — mascarado em listagens

**Base legal para tratamento:** LGPD Art. 11, II, "e" — proteção da vida e tutela
da saúde pelo poder público.

---

## 3. Proteção de Dados de Saúde

### 3.1 Dados clínicos nunca em listagens

```typescript
// ❌ NUNCA selecionar cid_principal ou diagnostico em listagens
// ✅ CORRETO — select sem campos clínicos
const solicitacoes = await db.saudeTfdSolicitacao.findMany({
  select: {
    id: true, urgencia: true, status: true,
    especialidade: { select: { nome: true } }
    // sem cid_principal, sem diagnostico
  }
})
```

### 3.2 Laudo médico — URL pré-assinada

```typescript
// Nunca retornar storage_path diretamente
const laudoUrl = await gerarUrlAssinada(anexo.storage_path, { expiresIn: '15m' })

// Sempre registrar acesso
await createAuditLog({
  acao: 'READ_SENSITIVE',
  entidade: 'saude_tfd_laudo',
  entidadeId: solicitacaoId,
})
```

### 3.3 Mascaramento obrigatório

```typescript
// packages/core-auth/src/masking.ts

// CPF: '12345678901' → '***.456.***-**'
export const maskCPF = (cpf: string) => `***.${cpf.slice(3, 6)}.***-**`

// CNS: '123456789012345' → '123 **** **** ***'
export const maskCNS = (cns: string) => `${cns.slice(0, 3)} **** **** ***`

// E-mail: 'joao@gmail.com' → 'j***@gmail.com'
export const maskEmail = (email: string) => {
  const [local, domain] = email.split('@')
  return `${local[0]}***@${domain}`
}
```

---

## 4. Segurança da Aplicação

### 4.1 HTTPS e Headers

```javascript
// next.config.ts — ambos os apps
const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
]
```

### 4.2 Proteções obrigatórias

- **SQL Injection:** Prisma com queries parametrizadas — `$queryRaw` com template literals, nunca concatenação
- **XSS:** nunca renderizar HTML de input do usuário. Sanitizar antes de armazenar
- **CSRF:** NextAuth v5 protege Server Actions automaticamente
- **IDOR:** todo acesso por ID verifica que o recurso pertence ao tenant e ao usuário autenticado

### 4.3 Rate Limiting

```typescript
const LIMITS = {
  login:           { requests: 5,   window: '15m' },
  api_autenticado: { requests: 200, window: '1m'  },
  upload:          { requests: 10,  window: '1m'  },
  export:          { requests: 3,   window: '1h'  },
}
```

### 4.4 Upload de arquivos

```typescript
const ALLOWED_MIME = ['application/pdf', 'image/jpeg', 'image/png']
const MAX_SIZE     = 10 * 1024 * 1024  // 10MB

// Nome sanitizado — nunca usar nome original do usuário no storage
const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').toLowerCase()

// Caminho no storage: {tenant_id}/saude/tfd/{processo_id}/{uuid}.{ext}
```

---

## 5. Gestão de Segredos

**Regras absolutas:**
1. Nenhum segredo no código-fonte
2. Nenhum segredo em `NEXT_PUBLIC_*` (expostas ao browser)
3. `.env` nunca commitado — apenas `.env.example`
4. Secrets diferentes por ambiente (dev, staging, produção)

```
✅ NEXT_PUBLIC_APP_URL  → permitido (URL pública)
❌ NEXT_PUBLIC_DATABASE_URL
❌ NEXT_PUBLIC_AUTH_SECRET
❌ NEXT_PUBLIC_CF_API_TOKEN
```

---

## 6. Logs de Aplicação

### O que NUNCA pode aparecer em logs

```
❌ Senhas (mesmo hash bcrypt)    ❌ Tokens JWT completos
❌ CPF em texto puro             ❌ CNS em texto puro
❌ CID e diagnóstico             ❌ Conteúdo de laudos
❌ Tokens de recuperação de senha ❌ Chaves de API
```

### Padrão de log

```typescript
// ✅ CORRETO — sem dados sensíveis
console.error('[decidirSolicitacaoTfd] Erro:', {
  tenantId: session?.user?.tenantId,
  solicitacaoId,
  error: error instanceof Error ? error.message : 'Erro desconhecido',
})
```

---

## 7. Auditoria

### Ações que geram audit_log obrigatoriamente

```
AUTH:       LOGIN, LOGOUT, LOGIN_FAILED, PASSWORD_CHANGED
TENANT:     TENANT_CRIADO, TENANT_SUSPENSO, MODULO_ATIVADO
USER:       SERVIDOR_CRIADO, PERMISSOES_ALTERADAS
PROCESSO:   SOLICITACAO_CRIADA, STATUS_ALTERADO, CANCELADO
TFD:        LAUDO_VISUALIZADO (READ_SENSITIVE), DECISAO_REGISTRADA
            AGENDAMENTO_CRIADO, PRESTACAO_APROVADA, SALDO_CADASTRADO
FINANCEIRO: RESERVA_CRIADA, SALDO_CONSUMIDO, SALDO_LIBERADO
EXPORT:     DADOS_EXPORTADOS (com filtros e escopo registrados)
```

### Campos removidos antes de auditar

```typescript
const CAMPOS_SENSIVEIS = [
  'password_hash',
  'cid_principal',   // registrar apenas que foi acessado — não o valor
  'diagnostico',     // idem
  'cpf',             // substituir por versão mascarada
  'cns',             // idem
]
```

---

## 8. Retenção de Dados

| Tipo de dado | Retenção mínima | Base |
|---|---|---|
| Processos TFD completos | **10 anos** após conclusão | Resolução CFM 1.821/2007 |
| Audit logs | 5 anos | LGPD + boas práticas |
| Logs de acesso HTTP | 6 meses | Marco Civil da Internet |
| Dados de usuário inativo | Até solicitação de exclusão | LGPD Art. 18 |

---

## 9. Exportação de Dados

```
✅ Incluídos: pacientes (CPF mascarado), solicitações sem CID, tramitações,
              viagens, despesas, movimentações de saldo, audit logs

❌ Nunca exportados automaticamente: CID, diagnóstico, senhas, tokens
   (CID/diagnóstico requerem autorização explícita do ADMIN)
```

Todo export registra em `audit_logs`: quem solicitou, quando, filtros usados.

---

## 10. Plano de Resposta a Incidentes

| Severidade | Definição | Tempo |
|---|---|---|
| **P0** | Vazamento de dados de pacientes | Imediato — 1h |
| **P1** | Dados de um município visíveis por outro | 4h |
| **P2** | Funcionalidade principal indisponível | 24h |

**Procedimento P0:**
```
1. ISOLAR     → desativar tenant afetado (active = false)
2. CONTER     → revogar tokens de sessão ativos
3. NOTIFICAR  → ANPD em até 72h (LGPD Art. 48)
4. CORRIGIR   → identificar e corrigir causa raiz
5. DOCUMENTAR → relatório completo
```

---

## 11. Checklist de Segurança

**LGPD:**
- [ ] CID e diagnóstico ausentes em todas as listagens?
- [ ] CPF e CNS mascarados nas telas de listagem?
- [ ] URL do laudo pré-assinada (15min) e com audit READ_SENSITIVE?
- [ ] Inputs validados com Zod antes de processar?

**Autenticação:**
- [ ] 3 camadas de verificação na Server Action?
- [ ] `tenant_id` da sessão — nunca de parâmetro externo?
- [ ] Nenhum dado sensível no JWT?

**Infraestrutura:**
- [ ] Nenhum secret em código ou `NEXT_PUBLIC_`?
- [ ] Headers de segurança configurados?
- [ ] RLS ativo em todas as novas tabelas?

**Auditoria:**
- [ ] Toda escrita registra em audit_logs?
- [ ] Audit log sanitizado (sem campos sensíveis)?
- [ ] Exportações registradas com escopo completo?

---

## 12. Documentos Relacionados

- `MULTI_TENANT.md` — RLS e isolamento de dados
- `DATABASE_SCHEMA.md` — tabela audit_logs
- `AUTH_PERMISSIONS.md` — controle de acesso
- `BUSINESS_RULES.md` — regras de retenção por módulo
