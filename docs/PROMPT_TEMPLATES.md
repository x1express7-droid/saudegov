# PROMPT_TEMPLATES.md
# saudegov — Templates de Prompt para o Cursor

> **Instruções para o agente do Cursor:** Este arquivo contém os templates de
> prompt otimizados para uso com o Cursor. Use-os como base para comunicar
> tarefas com precisão. Cada template garante que o contexto correto seja
> fornecido antes de qualquer implementação.

---

## 1. Como Usar Este Arquivo

Copie o template correspondente à sua tarefa, preencha os campos entre `{chaves}`
e use como prompt no Cursor. Os templates já incluem as referências corretas
aos documentos que o agente deve consultar.

---

## 2. Template — Nova Sprint

```
Vamos iniciar a Sprint {NUMERO} — {NOME_SPRINT}.

Antes de começar, leia obrigatoriamente:
- docs/SPRINTS.md → seção da sprint {NUMERO} para ver as tasks
- docs/ARCHITECTURE.md → para contexto geral
- docs/MONOREPO.md → para saber onde criar os arquivos
- docs/CODING_STANDARDS.md → para padrões obrigatórios

Tasks desta sprint:
{LISTA_DE_TASKS_DO_SPRINTS_MD}

Regras para esta sprint:
1. Crie um arquivo por vez e confirme comigo antes de prosseguir
2. Após cada funcionalidade, registre em public.platform_features
3. Se encontrar algo que impacta outro painel (dev ou servidor), me avise
4. Não implemente tasks de outras sprints
```

---

## 3. Template — Nova Funcionalidade

```
Implemente a funcionalidade: {NOME_DA_FUNCIONALIDADE}

Módulo: {MODULO} (ex: saude.tfd)
Painel(is): {PAINEL} (painel-dev | painel-servidor | ambos)
Sprint: {SPRINT}

Leia antes de implementar:
- docs/BUSINESS_RULES.md → regras de negócio desta funcionalidade
- docs/API_CONTRACTS.md → contrato de entrada e saída
- docs/AUTH_PERMISSIONS.md → papel mínimo e permissão granular
- docs/DATABASE_SCHEMA.md → tabelas envolvidas
- docs/CODING_STANDARDS.md → estrutura obrigatória da Server Action

Localização dos arquivos:
- Server Action: modules/saude/tfd/src/actions/{arquivo}.ts
- Query: modules/saude/tfd/src/queries/get-{entidade}.ts
- Schema Zod: modules/saude/tfd/src/validators/{entidade}.schema.ts
- Página: apps/painel-servidor/app/(servidor)/saude/tfd/{rota}/page.tsx

Checklist obrigatório antes de entregar:
- [ ] 3 camadas de verificação (assertModuleActive + requireTenantRole + requirePermission)
- [ ] getPrismaForTenant com tenant_id explícito no where
- [ ] Dados sensíveis (CID, CPF) não retornados em listagem
- [ ] createAuditLog para toda escrita
- [ ] Funcionalidade registrada em platform_features
- [ ] revalidatePath após mutations
```

---

## 4. Template — Nova Migration de Banco

```
Crie a migration de banco para: {DESCRICAO}

Leia antes:
- docs/DATABASE_SCHEMA.md → schema completo que deve ser implementado
- docs/MULTI_TENANT.md → como configurar RLS

Regras obrigatórias:
1. Nome da migration: YYYYMMDDHHMMSS_{descricao_clara}
2. RLS habilitado em TODA nova tabela de negócio
3. tenant_id UUID NOT NULL com FK para public.tenants ON DELETE CASCADE
4. Índice criado para tenant_id em toda nova tabela
5. Colunas NOT NULL devem ter DEFAULT ou ser nullable
6. Nenhuma alteração direta em tabelas existentes sem migration

Após criar a migration:
- Execute: cd packages/core-db && npx prisma migrate dev
- Execute: npx prisma generate
- Confirme que seed de desenvolvimento ainda funciona
```

---

## 5. Template — Novo Componente UI

