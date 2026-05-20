# SKILL_DB_MIGRATION.md
# Como Criar Migrations de Banco — saudegov

## Quando usar
Ao criar qualquer nova tabela, coluna, índice ou relação no banco de dados.
Nunca altere o banco diretamente — toda mudança passa por migration.

---

## Passo 1 — Consultar o schema antes de escrever

```
docs/DATABASE_SCHEMA.md → schema completo que deve ser implementado
docs/MULTI_TENANT.md    → como configurar RLS corretamente
docs/MUNICIPAL_MAP.md   → convenção de nome de schema por módulo
```

---

## Passo 2 — Convenções obrigatórias

```sql
-- Nome da migration: YYYYMMDDHHMMSS_descricao_clara
-- Exemplos:
--   20250101000001_create_public_core_tables
--   20250101000003_create_saude_tfd_config_tables

-- Schema correto por área:
--   public.*          → core da plataforma
--   saude_base.*      → compartilhado entre módulos de saúde
--   saude_tfd.*       → exclusivo do módulo TFD
--   saude_{sigla}.*   → futuro módulo (consulte MUNICIPAL_MAP.md)

-- PK sempre UUID
id UUID PRIMARY KEY DEFAULT gen_random_uuid()

-- tenant_id obrigatório em toda tabela de negócio
tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE

-- Timestamps obrigatórios
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()  -- omitir em tabelas imutáveis

-- Soft delete (quando aplicável)
deleted_at TIMESTAMPTZ  -- NULL = ativo
```

---

## Passo 3 — Template de nova tabela

```sql
-- 1. Criar a tabela
CREATE TABLE saude_{modulo}.{tabela} (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  -- ... colunas de negócio
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Índice no tenant_id (obrigatório)
CREATE INDEX idx_{modulo}_{tabela}_tenant ON saude_{modulo}.{tabela}(tenant_id);

-- 3. Índices adicionais para campos de busca frequente
CREATE INDEX idx_{modulo}_{tabela}_{campo} ON saude_{modulo}.{tabela}(tenant_id, {campo});

-- 4. RLS obrigatório
ALTER TABLE saude_{modulo}.{tabela} ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON saude_{modulo}.{tabela}
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
```

---

## Passo 4 — Regras para alterar tabelas existentes

```sql
-- CORRETO — nullable não quebra dados existentes
ALTER TABLE saude_tfd.solicitacoes ADD COLUMN observacoes TEXT;

-- CORRETO — com DEFAULT não quebra dados existentes
ALTER TABLE saude_tfd.veiculos ADD COLUMN cor VARCHAR(50) DEFAULT 'Não informado';

-- ERRADO — NOT NULL sem DEFAULT quebra com dados existentes
ALTER TABLE saude_tfd.solicitacoes ADD COLUMN campo VARCHAR NOT NULL; -- NUNCA

-- Remoção de coluna: processo em 3 releases
-- Release 1: deprecar no código (parar de usar)
-- Release 2: remover do código completamente
-- Release 3: migration para remover do banco
```

---

## Passo 5 — Executar a migration

```bash
# Criar e executar
cd packages/core-db
npx prisma migrate dev --name "descricao_clara_da_migration"

# Gerar client atualizado (obrigatório após migrate)
npx prisma generate

# Verificar que seed ainda funciona
npx prisma db seed
```

---

## Passo 6 — Checklist antes de commitar

- [ ] Nome da migration segue o padrão `YYYYMMDDHHMMSS_descricao`?
- [ ] Schema correto para o módulo (ex: `saude_tfd.*` não `public.*`)?
- [ ] `tenant_id` presente em toda nova tabela de negócio?
- [ ] FK para `public.tenants` com `ON DELETE CASCADE`?
- [ ] Índice criado para `tenant_id`?
- [ ] RLS habilitado com policy `tenant_isolation`?
- [ ] Novas colunas NOT NULL têm DEFAULT ou são nullable?
- [ ] `prisma generate` executado após a migration?
- [ ] Seed de desenvolvimento ainda funciona?

---

## Exceções (tabelas SEM RLS)

```
public.tenants          → lida pelo Tenant Resolver antes do contexto
public.audit_logs       → SUPERADMIN precisa ver todos os tenants
public.platform_features → dado global, sem tenant
public.protocolo_sequencias → gerenciada pelo core com controle próprio
```
