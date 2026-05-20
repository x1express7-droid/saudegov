# DATABASE_SCHEMA.md
# saudegov — Schema do Banco de Dados

> **Instruções para o agente do Cursor:** Consulte este arquivo antes de qualquer
> tarefa que envolva criação ou alteração de tabelas, escrita de queries, migrations
> ou relacionamentos entre entidades. Nunca crie tabelas fora dos schemas definidos
> aqui. Nunca altere tabelas do schema `public` a partir de um módulo. Toda migration
> deve seguir as regras da seção 9.

---

## 1. Visão Geral do Banco

**SGBD:** PostgreSQL 15+
**ORM:** Prisma com `prisma migrate`
**Isolamento:** tenant_id em todas as tabelas de negócio + Row Level Security (RLS)
**Regra absoluta:** toda tabela de negócio tem `tenant_id UUID NOT NULL` com FK
para `public.tenants`.

### Schemas existentes

| Schema | Finalidade | Quem escreve |
|---|---|---|
| `public` | Core compartilhado — base de toda a plataforma | Apenas packages do core |
| `saude_base` | Entidades compartilhadas entre módulos de saúde | Módulos `@saude/*` via core |
| `saude_tfd` | Módulo TFD — MVP | Apenas `@saude/mod-saude-tfd` |
| `saude_regul` | Módulo Regulação — futuro | Apenas `@saude/mod-saude-regul` |
| `saude_visa` | Módulo Vigilância Sanitária — futuro | Apenas `@saude/mod-saude-visa` |

**Convenção obrigatória para novos schemas:** `saude_{sigla_modulo}`
Consulte `MUNICIPAL_MAP.md` seção 5 para as siglas corretas.

### Convenções globais

```
Tabelas:     snake_case, plural              → pacientes, solicitacoes
Colunas:     snake_case                      → tenant_id, created_at
PKs:         id UUID DEFAULT gen_random_uuid()
FKs:         {tabela_singular}_id            → tenant_id, paciente_id
Timestamps:  created_at, updated_at          → TIMESTAMPTZ NOT NULL DEFAULT NOW()
Soft delete: deleted_at TIMESTAMPTZ NULL     → NULL = ativo
Enums:       UPPER_SNAKE_CASE               → EM_ANALISE, AGUARDANDO_PC
Índices:     idx_{schema}_{tabela}_{coluna}  → idx_tfd_sol_tenant
```

---

## 2. Schema `public` — Core Compartilhado

### 2.1 `public.tenants` — Municípios

Raiz de toda a hierarquia. Registro de cada município na plataforma.

```sql
CREATE TABLE public.tenants (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            VARCHAR(100) UNIQUE NOT NULL,   -- 'campo-grande-ms'
  name            VARCHAR(200) NOT NULL,           -- 'Prefeitura de Campo Grande'
  domain          VARCHAR(255) UNIQUE NOT NULL,    -- 'campograndems.saudemunic.com.br'
  domain_custom   VARCHAR(255) UNIQUE,             -- 'saude.campogrande.ms.gov.br'
  cloudflare_zone_id VARCHAR(100),                 -- ID da zona no Cloudflare
  cloudflare_record_id VARCHAR(100),               -- ID do registro DNS criado
  -- Módulos ativos: { "saude": { "tfd": true, "regul": false } }
  modules         JSONB NOT NULL DEFAULT '{"saude": {"tfd": false}}',
  -- Tema visual: cores, logo, favicon
  theme           JSONB NOT NULL DEFAULT '{}',
  -- Configurações: timezone, CADSUS, etc.
  settings        JSONB NOT NULL DEFAULT '{}',
  active          BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tenants_domain        ON public.tenants(domain);
CREATE INDEX idx_tenants_domain_custom ON public.tenants(domain_custom);
CREATE INDEX idx_tenants_slug          ON public.tenants(slug);
CREATE INDEX idx_tenants_active        ON public.tenants(active);

-- Sem RLS — lida pelo Tenant Resolver antes do contexto estar disponível
```

**Estrutura do campo `modules`:**
```json
{
  "saude": {
    "tfd": true,
    "regul": false,
    "visa": false,
    "farma": false,
    "ubs": false
  }
}
```

**Estrutura do campo `theme`:**
```json
{
  "primaryColor": "#1a5fa8",
  "logoUrl": "https://storage.../logo.png",
  "municipalityName": "Prefeitura de Campo Grande",
  "headerBgColor": "#1a5fa8",
  "headerTextColor": "#ffffff"
}
```

**Estrutura do campo `settings`:**
```json
{
  "timezone": "America/Campo_Grande",
  "cnpj": "03.501.598/0001-18",
  "cadsus_enabled": false,
  "cadsus_token": null,
  "notification_email": "saude@campogrande.ms.gov.br"
}
```

---

### 2.2 `public.users` — Usuários

Registro de todos os usuários da plataforma (ADMIN, GESTOR, SERVIDOR).
Não há usuário CIDADÃO — o sistema é operado exclusivamente por servidores.

