# SKILL_NEW_MODULE.md
# Como Adicionar Novo Módulo de Saúde — saudegov

## Quando usar
Ao iniciar o desenvolvimento de um novo módulo do Sistema de Saúde
(Regulação, Farmácia, VISA, UBS, etc.).

---

## Passo 1 — Verificar pré-requisitos

```
1. O módulo está em docs/MUNICIPAL_MAP.md com status 📋 Planejado ou superior?
   → Se não está: adicione primeiro com sigla única e base legal
   → Consulte MUNICIPAL_MAP.md seção 7 para as regras

2. A sigla é única? Não conflita com módulo existente?
   → Verifique a tabela de módulos em MUNICIPAL_MAP.md

3. A fase de desenvolvimento está correta em SPRINTS.md?
   → Não iniciar módulo antes do módulo anterior estar concluído
```

---

## Passo 2 — Verificar o que pode ser reaproveitado

```bash
# Antes de criar qualquer coisa, verificar o que já existe
# em saude_base (compartilhado entre módulos):

# Pacientes → saude_base.pacientes (não duplicar)
# Unidades  → saude_base.unidades  (não duplicar)

# Se o novo módulo precisa de pacientes ou unidades:
# → USE saude_base.{tabela} — nunca crie nova tabela
```

Consulte `docs/DATABASE_SCHEMA.md` seção 3 — Schema `saude_base`.

---

## Passo 3 — Criar estrutura no monorepo

```bash
# Estrutura do novo módulo
mkdir -p modules/saude/{sigla_lower}/src/actions
mkdir -p modules/saude/{sigla_lower}/src/queries
mkdir -p modules/saude/{sigla_lower}/src/validators
mkdir -p modules/saude/{sigla_lower}/src/types
mkdir -p modules/saude/{sigla_lower}/src/utils
```

```json
// modules/saude/{sigla_lower}/package.json
{
  "name": "@saude/mod-saude-{sigla_lower}",
  "version": "0.0.1",
  "private": true,
  "main": "./src/index.ts",
  "dependencies": {
    "@saude/core-auth": "*",
    "@saude/core-db": "*",
    "@saude/core-documents": "*",
    "@saude/core-notifications": "*",
    "@saude/validators": "*"
  }
}
```

---

## Passo 4 — Criar schema no banco

```
Nome do schema: saude_{sigla_lower}
Exemplos: saude_regul, saude_visa, saude_farma

Regras obrigatórias:
1. Toda tabela tem tenant_id + RLS
2. Nunca duplicar o que existe em saude_base
3. Seguir convenções de SKILL_DB_MIGRATION.md
```

Adicionar o novo schema em `packages/core-db/prisma/schema.prisma`:
```prisma
datasource db {
  schemas = ["public", "saude_base", "saude_tfd", "saude_{sigla_lower}"]
}
```

---

## Passo 5 — Atualizar documentação

```
1. docs/MUNICIPAL_MAP.md
   → Mudar status do módulo para 🔄 Em desenvolvimento

2. docs/DATABASE_SCHEMA.md
   → Adicionar seção com schema do novo módulo

3. docs/AUTH_PERMISSIONS.md
   → Adicionar catálogo de permissões do módulo
   → Adicionar na matriz de permissões

4. docs/BUSINESS_RULES.md
   → Adicionar seção com regras de negócio do módulo

5. docs/API_CONTRACTS.md
   → Adicionar contratos das Server Actions

6. docs/SPRINTS.md
   → Adicionar sprints do módulo

7. turbo.json
   → Adicionar @saude/mod-saude-{sigla_lower} ao pipeline
```

---

## Passo 6 — Ativar módulo no tenant

```typescript
// No Painel Dev, ao ativar o módulo para um município,
// o campo tenant.modules é atualizado:
{
  "saude": {
    "tfd": true,
    "{sigla_lower}": true  // ← novo módulo ativado
  }
}

// O middleware verifica automaticamente — nenhum código extra necessário
```

---

## Passo 7 — Checklist de criação do módulo

- [ ] Módulo em `MUNICIPAL_MAP.md` com sigla única?
- [ ] Base legal identificada e documentada?
- [ ] Nenhuma entidade de `saude_base` duplicada?
- [ ] Package criado com nome correto `@saude/mod-saude-{sigla}`?
- [ ] Schema adicionado ao `schema.prisma`?
- [ ] RLS em todas as novas tabelas?
- [ ] `AUTH_PERMISSIONS.md` atualizado com as permissões?
- [ ] `BUSINESS_RULES.md` atualizado com as regras?
- [ ] `SPRINTS.md` com o roteiro do módulo?
- [ ] Primeiras funcionalidades em `platform_features`?
