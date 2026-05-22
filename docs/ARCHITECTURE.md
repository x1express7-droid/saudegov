# ARCHITECTURE.md
# saudegov — Plataforma Municipal de Saúde

> **Instruções para o agente do Cursor:** Este é o documento raiz do projeto. Leia-o
> completamente antes de qualquer tarefa. Todas as decisões arquiteturais aqui
> documentadas são definitivas. Não proponha alternativas sem justificativa explícita
> de conflito com os requisitos. Consulte `MUNICIPAL_MAP.md` antes de criar qualquer
> módulo ou funcionalidade.

---

## 1. O que é este sistema

O **saudegov** é uma plataforma SaaS multi-tenant para gestão de saúde pública
municipal no Brasil. Um único código-base atende múltiplos municípios simultaneamente,
com isolamento total de dados por `tenant_id` e Row Level Security no PostgreSQL.

A plataforma é composta por um **Sistema de Saúde** — correspondente à Secretaria
Municipal de Saúde — que por sua vez é composto por **módulos** independentes,
cada um representando uma área ou serviço da secretaria.

**O primeiro módulo desenvolvido é o TFD (Tratamento Fora de Domicílio).** Ele é
o MVP da plataforma, mas a arquitetura foi pensada para acomodar todos os demais
módulos de saúde que serão implementados na sequência, sem retrabalho.

**Problema que resolve:**
Municípios brasileiros gerenciam serviços de saúde como o TFD em planilhas, cadernos
ou sistemas desconexos — sem rastreabilidade, sem controle financeiro real, sem
auditoria e sem histórico. Isso gera desperdício de recurso público, risco de fraude
e descumprimento da legislação do SUS.

**Solução:**
Uma plataforma pensada exclusivamente para a Secretaria Municipal de Saúde, que
digitaliza e controla os processos de saúde municipal de acordo com a legislação
brasileira vigente, com rastreabilidade total e dados protegidos pela LGPD.

**Base legal que orienta a plataforma:**
- Portaria SAS/MS nº 55/1999 — TFD no SUS
- Portaria MS nº 280/1999 — direito a acompanhante
- Portaria de Consolidação nº 2/2017 — Política Nacional de Regulação do SUS
- Lei 13.709/2018 — LGPD (proteção de dados pessoais e dados sensíveis de saúde)
- Lei 12.527/2011 — LAI (transparência e acesso à informação)
- Resolução CFM 1.821/2007 — prontuários e dados de saúde

---

## 2. Hierarquia da Plataforma

```
saudegov (plataforma — SUPERADMIN)
  └── Município (tenant — ADMIN)
        └── Secretaria Municipal de Saúde (Sistema SAUDE)
              ├── Módulo TFD              ← MVP — desenvolvido agora
              ├── Módulo Regulação        ← planejado
              ├── Módulo Vigilância San.  ← planejado
              ├── Módulo Farmácia         ← planejado
              ├── Módulo UBS              ← planejado
              └── ...                    ← ver MUNICIPAL_MAP.md
```

**Conceito central — obrigatório para entender o projeto:**
```
SECRETARIA MUNICIPAL DE SAÚDE  →  é o SISTEMA da plataforma (sigla: SAUDE)
DEPARTAMENTO / SETOR           →  é um MÓDULO dentro do sistema
FUNCIONALIDADE                 →  o que cada módulo faz
PAPEL                          →  quem pode executar cada funcionalidade
```

**Exemplos concretos:**
- TFD não é o sistema — é um **módulo** do Sistema de Saúde
- Regulação não é o sistema — é um **módulo** do Sistema de Saúde
- A plataforma serve apenas Saúde Municipal — não é uma plataforma genérica

---

## 3. Papéis e Hierarquia de Acesso

```
SUPERADMIN  → o desenvolvedor. Acesso global a todos os municípios.
ADMIN       → gestor do município. Acesso total ao seu município.
GESTOR      → responsável por módulo/setor. Acesso ao seu escopo.
SERVIDOR    → operador público. Opera dentro do seu setor.
```

> **Sem portal de cidadão.** Todos os módulos são operados exclusivamente por
> servidores públicos. O paciente não tem acesso direto ao sistema — o servidor
> registra em nome dele.

Detalhamento completo em `AUTH_PERMISSIONS.md`.

---

## 4. Dois Painéis — Arquitetura dos Apps

A plataforma expõe **2 aplicações Next.js** dentro de um monorepo Turborepo.
São apps separados porque têm propósitos completamente diferentes.