```sql
CREATE TYPE public.user_role AS ENUM (
  'SUPERADMIN',  -- desenvolvedor, acesso global
  'ADMIN',       -- gestor do município
  'GESTOR',      -- responsável por módulo/setor
  'SERVIDOR'     -- operador público
);

CREATE TABLE public.users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  -- tenant_id NULL apenas para SUPERADMIN
  role            public.user_role NOT NULL DEFAULT 'SERVIDOR',
  name            VARCHAR(200) NOT NULL,
  cpf             VARCHAR(11),                  -- apenas dígitos
  matricula       VARCHAR(50),                  -- matrícula funcional
  email           VARCHAR(255) NOT NULL,
  email_verified  BOOLEAN NOT NULL DEFAULT false,
  phone           VARCHAR(20),
  password_hash   VARCHAR(255),
  active          BOOLEAN NOT NULL DEFAULT true,
  -- Permissões granulares: { "saude.tfd.analisar_laudo": true }
  permissions     JSONB NOT NULL DEFAULT '{}',
  last_login_at   TIMESTAMPTZ,
  deleted_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_users_tenant_email UNIQUE (tenant_id, email),
  CONSTRAINT uq_users_tenant_cpf   UNIQUE (tenant_id, cpf)
);

CREATE INDEX idx_users_tenant_id  ON public.users(tenant_id);
CREATE INDEX idx_users_email      ON public.users(tenant_id, email);
CREATE INDEX idx_users_cpf        ON public.users(tenant_id, cpf);
CREATE INDEX idx_users_role       ON public.users(tenant_id, role);
CREATE INDEX idx_users_active     ON public.users(tenant_id, active)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_users_permissions ON public.users USING gin(permissions);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON public.users
  USING (
    tenant_id = current_setting('app.current_tenant_id')::uuid
    OR role = 'SUPERADMIN'
  );
```

---

### 2.3 `public.secretarias` / `departamentos` / `setores` — Organograma

Hierarquia organizacional do município. Define o roteamento automático de processos.

```sql
CREATE TABLE public.secretarias (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  nome            VARCHAR(200) NOT NULL,
  sigla           VARCHAR(20),
  responsavel_id  UUID REFERENCES public.users(id) ON DELETE SET NULL,
  ativa           BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.departamentos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  secretaria_id   UUID NOT NULL REFERENCES public.secretarias(id) ON DELETE CASCADE,
  nome            VARCHAR(200) NOT NULL,
  sigla           VARCHAR(20),
  responsavel_id  UUID REFERENCES public.users(id) ON DELETE SET NULL,
  ativo           BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.setores (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  departamento_id UUID NOT NULL REFERENCES public.departamentos(id) ON DELETE CASCADE,
  nome            VARCHAR(200) NOT NULL,
  sigla           VARCHAR(20),
  email_setor     VARCHAR(255),
  responsavel_id  UUID REFERENCES public.users(id) ON DELETE SET NULL,
  ativo           BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Vínculo servidor ↔ setor (um servidor pode atuar em múltiplos setores)
CREATE TABLE public.servidor_setores (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  setor_id    UUID NOT NULL REFERENCES public.setores(id) ON DELETE CASCADE,
  cargo       VARCHAR(200),
  principal   BOOLEAN NOT NULL DEFAULT false,
  ativo       BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_servidor_setor UNIQUE (user_id, setor_id)
);

-- Define qual setor é responsável por cada módulo
CREATE TABLE public.modulo_setor_responsavel (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  modulo      VARCHAR(50) NOT NULL,  -- 'saude.tfd', 'saude.regul'
  setor_id    UUID NOT NULL REFERENCES public.setores(id) ON DELETE CASCADE,
  ativo       BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_modulo_setor UNIQUE (tenant_id, modulo, setor_id)
);

-- RLS em todas as tabelas do organograma
ALTER TABLE public.secretarias ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON public.secretarias
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

ALTER TABLE public.departamentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON public.departamentos
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

ALTER TABLE public.setores ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON public.setores
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

ALTER TABLE public.servidor_setores ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON public.servidor_setores
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

ALTER TABLE public.modulo_setor_responsavel ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON public.modulo_setor_responsavel
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
```

---

### 2.4 `public.processos` — Protocolo Unificado

Registro central de todos os processos de todos os módulos. Cada módulo cria
um processo aqui e depois cria seu próprio registro específico vinculado.

