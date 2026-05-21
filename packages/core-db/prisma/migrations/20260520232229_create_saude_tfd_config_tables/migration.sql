-- Migration: create_saude_tfd_config_tables
-- Sprint 1.1 — Tabelas de configuração do módulo TFD (especialidades, procedimentos, prestadores)

CREATE SCHEMA IF NOT EXISTS saude_tfd;

CREATE TABLE saude_tfd.especialidades (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  nome        VARCHAR(200) NOT NULL,
  ativa       BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tfd_especialidades_tenant ON saude_tfd.especialidades(tenant_id);

ALTER TABLE saude_tfd.especialidades ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON saude_tfd.especialidades
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE TABLE saude_tfd.procedimentos (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  especialidade_id UUID NOT NULL REFERENCES saude_tfd.especialidades(id) ON DELETE CASCADE,
  nome             VARCHAR(200) NOT NULL,
  codigo_sigtap    VARCHAR(20),
  ativo            BOOLEAN NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tfd_procedimentos_tenant ON saude_tfd.procedimentos(tenant_id);

ALTER TABLE saude_tfd.procedimentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON saude_tfd.procedimentos
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE TABLE saude_tfd.prestadores (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  nome           VARCHAR(200) NOT NULL,
  cnpj           VARCHAR(14),
  cnes           VARCHAR(7),
  cidade         VARCHAR(200) NOT NULL,
  estado         CHAR(2) NOT NULL,
  telefone       VARCHAR(20),
  especialidades JSONB NOT NULL DEFAULT '[]',
  ativo          BOOLEAN NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tfd_prestadores_tenant ON saude_tfd.prestadores(tenant_id);

ALTER TABLE saude_tfd.prestadores ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON saude_tfd.prestadores
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