### 4.1 Painel Dev (`apps/painel-dev`)
- **Acesso:** domínio fixo do Painel Dev (ex.: `admin.plataforma.exemplo` — ver `ADMIN_DOMAIN`)
- **Quem usa:** SUPERADMIN
- **Protegido por:** IP allowlist + autenticação forte
- **Função:**
  - Criar e gerenciar municípios (tenants)
  - Configurar domínios via Cloudflare (subdomínio automático ou `.gov.br`)
  - Ativar/desativar módulos por município
  - Criar o primeiro ADMIN de cada município
  - Monitorar saúde da plataforma
  - Exportar dados de qualquer município
  - Ver audit logs globais
  - Gerenciar registro de funcionalidades (`platform_features`)

### 4.2 Painel Servidor (`apps/painel-servidor`)
- **Acesso:** `{slug}.<dominio-base-da-plataforma>` ou domínio `.gov.br` do município
- **Quem usa:** ADMIN, GESTOR, SERVIDOR do município
- **Protegido por:** autenticação + papel mínimo por rota + módulo ativo
- **Função:**
  - Configurar organograma da secretaria
  - Gerenciar servidores e permissões granulares
  - Operar os módulos ativos do município
  - Gerar relatórios por módulo
  - Ver dashboard operacional

> **Regra de paridade:** toda funcionalidade que tem equivalente nos dois painéis
> deve ser implementada nos dois. O agente do Cursor verifica `platform_features`
> antes de qualquer implementação e sinaliza lacunas.

---

## 5. Stack Tecnológica

### Frontend
| Tecnologia | Versão | Uso |
|---|---|---|
| Next.js | 15+ | Framework principal (App Router) |
| React | 19 | Biblioteca de UI |
| Tailwind CSS | 4 | Estilização via tokens do design system |
| Radix UI | latest | Componentes acessíveis |
| Lucide React | latest | Ícones |
| React Hook Form | latest | Formulários |
| Zod | latest | Validação de schemas |
| TanStack Table | latest | Tabelas de dados |
| date-fns | latest | Datas com locale pt-BR |

### Backend
| Tecnologia | Versão | Uso |
|---|---|---|
| Next.js Server Actions + API Routes | 15+ | Lógica de servidor |
| Prisma ORM | latest | Acesso ao banco, migrations |
| NextAuth | v5 | Autenticação unificada |
| bcryptjs | latest | Hash de senhas |
| JWT | — | Sessões via NextAuth |

### Banco de Dados
| Tecnologia | Uso |
|---|---|
| PostgreSQL 15+ | Banco principal |
| Prisma Migrate | Versionamento de schema |
| Row Level Security | Isolamento por tenant (município) |

### Infraestrutura
| Serviço | Uso |
|---|---|
| Vercel | Hospedagem e deploy dos 2 apps |
| Neon | PostgreSQL serverless em produção |
| GitHub | Repositório e versionamento |
| GitHub Actions | CI/CD pipeline |
| Cloudflare | DNS, domínios, SSL automático, API de subdomínios |
| Cloudflare R2 ou AWS S3 | Armazenamento de laudos e documentos |
| Turborepo | Gerenciamento do monorepo |

---

## 6. Domínios e Configuração por Município

Ao cadastrar um município no Painel Dev, o sistema oferece duas opções:

### Opção A — Subdomínio automático da plataforma

O domínio base é o da **sua implantação** (Cloudflare + VPS/Coolify), não um domínio fixo do repositório.

```
campograndems.<dominio-base>
altamirapa.<dominio-base>
```

Exemplo ilustrativo: `campograndems.plataforma.exemplo`.

- Criado automaticamente via API do Cloudflare ao salvar o município (quando configurado)
- SSL wildcard `*.<dominio-base>` na zona DNS da plataforma

### Opção B — Domínio próprio do município (.gov.br)
```
saude.campogrande.ms.gov.br
tfd.altamira.pa.gov.br
```
- O município aponta o DNS para o Cloudflare (ação do TI do município)
- O desenvolvedor registra o domínio no Painel Dev
- A API do Cloudflare cria o CNAME automaticamente
- SSL provisionado automaticamente pelo Cloudflare

### Roteamento — sem configuração de VPS
```
Requisição → Cloudflare → Vercel → Next.js Middleware
  ↓
Middleware lê o host da requisição
  ↓
Resolve tenant_id pelo domínio (consulta ao banco; cache na fase final)
  ↓
Injeta tenant_id, módulos ativos e tema no contexto
  ↓
RLS no banco garante isolamento total dos dados
```