```sql
CREATE TYPE public.processo_status AS ENUM (
  'ABERTO',
  'EM_ANDAMENTO',
  'AGUARDANDO_COMPLEMENTO',
  'CONCLUIDO',
  'CANCELADO',
  'ARQUIVADO'
);

CREATE TABLE public.processos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  protocolo       VARCHAR(50) NOT NULL,   -- '2025-SAUDE-TFD-000001'
  modulo          VARCHAR(50) NOT NULL,   -- 'saude.tfd', 'saude.regul'
  status          public.processo_status NOT NULL DEFAULT 'ABERTO',
  titulo          VARCHAR(500) NOT NULL,
  setor_id        UUID REFERENCES public.setores(id) ON DELETE SET NULL,
  responsavel_id  UUID REFERENCES public.users(id) ON DELETE SET NULL,
  aberto_por_id   UUID REFERENCES public.users(id) ON DELETE SET NULL,
  concluido_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_protocolo UNIQUE (tenant_id, protocolo)
);

CREATE INDEX idx_processos_tenant_id  ON public.processos(tenant_id);
CREATE INDEX idx_processos_protocolo  ON public.processos(tenant_id, protocolo);
CREATE INDEX idx_processos_modulo     ON public.processos(tenant_id, modulo);
CREATE INDEX idx_processos_status     ON public.processos(tenant_id, status);
CREATE INDEX idx_processos_setor      ON public.processos(setor_id);

ALTER TABLE public.processos ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON public.processos
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
```

---

### 2.5 `public.tramitacoes` — Histórico de Movimentações

Histórico imutável de todas as movimentações de qualquer processo.
Registros nunca são alterados ou deletados — apenas inseridos.

```sql
CREATE TYPE public.tramitacao_tipo AS ENUM (
  'ABERTURA',
  'ENCAMINHAMENTO',
  'COMPLEMENTO_SOLICITADO',
  'COMPLEMENTO_ENVIADO',
  'DECISAO',
  'AGENDAMENTO',
  'RETORNO_REGISTRADO',
  'PRESTACAO_ENVIADA',
  'PRESTACAO_APROVADA',
  'PRESTACAO_REJEITADA',
  'CANCELAMENTO',
  'CONCLUSAO',
  'OBSERVACAO_INTERNA'  -- visível apenas para servidores
);

CREATE TABLE public.tramitacoes (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  processo_id      UUID NOT NULL REFERENCES public.processos(id) ON DELETE CASCADE,
  tipo             public.tramitacao_tipo NOT NULL,
  descricao        TEXT NOT NULL,
  visivel_servidor BOOLEAN NOT NULL DEFAULT true,
  usuario_id       UUID REFERENCES public.users(id) ON DELETE SET NULL,
  metadata         JSONB DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
  -- SEM updated_at — registros de tramitação são imutáveis
);

CREATE INDEX idx_tramitacoes_tenant    ON public.tramitacoes(tenant_id);
CREATE INDEX idx_tramitacoes_processo  ON public.tramitacoes(processo_id);
CREATE INDEX idx_tramitacoes_created   ON public.tramitacoes(created_at DESC);

ALTER TABLE public.tramitacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON public.tramitacoes
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
```

---

### 2.6 `public.anexos` — Gestão de Documentos

Central de arquivos de todos os módulos. Laudos, comprovantes, documentos.

```sql
CREATE TABLE public.anexos (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  processo_id      UUID REFERENCES public.processos(id) ON DELETE CASCADE,
  uploader_id      UUID REFERENCES public.users(id) ON DELETE SET NULL,
  nome_original    VARCHAR(500) NOT NULL,
  storage_path     VARCHAR(1000) NOT NULL,   -- caminho no S3/R2
  mime_type        VARCHAR(100) NOT NULL,
  tamanho_bytes    BIGINT NOT NULL,
  confirmado       BOOLEAN NOT NULL DEFAULT false,  -- confirmado após upload ao S3
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_anexos_tenant    ON public.anexos(tenant_id);
CREATE INDEX idx_anexos_processo  ON public.anexos(processo_id);

ALTER TABLE public.anexos ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON public.anexos
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
```

---

### 2.7 `public.notificacoes` — Central de Notificações

```sql
CREATE TYPE public.notificacao_canal AS ENUM ('EMAIL', 'IN_APP');
CREATE TYPE public.notificacao_status AS ENUM ('PENDENTE', 'ENVIADO', 'FALHOU', 'LIDO');

CREATE TABLE public.notificacoes (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id      UUID REFERENCES public.users(id) ON DELETE CASCADE,
  processo_id  UUID REFERENCES public.processos(id) ON DELETE CASCADE,
  canal        public.notificacao_canal NOT NULL,
  status       public.notificacao_status NOT NULL DEFAULT 'PENDENTE',
  titulo       VARCHAR(200) NOT NULL,
  corpo        TEXT NOT NULL,
  tentativas   INTEGER NOT NULL DEFAULT 0,
  lido_at      TIMESTAMPTZ,
  enviado_at   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notif_tenant   ON public.notificacoes(tenant_id);
CREATE INDEX idx_notif_user     ON public.notificacoes(user_id);
CREATE INDEX idx_notif_pendente ON public.notificacoes(status)
  WHERE status = 'PENDENTE';

ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON public.notificacoes
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
```

---

### 2.8 `public.audit_logs` — Auditoria Global

Log imutável de todas as ações. Sem RLS — o SUPERADMIN precisa ver todos.

