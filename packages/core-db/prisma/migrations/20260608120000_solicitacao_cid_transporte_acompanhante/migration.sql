-- Migration: solicitacao_cid_transporte_acompanhante
-- Catálogo CID, tipo de transporte recomendado na solicitação e vínculo de acompanhante a paciente

CREATE TYPE saude_tfd.tipo_transporte_recomendado AS ENUM (
  'TERRESTRE_ONIBUS_LINHA',
  'TERRESTRE_CARRO_OFICIAL',
  'AMBULANCIA',
  'AEREO'
);

ALTER TABLE saude_tfd.solicitacoes
  ADD COLUMN tipo_transporte_recomendado saude_tfd.tipo_transporte_recomendado;

CREATE TABLE saude_tfd.cids (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  codigo      VARCHAR(10) NOT NULL,
  descricao   VARCHAR(500) NOT NULL,
  ativo       BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_tfd_cid_tenant_codigo UNIQUE (tenant_id, codigo)
);

CREATE INDEX idx_tfd_cids_tenant ON saude_tfd.cids(tenant_id);

ALTER TABLE saude_tfd.cids ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON saude_tfd.cids
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

ALTER TABLE saude_tfd.acompanhantes
  ADD COLUMN paciente_id UUID REFERENCES saude_base.pacientes(id) ON DELETE SET NULL;

CREATE INDEX idx_tfd_acomp_paciente ON saude_tfd.acompanhantes(paciente_id);
