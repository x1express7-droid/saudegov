-- Migration: create_saude_tfd_saldos_tables
-- Sprint 1.1 — Saldos financeiros TFD (saldos, reservas_saldo, movimentacoes_saldo)

CREATE TYPE saude_tfd.fonte_recurso AS ENUM (
  'FEDERAL_FNS',
  'ESTADUAL',
  'MUNICIPAL_PROPRIO',
  'EMENDA_PARLAMENTAR'
);

CREATE TYPE saude_tfd.reserva_status AS ENUM ('ATIVA', 'CONSUMIDA', 'LIBERADA');

CREATE TYPE saude_tfd.movimentacao_tipo AS ENUM (
  'CREDITO',
  'RESERVA',
  'CONSUMO',
  'LIBERACAO',
  'ESTORNO'
);

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

CREATE INDEX idx_tfd_saldos_tenant ON saude_tfd.saldos(tenant_id);

ALTER TABLE saude_tfd.saldos ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON saude_tfd.saldos
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE TABLE saude_tfd.reservas_saldo (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  saldo_id        UUID NOT NULL REFERENCES saude_tfd.saldos(id),
  solicitacao_id  UUID,
  valor_estimado  DECIMAL(12,2) NOT NULL,
  status          saude_tfd.reserva_status NOT NULL DEFAULT 'ATIVA',
  consumido_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tfd_reservas_saldo_tenant ON saude_tfd.reservas_saldo(tenant_id);

ALTER TABLE saude_tfd.reservas_saldo ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON saude_tfd.reservas_saldo
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);

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
);

CREATE INDEX idx_tfd_movimentacoes_saldo_tenant ON saude_tfd.movimentacoes_saldo(tenant_id);

ALTER TABLE saude_tfd.movimentacoes_saldo ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON saude_tfd.movimentacoes_saldo
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);