```sql
CREATE TABLE public.audit_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  user_id         UUID REFERENCES public.users(id) ON DELETE SET NULL,
  acao            VARCHAR(100) NOT NULL,   -- 'CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'READ_SENSITIVE'
  entidade        VARCHAR(100) NOT NULL,   -- nome da tabela afetada
  entidade_id     UUID,
  payload_antes   JSONB,
  payload_depois  JSONB,
  ip_address      INET,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
  -- SEM updated_at — logs são imutáveis
);

CREATE INDEX idx_audit_tenant    ON public.audit_logs(tenant_id);
CREATE INDEX idx_audit_user      ON public.audit_logs(user_id);
CREATE INDEX idx_audit_entidade  ON public.audit_logs(entidade, entidade_id);
CREATE INDEX idx_audit_created   ON public.audit_logs(created_at DESC);

-- Sem RLS — SUPERADMIN lê audit_logs de todos os tenants
```

---

### 2.9 `public.protocolo_sequencias` — Geração de Protocolos Únicos

```sql
CREATE TABLE public.protocolo_sequencias (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  modulo      VARCHAR(50) NOT NULL,   -- 'SAUDE_TFD', 'SAUDE_REGUL'
  ano         INTEGER NOT NULL,
  ultimo_seq  INTEGER NOT NULL DEFAULT 0,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_protocolo_seq UNIQUE (tenant_id, modulo, ano)
);
```

---

### 2.10 `public.platform_features` — Registro de Funcionalidades

Controle de desenvolvimento — o que foi implementado, onde e com qual permissão.
Consultado pelo agente do Cursor antes de qualquer implementação.

```sql
CREATE TABLE public.platform_features (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sistema           VARCHAR(50) NOT NULL,           -- 'saude'
  modulo            VARCHAR(50) NOT NULL,           -- 'tfd', 'regul'
  funcionalidade    VARCHAR(100) NOT NULL,          -- 'abrir_solicitacao'
  descricao         TEXT NOT NULL,
  painel_dev        BOOLEAN NOT NULL DEFAULT false,
  painel_servidor   BOOLEAN NOT NULL DEFAULT false,
  permissao_chave   VARCHAR(100),                  -- 'saude.tfd.abrir_solicitacao'
  status            VARCHAR(20) NOT NULL DEFAULT 'ativo',
  sprint            VARCHAR(20),
  criado_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_platform_feature UNIQUE (sistema, modulo, funcionalidade)
);

-- Sem RLS e sem tenant_id — é dado global da plataforma, não por município
```

---

## 3. Schema `saude_base` — Compartilhado entre Módulos de Saúde

Entidades usadas por mais de um módulo de saúde. Nunca duplicar aqui o que já
existe no `public`. Nunca duplicar num módulo o que já existe aqui.

### 3.1 `saude_base.pacientes` — Cadastro Único de Pacientes

```sql
CREATE TYPE saude_base.sexo AS ENUM ('MASCULINO', 'FEMININO', 'NAO_INFORMADO');

CREATE TABLE saude_base.pacientes (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id               UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  -- Vínculo com usuário interno (opcional — paciente pode não ter login)
  user_id                 UUID REFERENCES public.users(id) ON DELETE SET NULL,
  -- Dados de identificação
  nome                    VARCHAR(200) NOT NULL,
  cpf                     VARCHAR(11),                -- apenas dígitos
  cns                     VARCHAR(15),                -- Cartão Nacional de Saúde (15 dígitos)
  data_nascimento         DATE,
  sexo                    saude_base.sexo,
  nome_mae                VARCHAR(200),
  municipio_nascimento    VARCHAR(200),
  -- Endereço
  cep                     VARCHAR(8),
  logradouro              VARCHAR(300),
  numero                  VARCHAR(20),
  complemento             VARCHAR(100),
  bairro                  VARCHAR(100),
  municipio               VARCHAR(200),
  uf                      CHAR(2),
  -- Contato
  telefone                VARCHAR(20),
  telefone_alternativo    VARCHAR(20),
  -- CADSUS
  cadsus_sincronizado_at  TIMESTAMPTZ,
  cadsus_divergencia      BOOLEAN NOT NULL DEFAULT false,
  -- Controle
  ativo                   BOOLEAN NOT NULL DEFAULT true,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_paciente_tenant_cpf UNIQUE (tenant_id, cpf),
  CONSTRAINT uq_paciente_tenant_cns UNIQUE (tenant_id, cns)
);

CREATE INDEX idx_base_pacientes_tenant    ON saude_base.pacientes(tenant_id);
CREATE INDEX idx_base_pacientes_cpf       ON saude_base.pacientes(tenant_id, cpf);
CREATE INDEX idx_base_pacientes_cns       ON saude_base.pacientes(tenant_id, cns);
CREATE INDEX idx_base_pacientes_nome      ON saude_base.pacientes(tenant_id, nome);

ALTER TABLE saude_base.pacientes ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON saude_base.pacientes
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
```

---

### 3.2 `saude_base.unidades` — Unidades de Saúde

