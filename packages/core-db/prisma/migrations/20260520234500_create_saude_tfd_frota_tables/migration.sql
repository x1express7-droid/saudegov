-- Migration: create_saude_tfd_frota_tables
-- Sprint 1.1 — Frota TFD (veículos, motoristas) + RLS WITH CHECK nas tabelas de config

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

CREATE INDEX idx_tfd_veiculos_tenant ON saude_tfd.veiculos(tenant_id);

ALTER TABLE saude_tfd.veiculos ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON saude_tfd.veiculos
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);

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

CREATE INDEX idx_tfd_motoristas_tenant ON saude_tfd.motoristas(tenant_id);

ALTER TABLE saude_tfd.motoristas ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON saude_tfd.motoristas
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- Corrige policies da migration create_saude_tfd_config_tables (USING + WITH CHECK)
DROP POLICY tenant_isolation ON saude_tfd.especialidades;
CREATE POLICY tenant_isolation ON saude_tfd.especialidades
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);

DROP POLICY tenant_isolation ON saude_tfd.procedimentos;
CREATE POLICY tenant_isolation ON saude_tfd.procedimentos
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);

DROP POLICY tenant_isolation ON saude_tfd.prestadores;
CREATE POLICY tenant_isolation ON saude_tfd.prestadores
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);