---

## 7. Isolamento de Dados por Município

**Método:** RLS no PostgreSQL + `tenant_id` obrigatório em todas as tabelas de negócio.

**Por que essa escolha:**
- Um único banco serve todos os municípios (custo baixo, manutenção simples)
- O RLS é uma barreira no banco — mesmo com bug no código, dados de um município
  nunca vazam para outro
- Exportação por município é direta: filtrar por `tenant_id`
- Escala para dezenas de municípios sem mudança de arquitetura

**Regra absoluta:** toda tabela de negócio tem `tenant_id UUID NOT NULL` com FK
para `public.tenants`. Sem exceção.

Detalhamento completo em `MULTI_TENANT.md`.

---

## 8. Registro de Funcionalidades (`platform_features`)

Para evitar duplicação, lacunas entre painéis e perda de controle sobre o que foi
implementado, toda funcionalidade da plataforma é registrada nesta tabela.

```sql
CREATE TABLE public.platform_features (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sistema           VARCHAR(50) NOT NULL,          -- 'saude'
  modulo            VARCHAR(50) NOT NULL,          -- 'tfd', 'regulacao', etc.
  funcionalidade    VARCHAR(100) NOT NULL,         -- 'abrir_solicitacao'
  descricao         TEXT NOT NULL,
  painel_dev        BOOLEAN NOT NULL DEFAULT false,
  painel_servidor   BOOLEAN NOT NULL DEFAULT false,
  permissao_chave   VARCHAR(100),                 -- chave no JSONB de permissões
  status            VARCHAR(20) NOT NULL DEFAULT 'ativo',
  sprint            VARCHAR(20),
  criado_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**O agente do Cursor deve:** antes de implementar qualquer funcionalidade nova,
consultar esta tabela. Se existir em um painel e não no outro, sinalizar e sugerir
implementação no painel faltante.

---

## 9. Integração CADSUS

O CADSUS (Cadastro Nacional de Usuários do SUS) concentra dados de pacientes do SUS.
A integração beneficia todos os módulos que precisam identificar pacientes —
não é exclusividade do TFD.

**Estratégia em fases:**
- **Fase 1 (MVP):** stub local com dados mockados
- **Fase 2:** integração real via RNDS (Rede Nacional de Dados em Saúde)

**Regras independentes da fase:**
- Todo dado vindo do CADSUS é gravado no banco local
- A origem é registrada (`cadsus_sincronizado_at`)
- Toda consulta gera registro em `audit_logs`
- O banco local é a fonte de verdade operacional — o CADSUS é auxiliar
- A configuração da autenticação CADSUS é feita no Painel Dev por município

Detalhamento em `CADSUS.md`.

---

## 10. Estrutura do Monorepo

```
saude-munic/
│
├── apps/
│   ├── painel-dev/          → Painel do desenvolvedor (porta 3000)
│   └── painel-servidor/     → Operação dos municípios (porta 3001)
│
├── packages/
│   ├── core-auth/           → @saude/core-auth
│   ├── core-db/             → @saude/core-db (Prisma client + schema)
│   ├── core-documents/      → @saude/core-documents (protocolo, tramitação, audit)
│   ├── core-notifications/  → @saude/core-notifications (e-mail, in-app)
│   ├── ui/                  → @saude/ui (componentes compartilhados)
│   └── validators/          → @saude/validators (schemas Zod, ActionResponse)
│
├── modules/
│   └── saude/               → Sistema de Saúde (única secretaria da plataforma)
│       ├── tfd/             → @saude/mod-saude-tfd        ← MVP
│       ├── regulacao/       → @saude/mod-saude-regulacao  ← futuro
│       ├── visa/            → @saude/mod-saude-visa       ← futuro
│       └── ...              → ver MUNICIPAL_MAP.md
│
├── docs/
│   ├── ARCHITECTURE.md      ← este arquivo
│   ├── MUNICIPAL_MAP.md
│   ├── DATABASE_SCHEMA.md
│   ├── AUTH_PERMISSIONS.md
│   ├── BUSINESS_RULES.md
│   ├── MULTI_TENANT.md
│   ├── MONOREPO.md
│   ├── CODING_STANDARDS.md
│   ├── API_CONTRACTS.md
│   ├── DESIGN_SYSTEM.md
│   ├── SECURITY.md
│   ├── CADSUS.md
│   ├── SPRINTS.md
│   └── PROMPT_TEMPLATES.md
│
├── turbo.json
├── package.json
├── tsconfig.base.json
├── .env.example
└── .cursorrules
```

---

## 11. Fluxo de uma Requisição

```
1. Requisição chega em `campograndems.<dominio-base>/saude/tfd`
2. Cloudflare → Vercel → Next.js Middleware
3. Tenant Resolver: resolve tenant_id pelo domínio (consulta ao banco)
4. Verifica módulo ativo para o município → 404 se inativo
5. Injeta tenant_id, módulos ativos e tema no contexto
6. NextAuth valida sessão → extrai user_id, role, permissões
7. Server Component / Server Action executa
8. Prisma + RLS → retorna apenas dados daquele município
```

---

## 12. Princípios Arquiteturais Invioláveis

1. **tenant_id obrigatório:** toda tabela de negócio tem `tenant_id`. Toda query
   filtra por `tenant_id`. Sem exceção.

2. **RLS sempre ativo:** nunca desabilitar, nem para migrations ou seeds.

3. **Dados de saúde são sensíveis (LGPD Art. 11):** CID, diagnóstico e laudos
   nunca aparecem em listagens. Apenas no detalhe com permissão explícita.

4. **Auditoria obrigatória:** toda ação de escrita gera registro em `audit_logs`.

5. **Módulo inativo = 404:** nunca 403. O município não deve saber que um módulo
   existe se não o contratou.

6. **Platform features registradas:** toda funcionalidade nova registrada em
   `platform_features`. O agente verifica antes de implementar.

7. **Paridade de painéis:** lacunas entre painéis devem ser sinalizadas e corrigidas.

8. **Nenhum dado sensível em log:** CPF, CNS, CID, senha, token, diagnóstico
   nunca aparecem em logs.

9. **Legislação brasileira respeitada:** regras de negócio seguem as portarias
   do SUS. Nada pode contradizê-las.

10. **Schema versionado:** toda mudança de banco passa por `prisma migrate`.

11. **Um código, múltiplos municípios:** nenhuma lógica hardcoded por município.

---

## 13. Decisões Arquiteturais Registradas

| Decisão | Alternativa considerada | Motivo da escolha |
|---|---|---|
| 2 apps separados (dev + servidor) | 1 app com áreas por papel | Propósitos distintos, layouts diferentes, middlewares independentes |
| Multi-tenant RLS + tenant_id | Banco separado por município | Custo único, manutenção simples, exportação trivial por tenant_id |
| Cloudflare para domínios | Vercel Domains API | Suporte a .gov.br, wildcard SSL, API robusta para automação |
| Neon para PostgreSQL | Railway ou Supabase | Serverless, escala automática, branching para dev/staging |
| Server Actions para lógica | API Routes separadas | Menos boilerplate, tipagem end-to-end, validação Zod integrada |
| platform_features no banco | Só nos docs markdown | Consultável pelo agente em tempo real durante o desenvolvimento |
| CADSUS stub no MVP | Integração real desde o início | Reduz complexidade; arquitetura preparada para ativar quando necessário |
| Plataforma exclusiva de Saúde | Plataforma genérica municipal | Foco no domínio, regras específicas, menos complexidade geral |
| getPrismaAdmin() separado de getPrismaForTenant | Usar getPrismaForTenant no Dev | Painel Dev opera sobre tabelas globais sem RLS — helper explícito documenta o uso intencional e evita violação da regra do painel-servidor |
| requireSuperAdmin() como função separada | Reutilizar requireTenantRole | SUPERADMIN não tem tenant — papel e fluxo de autenticação distintos |
| Actions e queries de tenant em apps/painel-dev/lib/ | Colocar em packages/core-auth | Exclusivas do Painel Dev — não pertencem ao core compartilhado |

---

## 14. Documentos Relacionados

Leia nesta ordem antes de implementar qualquer coisa:

1. `MUNICIPAL_MAP.md` — mapa de módulos do sistema de saúde
2. `MULTI_TENANT.md` — isolamento por município na prática
3. `DATABASE_SCHEMA.md` — schema completo do banco
4. `AUTH_PERMISSIONS.md` — papéis e permissões granulares
5. `BUSINESS_RULES.md` — regras de negócio por módulo (legislação)
6. `SECURITY.md` — LGPD e proteção de dados sensíveis de saúde
7. `MONOREPO.md` — estrutura de pastas e packages
8. `CODING_STANDARDS.md` — padrões de código obrigatórios
9. `API_CONTRACTS.md` — contratos de entrada e saída
10. `CADSUS.md` — integração com o sistema federal
11. `SPRINTS.md` — roteiro de implementação