```sql
CREATE TYPE saude_base.tipo_unidade AS ENUM (
  'UBS', 'USF', 'UPA', 'HOSPITAL', 'CLINICA', 'CAPS', 'OUTRO'
);

CREATE TABLE saude_base.unidades (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  nome        VARCHAR(200) NOT NULL,
  tipo        saude_base.tipo_unidade NOT NULL,
  cnes        VARCHAR(7),                  -- Cadastro Nacional de Estabelecimentos de Saúde
  cep         VARCHAR(8),
  logradouro  VARCHAR(300),
  municipio   VARCHAR(200),
  uf          CHAR(2),
  telefone    VARCHAR(20),
  ativa       BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_base_unidades_tenant ON saude_base.unidades(tenant_id);

ALTER TABLE saude_base.unidades ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON saude_base.unidades
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
```

---

## 4. Schema `saude_tfd` — Módulo TFD

### 4.1 Tabelas de Configuração (preenchidas pelo Admin/Gestor antes de operar)

```sql
-- Especialidades médicas disponíveis no município
CREATE TABLE saude_tfd.especialidades (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  nome        VARCHAR(200) NOT NULL,
  ativa       BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Procedimentos vinculados a uma especialidade
CREATE TABLE saude_tfd.procedimentos (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  especialidade_id UUID NOT NULL REFERENCES saude_tfd.especialidades(id) ON DELETE CASCADE,
  nome             VARCHAR(200) NOT NULL,
  codigo_sigtap    VARCHAR(20),    -- código na Tabela SIGTAP do DATASUS
  ativo            BOOLEAN NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Prestadores de saúde externos (hospitais/clínicas de destino)
CREATE TABLE saude_tfd.prestadores (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  nome             VARCHAR(200) NOT NULL,
  cnpj             VARCHAR(14),
  cnes             VARCHAR(7),
  cidade           VARCHAR(200) NOT NULL,
  estado           CHAR(2) NOT NULL,
  telefone         VARCHAR(20),
  especialidades   JSONB NOT NULL DEFAULT '[]',  -- array de especialidade_ids
  ativo            BOOLEAN NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Veículos da frota municipal para TFD
CREATE TABLE saude_tfd.veiculos (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id              UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  placa                  VARCHAR(10) NOT NULL,
  modelo                 VARCHAR(100) NOT NULL,
  capacidade_passageiros INTEGER NOT NULL DEFAULT 1,
  ativo                  BOOLEAN NOT NULL DEFAULT true,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_veiculo_placa UNIQUE (tenant_id, placa)
);

-- Motoristas vinculados a servidores cadastrados
CREATE TABLE saude_tfd.motoristas (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  cnh           VARCHAR(20) NOT NULL,
  cnh_categoria VARCHAR(5) NOT NULL,
  cnh_validade  DATE NOT NULL,
  ativo         BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_motorista_user UNIQUE (tenant_id, user_id)
);

-- RLS em todas as tabelas de configuração
ALTER TABLE saude_tfd.especialidades ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON saude_tfd.especialidades
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

ALTER TABLE saude_tfd.procedimentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON saude_tfd.procedimentos
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

ALTER TABLE saude_tfd.prestadores ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON saude_tfd.prestadores
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

ALTER TABLE saude_tfd.veiculos ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON saude_tfd.veiculos
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

ALTER TABLE saude_tfd.motoristas ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON saude_tfd.motoristas
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
```

---

### 4.2 Saldos e Controle Financeiro

```sql
CREATE TYPE saude_tfd.fonte_recurso AS ENUM (
  'FEDERAL_FNS',      -- Fundo Nacional de Saúde
  'ESTADUAL',         -- repasse estadual
  'MUNICIPAL_PROPRIO',-- recurso próprio do município
  'EMENDA_PARLAMENTAR'
);

-- Saldo financeiro destinado ao TFD por período/fonte
CREATE TABLE saude_tfd.saldos (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  descricao          TEXT NOT NULL,
  fonte              saude_tfd.fonte_recurso NOT NULL,
  valor_total        DECIMAL(12,2) NOT NULL,
  competencia_inicio DATE NOT NULL,
  competencia_fim    DATE NOT NULL,
  ativo              BOOLEAN NOT NULL DEFAULT true,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TYPE saude_tfd.reserva_status AS ENUM ('ATIVA', 'CONSUMIDA', 'LIBERADA');

-- Reservas criadas automaticamente na aprovação de cada solicitação
CREATE TABLE saude_tfd.reservas_saldo (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  saldo_id        UUID NOT NULL REFERENCES saude_tfd.saldos(id),
  solicitacao_id  UUID NOT NULL,  -- FK para saude_tfd.solicitacoes (adicionada depois)
  valor_estimado  DECIMAL(12,2) NOT NULL,
  status          saude_tfd.reserva_status NOT NULL DEFAULT 'ATIVA',
  consumido_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TYPE saude_tfd.movimentacao_tipo AS ENUM (
  'CREDITO',   -- saldo cadastrado
  'RESERVA',   -- bloqueado na aprovação
  'CONSUMO',   -- efetivado na conclusão
  'LIBERACAO', -- reserva cancelada (cancelamento do processo)
  'ESTORNO'    -- correção manual
);

-- Extrato de todas as movimentações financeiras do saldo
CREATE TABLE saude_tfd.movimentacoes_saldo (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  saldo_id       UUID NOT NULL REFERENCES saude_tfd.saldos(id),
  tipo           saude_tfd.movimentacao_tipo NOT NULL,
  valor          DECIMAL(12,2) NOT NULL,
  solicitacao_id UUID,
  descricao      TEXT NOT NULL,
  usuario_id     UUID NOT NULL REFERENCES public.users(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
  -- Imutável — sem updated_at
);

-- RLS
ALTER TABLE saude_tfd.saldos ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON saude_tfd.saldos
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

ALTER TABLE saude_tfd.reservas_saldo ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON saude_tfd.reservas_saldo
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

ALTER TABLE saude_tfd.movimentacoes_saldo ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON saude_tfd.movimentacoes_saldo
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
```

