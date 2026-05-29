-- Sprint 4.2 — agendamento ampliado (convênio, tipo viagem, locais e acompanhantes múltiplos)

CREATE TYPE saude_tfd.tfd_tipo_viagem AS ENUM (
  'IDA',
  'VOLTA',
  'IDA_VOLTA'
);

CREATE TYPE saude_tfd.tfd_convenio AS ENUM (
  'SUS',
  'PARTICULAR'
);

ALTER TABLE saude_tfd.agendamentos
  ADD COLUMN tipo_viagem saude_tfd.tfd_tipo_viagem,
  ADD COLUMN convenio saude_tfd.tfd_convenio DEFAULT 'SUS';

CREATE TABLE saude_tfd.agendamento_locais (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  agendamento_id   UUID NOT NULL REFERENCES saude_tfd.agendamentos(id) ON DELETE CASCADE,
  ordem            INT NOT NULL DEFAULT 1,
  prestador_id     UUID REFERENCES saude_tfd.prestadores(id) ON DELETE SET NULL,
  procedimento_id  UUID REFERENCES saude_tfd.procedimentos(id) ON DELETE SET NULL,
  horario          TIME,
  observacao       TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tfd_agendamento_locais_tenant
  ON saude_tfd.agendamento_locais(tenant_id);

CREATE INDEX idx_tfd_agendamento_locais_agendamento
  ON saude_tfd.agendamento_locais(tenant_id, agendamento_id);

ALTER TABLE saude_tfd.agendamento_locais ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON saude_tfd.agendamento_locais
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE TABLE saude_tfd.agendamento_acompanhantes (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  agendamento_id   UUID NOT NULL REFERENCES saude_tfd.agendamentos(id) ON DELETE CASCADE,
  acompanhante_id  UUID NOT NULL REFERENCES saude_tfd.acompanhantes(id) ON DELETE CASCADE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_tfd_agendamento_acompanhante UNIQUE (agendamento_id, acompanhante_id)
);

CREATE INDEX idx_tfd_agendamento_acomp_tenant
  ON saude_tfd.agendamento_acompanhantes(tenant_id);

CREATE INDEX idx_tfd_agendamento_acomp_agendamento
  ON saude_tfd.agendamento_acompanhantes(tenant_id, agendamento_id);

ALTER TABLE saude_tfd.agendamento_acompanhantes ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON saude_tfd.agendamento_acompanhantes
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