```
Crie o componente: {NOME_DO_COMPONENTE}

Leia antes:
- docs/DESIGN_SYSTEM.md → tokens de cor, tipografia e padrões
- docs/MONOREPO.md → onde o componente deve ficar

Localização:
- Componente compartilhado: packages/ui/src/components/{nome}.tsx
- Componente específico do app: apps/painel-servidor/components/{nome}.tsx

Regras:
1. Use APENAS os tokens CSS definidos em DESIGN_SYSTEM.md
2. Nenhuma cor, tamanho ou espaçamento hardcoded
3. Se existe lógica de permissão: usar PermissionGate de @saude/ui
4. Componente acessível: label, aria-*, role quando necessário
5. Exportar de packages/ui/src/index.ts se for compartilhado

Comportamento esperado:
{DESCRICAO_DO_COMPORTAMENTO}
```

---

## 6. Template — Corrigir Bug

```
Corrija o seguinte bug:

Descrição: {DESCRICAO_DO_BUG}
Arquivo(s) afetado(s): {ARQUIVOS}
Comportamento atual: {O_QUE_ACONTECE}
Comportamento esperado: {O_QUE_DEVERIA_ACONTECER}

Antes de corrigir, verifique:
- docs/BUSINESS_RULES.md → o comportamento atual pode ser regra de negócio?
- docs/CODING_STANDARDS.md → a correção segue os padrões?
- docs/AUTH_PERMISSIONS.md → é problema de permissão?

Regras para a correção:
1. Não altere o schema do banco sem migration
2. Se a correção afeta um painel, verifique se o outro precisa da mesma correção
3. Registre a correção como atualização em platform_features se relevante
4. Nenhum dado sensível em console.log mesmo durante debug
```

---

## 7. Template — Verificação de Paridade entre Painéis

```
Verifique se a funcionalidade {NOME_DA_FUNCIONALIDADE} está implementada
nos dois painéis corretamente.

Consulte:
- public.platform_features → colunas painel_dev e painel_servidor
- docs/ARCHITECTURE.md → regra de paridade seção 4

Para cada painel, confirme:
1. A rota existe e está protegida pelo papel correto?
2. A Server Action está funcionando?
3. O resultado visual está correto?
4. Os dados sensíveis estão protegidos?

Se encontrar lacuna em algum painel:
- Liste o que está faltando
- Crie a implementação no painel que está sem
- Atualize platform_features
```

---

## 8. Template — Adicionar Novo Módulo (futuro)

```
Vamos iniciar o desenvolvimento do Módulo {NOME} (sigla: {SIGLA}).

Leia obrigatoriamente antes de qualquer implementação:
- docs/MUNICIPAL_MAP.md → seção do módulo {SIGLA}
- docs/ARCHITECTURE.md → hierarquia da plataforma
- docs/MONOREPO.md → onde criar o novo módulo
- docs/DATABASE_SCHEMA.md → convenções de schema

Passos obrigatórios (nesta ordem):
1. Confirmar que {SIGLA} está em MUNICIPAL_MAP.md com status ✅ ou 🔄
2. Verificar se alguma entidade do novo módulo já existe em saude_base
3. Criar módulo em modules/saude/{sigla_lower}/
4. Criar schema saude_{sigla_lower} no Prisma
5. Criar migration com RLS
6. Registrar permissões em AUTH_PERMISSIONS.md
7. Registrar no BUSINESS_RULES.md
8. Registrar em platform_features

Nunca:
- Criar módulo sem sigla definida no MUNICIPAL_MAP.md
- Duplicar entidade que já existe em saude_base (pacientes, unidades)
- Usar sigla que já existe
```

---

## 9. Template — Configuração de Município (Onboarding)

```
Configure o município {NOME_MUNICIPIO} na plataforma.

Dados do município:
- Nome: {NOME}
- Slug: {SLUG}
- CNPJ: {CNPJ}
- Tipo de domínio: {SUBDOMINIO | CUSTOM}
- Domínio: {DOMINIO}
- Módulos a ativar: {MODULOS}

Execute via Painel Dev:
1. Criar tenant com os dados acima
2. Verificar criação do subdomínio no Cloudflare
3. Criar usuário ADMIN: {EMAIL_ADMIN}
4. Registrar senha temporária (exibida uma única vez)
5. Ativar módulos: {MODULOS}
6. Confirmar acesso em {DOMINIO}

Se usar domínio .gov.br:
- Orientar TI do município a criar CNAME apontando para cname.vercel-dns.com
- Registrar domínio no Painel Dev após confirmação do DNS
- Aguardar propagação (até 24h)
```