---

### 4.3 Solicitações TFD — Fluxo Principal

```sql
CREATE TYPE saude_tfd.status_solicitacao AS ENUM (
  'RASCUNHO',        -- salvo mas não enviado
  'ENVIADO',         -- enviado para regulação
  'EM_ANALISE',      -- médico regulador abriu e está analisando
  'PENDENTE',        -- regulador solicitou complemento de informações
  'APROVADO',        -- aprovado pelo regulador
  'NEGADO',          -- negado pelo regulador
  'AGENDADO',        -- viagem agendada
  'EM_VIAGEM',       -- data da viagem chegou (automático)
  'AGUARDANDO_PC',   -- viagem realizada, aguardando prestação de contas
  'PC_EM_ANALISE',   -- prestação enviada, gestor analisando
  'CONCLUIDO',       -- prestação aprovada, processo encerrado
  'CANCELADO'        -- cancelado em qualquer etapa antes de AGENDADO
);

CREATE TYPE saude_tfd.tipo_atendimento AS ENUM (
  'CONSULTA',  -- primeira consulta
  'RETORNO',   -- retorno — exige vínculo com consulta anterior
  'EXAME',
  'CIRURGIA'
);

CREATE TYPE saude_tfd.urgencia AS ENUM (
  'BAIXA',
  'INTERMEDIARIA',
  'GRAVE',
  'MUITO_URGENTE'
);

CREATE TABLE saude_tfd.solicitacoes (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id               UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  processo_id             UUID NOT NULL REFERENCES public.processos(id) ON DELETE CASCADE,
  paciente_id             UUID NOT NULL REFERENCES saude_base.pacientes(id),
  solicitante_id          UUID NOT NULL REFERENCES public.users(id),
  unidade_origem_id       UUID REFERENCES saude_base.unidades(id) ON DELETE SET NULL,
  especialidade_id        UUID REFERENCES saude_tfd.especialidades(id) ON DELETE SET NULL,
  prestador_id            UUID REFERENCES saude_tfd.prestadores(id) ON DELETE SET NULL,
  -- Array de UUIDs de procedimentos solicitados
  procedimentos           JSONB NOT NULL DEFAULT '[]',
  tipo_atendimento        saude_tfd.tipo_atendimento NOT NULL,
  -- Se RETORNO: vínculo obrigatório com solicitação anterior CONCLUIDA
  solicitacao_origem_id   UUID REFERENCES saude_tfd.solicitacoes(id) ON DELETE SET NULL,
  urgencia                saude_tfd.urgencia NOT NULL DEFAULT 'BAIXA',
  status                  saude_tfd.status_solicitacao NOT NULL DEFAULT 'RASCUNHO',
  -- Dados clínicos — LGPD Art. 11 — nunca retornar em listagens
  cid_principal           VARCHAR(10),
  diagnostico             TEXT,
  -- Laudo médico obrigatório para envio
  laudo_anexo_id          UUID REFERENCES public.anexos(id) ON DELETE SET NULL,
  -- Acompanhante (Portaria MS 55/1999 Art. 7 — exige indicação médica no laudo)
  acompanhante_necessario BOOLEAN NOT NULL DEFAULT false,
  -- Decisão do regulador
  fundamentacao_decisao   TEXT,
  decidido_por_id         UUID REFERENCES public.users(id) ON DELETE SET NULL,
  decidido_at             TIMESTAMPTZ,
  -- Vínculo financeiro (definido na aprovação)
  saldo_id                UUID REFERENCES saude_tfd.saldos(id) ON DELETE SET NULL,
  -- Motivo de cancelamento
  motivo_cancelamento     TEXT,
  cancelado_por_id        UUID REFERENCES public.users(id) ON DELETE SET NULL,
  cancelado_at            TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tfd_sol_tenant       ON saude_tfd.solicitacoes(tenant_id);
CREATE INDEX idx_tfd_sol_processo     ON saude_tfd.solicitacoes(processo_id);
CREATE INDEX idx_tfd_sol_paciente     ON saude_tfd.solicitacoes(paciente_id);
CREATE INDEX idx_tfd_sol_status       ON saude_tfd.solicitacoes(tenant_id, status);
CREATE INDEX idx_tfd_sol_urgencia     ON saude_tfd.solicitacoes(tenant_id, urgencia);
CREATE INDEX idx_tfd_sol_origem       ON saude_tfd.solicitacoes(solicitacao_origem_id)
  WHERE solicitacao_origem_id IS NOT NULL;

ALTER TABLE saude_tfd.solicitacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON saude_tfd.solicitacoes
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- FK diferida para reservas (evita circularidade)
ALTER TABLE saude_tfd.reservas_saldo
  ADD CONSTRAINT fk_reserva_solicitacao
  FOREIGN KEY (solicitacao_id) REFERENCES saude_tfd.solicitacoes(id);
```

