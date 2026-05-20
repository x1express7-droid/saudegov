-- Migration: create_saude_base_pacientes_unidades
-- Sprint 0.2 — Schema Base do Banco

CREATE SCHEMA IF NOT EXISTS saude_base;

CREATE TYPE saude_base.sexo AS ENUM ('MASCULINO', 'FEMININO', 'NAO_INFORMADO');

CREATE TABLE saude_base.pacientes (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id               UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id                 UUID REFERENCES public.users(id) ON DELETE SET NULL,
  nome                    VARCHAR(200) NOT NULL,
  cpf                     VARCHAR(11),
  cns                     VARCHAR(15),
  data_nascimento         DATE,
  sexo                    saude_base.sexo,
  nome_mae                VARCHAR(200),
  municipio_nascimento    VARCHAR(200),
  cep                     VARCHAR(8),
  logradouro              VARCHAR(300),
  numero                  VARCHAR(20),
  complemento             VARCHAR(100),
  bairro                  VARCHAR(100),
  municipio               VARCHAR(200),
  uf                      CHAR(2),
  telefone                VARCHAR(20),
  telefone_alternativo    VARCHAR(20),
  cadsus_sincronizado_at  TIMESTAMPTZ,
  cadsus_divergencia      BOOLEAN NOT NULL DEFAULT false,
  ativo                   BOOLEAN NOT NULL DEFAULT true,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_paciente_tenant_cpf UNIQUE (tenant_id, cpf),
  CONSTRAINT uq_paciente_tenant_cns UNIQUE (tenant_id, cns)
);

CREATE INDEX idx_base_pacientes_tenant ON saude_base.pacientes(tenant_id);
CREATE INDEX idx_base_pacientes_cpf   ON saude_base.pacientes(tenant_id, cpf);
CREATE INDEX idx_base_pacientes_cns   ON saude_base.pacientes(tenant_id, cns);
CREATE INDEX idx_base_pacientes_nome  ON saude_base.pacientes(tenant_id, nome);

ALTER TABLE saude_base.pacientes ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON saude_base.pacientes
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE TYPE saude_base.tipo_unidade AS ENUM (
  'UBS', 'USF', 'UPA', 'HOSPITAL', 'CLINICA', 'CAPS', 'OUTRO'
);

CREATE TABLE saude_base.unidades (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  nome        VARCHAR(200) NOT NULL,
  tipo        saude_base.tipo_unidade NOT NULL,
  cnes        VARCHAR(7),
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