---

## 10. Template — Consultar o que Já Foi Implementado

```
Antes de implementar qualquer coisa, verifique o que já existe:

1. Consulte public.platform_features:
   SELECT sistema, modulo, funcionalidade, painel_dev, painel_servidor, status
   FROM public.platform_features
   WHERE sistema = 'saude' AND modulo = '{MODULO}'
   ORDER BY funcionalidade;

2. Verifique se existe ação similar em:
   modules/saude/{modulo}/src/actions/
   modules/saude/{modulo}/src/queries/

3. Verifique se existe componente em:
   packages/ui/src/components/

Se a funcionalidade já existe:
- Use e melhore o que existe — nunca duplique
- Se existe em um painel mas não no outro → implemente no que falta

Se não existe:
- Implemente do zero seguindo os padrões de CODING_STANDARDS.md
- Registre em platform_features após concluir
```

---

## 11. Template — Revisão de Segurança

```
Faça uma revisão de segurança nos seguintes arquivos:
{LISTA_DE_ARQUIVOS}

Verifique cada item do checklist de SECURITY.md e CODING_STANDARDS.md:

LGPD:
- [ ] Nenhum campo cid_principal ou diagnostico em queries de listagem?
- [ ] CPF mascarado nas respostas de listagem?
- [ ] Laudo retorna URL pré-assinada (15min) com audit READ_SENSITIVE?

Multi-tenant:
- [ ] Todas as queries usam getPrismaForTenant?
- [ ] tenant_id explícito em todos os where?
- [ ] Nenhum tenant_id aceito de input externo?

Autenticação:
- [ ] 3 camadas de verificação em todas as Server Actions?
- [ ] Nenhum dado sensível no JWT ou em logs?

Se encontrar problema:
- Liste o arquivo e linha
- Descreva o risco
- Proponha a correção
- Corrija imediatamente
```

---

## 12. Prompts Rápidos de Contexto

Use estes prompts curtos quando precisar de contexto rápido:

```
# Ver fluxo completo de status TFD
"Consulte BUSINESS_RULES.md seção 1.2 e me mostre todas as transições de status do TFD"

# Ver permissões disponíveis
"Consulte AUTH_PERMISSIONS.md seção 3.1 e liste as permissões granulares do TFD"

# Ver contratos de uma action específica
"Consulte API_CONTRACTS.md seção 6.6 e me mostre o contrato completo de decidirSolicitacaoTfd"

# Verificar status de uma sprint
"Consulte SPRINTS.md e me diga quais tasks da sprint {N} ainda não foram concluídas"

# Ver o que já foi implementado
"SELECT * FROM public.platform_features WHERE modulo = 'tfd' ORDER BY funcionalidade"
```

---

## 13. Documentos de Referência Rápida

| Preciso saber... | Consulte... |
|---|---|
| Onde criar um arquivo | `MONOREPO.md` |
| Como escrever uma Server Action | `CODING_STANDARDS.md` seção 3 |
| Quais permissões existem | `AUTH_PERMISSIONS.md` seção 3 |
| Regras do fluxo TFD | `BUSINESS_RULES.md` seção 1 |
| Schema de uma tabela | `DATABASE_SCHEMA.md` |
| Contrato de uma API | `API_CONTRACTS.md` |
| Como funciona o multi-tenant | `MULTI_TENANT.md` |
| Tokens de cor e componentes | `DESIGN_SYSTEM.md` |
| O que fazer com dados sensíveis | `SECURITY.md` |
| Como integrar CADSUS | `CADSUS.md` |
| O que está na sprint atual | `SPRINTS.md` |
| Sigla e schema de um módulo | `MUNICIPAL_MAP.md` |