---

### 4.4 Acompanhantes

```sql
CREATE TYPE saude_tfd.relacao_acompanhante AS ENUM (
  'CONJUGE', 'FILHO_A', 'PAI_MAE', 'RESPONSAVEL_LEGAL', 'CUIDADOR', 'OUTRO'
);

CREATE TABLE saude_tfd.acompanhantes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  solicitacao_id  UUID NOT NULL REFERENCES saude_tfd.solicitacoes(id) ON DELETE CASCADE,
  nome            VARCHAR(200) NOT NULL,
  cpf             VARCHAR(11) NOT NULL,
  relacao         saude_tfd.relacao_acompanhante NOT NULL,
  telefone        VARCHAR(20),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tfd_acomp_solicitacao ON saude_tfd.acompanhantes(solicitacao_id);

ALTER TABLE saude_tfd.acompanhantes ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON saude_tfd.acompanhantes
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
```

---

### 4.5 Viagens

```sql
CREATE TYPE saude_tfd.viagem_status AS ENUM (
  'AGENDADA', 'REALIZADA', 'CANCELADA'
);

CREATE TABLE saude_tfd.viagens (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  solicitacao_id        UUID NOT NULL REFERENCES saude_tfd.solicitacoes(id) ON DELETE CASCADE,
  sequencia             INTEGER NOT NULL DEFAULT 1,  -- 1ª viagem, 2ª viagem, etc.
  data_viagem           DATE NOT NULL,
  hora_saida            TIME,
  veiculo_id            UUID REFERENCES saude_tfd.veiculos(id) ON DELETE SET NULL,
  motorista_id          UUID REFERENCES saude_tfd.motoristas(id) ON DELETE SET NULL,
  acompanhante_id       UUID REFERENCES saude_tfd.acompanhantes(id) ON DELETE SET NULL,
  observacoes           TEXT,
  status                saude_tfd.viagem_status NOT NULL DEFAULT 'AGENDADA',
  retorno_registrado_at TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tfd_viagens_solicitacao ON saude_tfd.viagens(solicitacao_id);
CREATE INDEX idx_tfd_viagens_data        ON saude_tfd.viagens(tenant_id, data_viagem);
CREATE INDEX idx_tfd_viagens_motorista   ON saude_tfd.viagens(motorista_id);
CREATE INDEX idx_tfd_viagens_status      ON saude_tfd.viagens(tenant_id, status);

ALTER TABLE saude_tfd.viagens ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON saude_tfd.viagens
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
```

---

### 4.6 Despesas e Prestação de Contas

```sql
CREATE TYPE saude_tfd.tipo_despesa AS ENUM (
  'TRANSPORTE',    -- passagem, combustível, km rodado
  'ALIMENTACAO',   -- ajuda de custo alimentação
  'HOSPEDAGEM',    -- diária de pernoite
  'OUTRO'
);

CREATE TYPE saude_tfd.responsavel_pagamento AS ENUM (
  'MUNICIPIO',          -- município paga diretamente
  'PACIENTE_REEMBOLSO'  -- paciente paga e é reembolsado
);

-- Itens individuais de despesa por viagem
CREATE TABLE saude_tfd.itens_despesa (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  viagem_id             UUID NOT NULL REFERENCES saude_tfd.viagens(id) ON DELETE CASCADE,
  tipo                  saude_tfd.tipo_despesa NOT NULL,
  descricao             VARCHAR(300),
  valor                 DECIMAL(10,2) NOT NULL,
  comprovante_anexo_id  UUID REFERENCES public.anexos(id) ON DELETE SET NULL,
  responsavel_pagamento saude_tfd.responsavel_pagamento NOT NULL DEFAULT 'MUNICIPIO',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tfd_despesas_viagem ON saude_tfd.itens_despesa(viagem_id);

ALTER TABLE saude_tfd.itens_despesa ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON saude_tfd.itens_despesa
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE TYPE saude_tfd.prestacao_status AS ENUM (
  'PENDENTE',   -- aguardando servidor lançar as despesas
  'ENVIADA',    -- servidor enviou para aprovação do gestor
  'APROVADA',   -- gestor aprovou — processo CONCLUIDO
  'REJEITADA'   -- gestor rejeitou — servidor deve corrigir e reenviar
);

-- Prestação de contas por viagem
CREATE TABLE saude_tfd.prestacoes_conta (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  viagem_id           UUID NOT NULL REFERENCES saude_tfd.viagens(id) ON DELETE CASCADE,
  saldo_id            UUID REFERENCES saude_tfd.saldos(id) ON DELETE SET NULL,
  status              saude_tfd.prestacao_status NOT NULL DEFAULT 'PENDENTE',
  -- IDs dos comprovantes já visualizados pelo gestor (controle de aprovação)
  comprovantes_vistos JSONB NOT NULL DEFAULT '[]',
  aprovado_por_id     UUID REFERENCES public.users(id) ON DELETE SET NULL,
  aprovado_at         TIMESTAMPTZ,
  observacoes_gestor  TEXT,
  -- Prazo: data_viagem + 10 dias corridos
  prazo_envio_at      TIMESTAMPTZ NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_prestacao_viagem UNIQUE (viagem_id)
);

CREATE INDEX idx_tfd_prestacoes_viagem  ON saude_tfd.prestacoes_conta(viagem_id);
CREATE INDEX idx_tfd_prestacoes_status  ON saude_tfd.prestacoes_conta(tenant_id, status);
CREATE INDEX idx_tfd_prestacoes_prazo   ON saude_tfd.prestacoes_conta(prazo_envio_at)
  WHERE status = 'PENDENTE';

ALTER TABLE saude_tfd.prestacoes_conta ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON saude_tfd.prestacoes_conta
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
```

---

## 5. Diagrama de Relacionamentos do TFD

```
public.tenants (1)
  ├── (N) public.users
  ├── (N) public.secretarias → departamentos → setores
  ├── (N) public.modulo_setor_responsavel
  ├── (N) public.processos
  │     ├── (N) public.tramitacoes
  │     └── (N) public.anexos
  ├── (N) public.notificacoes
  ├── (N) public.audit_logs
  └── (N) public.protocolo_sequencias

saude_base.pacientes (1)
  └── (N) saude_tfd.solicitacoes

public.processos (1)
  └── (1) saude_tfd.solicitacoes
        ├── (N) saude_tfd.acompanhantes
        ├── (N) saude_tfd.viagens
        │     ├── (N) saude_tfd.itens_despesa
        │     └── (1) saude_tfd.prestacoes_conta
        └── (1) saude_tfd.reservas_saldo → saude_tfd.saldos
              └── (N) saude_tfd.movimentacoes_saldo
```

---

## 6. Configuração do Prisma

```prisma
// packages/core-db/prisma/schema.prisma

generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["multiSchema"]
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  schemas  = [
    "public",
    "saude_base",
    "saude_tfd"
    // novos schemas adicionados aqui conforme MUNICIPAL_MAP.md
  ]
}
```

---

## 7. Regras de Migração

### 7.1 Adicionar coluna — sempre com default ou nullable
```sql
-- CORRETO
ALTER TABLE saude_tfd.solicitacoes ADD COLUMN observacoes TEXT;          -- nullable ok
ALTER TABLE saude_tfd.veiculos ADD COLUMN cor VARCHAR(50) DEFAULT 'N/A'; -- default ok

-- ERRADO — quebra com dados existentes
ALTER TABLE saude_tfd.solicitacoes ADD COLUMN campo VARCHAR NOT NULL; -- QUEBRA
```

### 7.2 Remover coluna — processo em 3 releases
```
Release 1: parar de usar a coluna no código (deprecar)
Release 2: remover do código completamente
Release 3: migration para remover do banco
```

### 7.3 Naming de migrations
```
YYYYMMDDHHMMSS_descricao_clara

Exemplos:
  20250101000001_create_public_core_tables
  20250101000002_create_saude_base_schema
  20250101000003_create_saude_tfd_config_tables
  20250101000004_create_saude_tfd_saldos_tables
  20250101000005_create_saude_tfd_solicitacoes_tables
  20250101000006_create_saude_tfd_viagens_tables
```

### 7.4 Checklist antes de executar migration em produção
- [ ] Migration testada em desenvolvimento?
- [ ] Novas colunas NOT NULL têm default?
- [ ] RLS habilitado em todas as novas tabelas de negócio?
- [ ] Índice criado para `tenant_id` em todas as novas tabelas?
- [ ] FK para `public.tenants` tem `ON DELETE CASCADE`?
- [ ] `prisma generate` executado após a migration?

---

## 8. Documentos Relacionados

- `MUNICIPAL_MAP.md` — siglas e convenções de nomenclatura de schemas
- `MULTI_TENANT.md` — configuração do RLS e `getPrismaForTenant`
- `BUSINESS_RULES.md` — regras que definem os fluxos e status
- `AUTH_PERMISSIONS.md` — permissões que controlam acesso aos dados
- `SECURITY.md` — LGPD e proteção de dados sensíveis de saúde
