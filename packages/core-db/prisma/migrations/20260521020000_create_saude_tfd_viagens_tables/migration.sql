-- Migration: create_saude_tfd_viagens_tables
-- Sprint 1.1 — Viagens, itens de despesa e prestação de contas TFD

CREATE TYPE saude_tfd.viagem_status AS ENUM (
  'AGENDADA',
  'REALIZADA',
  'CANCELADA'
);

CREATE TABLE saude_tfd.viagens (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  solicitacao_id        UUID NOT NULL REFERENCES saude_tfd.solicitacoes(id) ON DELETE CASCADE,
  sequencia             INTEGER NOT NULL DEFAULT 1,
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

CREATE INDEX idx_tfd_viagens_tenant      ON saude_tfd.viagens(tenant_id);
CREATE INDEX idx_tfd_viagens_solicitacao ON saude_tfd.viagens(solicitacao_id);
CREATE INDEX idx_tfd_viagens_data        ON saude_tfd.viagens(tenant_id, data_viagem);
CREATE INDEX idx_tfd_viagens_motorista   ON saude_tfd.viagens(motorista_id);
CREATE INDEX idx_tfd_viagens_status      ON saude_tfd.viagens(tenant_id, status);

ALTER TABLE saude_tfd.viagens ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON saude_tfd.viagens
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE TYPE saude_tfd.tipo_despesa AS ENUM (
  'TRANSPORTE',
  'ALIMENTACAO',
  'HOSPEDAGEM',
  'OUTRO'
);

CREATE TYPE saude_tfd.responsavel_pagamento AS ENUM (
  'MUNICIPIO',
  'PACIENTE_REEMBOLSO'
);

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

CREATE INDEX idx_tfd_itens_despesa_tenant ON saude_tfd.itens_despesa(tenant_id);
CREATE INDEX idx_tfd_despesas_viagem     ON saude_tfd.itens_despesa(viagem_id);

ALTER TABLE saude_tfd.itens_despesa ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON saude_tfd.itens_despesa
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE TYPE saude_tfd.prestacao_status AS ENUM (
  'PENDENTE',
  'ENVIADA',
  'APROVADA',
  'REJEITADA'
);

CREATE TABLE saude_tfd.prestacoes_conta (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  viagem_id           UUID NOT NULL REFERENCES saude_tfd.viagens(id) ON DELETE CASCADE,
  saldo_id            UUID REFERENCES saude_tfd.saldos(id) ON DELETE SET NULL,
  status              saude_tfd.prestacao_status NOT NULL DEFAULT 'PENDENTE',
  comprovantes_vistos JSONB NOT NULL DEFAULT '[]',
  aprovado_por_id     UUID REFERENCES public.users(id) ON DELETE SET NULL,
  aprovado_at         TIMESTAMPTZ,
  observacoes_gestor  TEXT,
  prazo_envio_at      TIMESTAMPTZ NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_prestacao_viagem UNIQUE (tenant_id, viagem_id)
);

CREATE INDEX idx_tfd_prestacoes_conta_tenant ON saude_tfd.prestacoes_conta(tenant_id);
CREATE INDEX idx_tfd_prestacoes_viagem     ON saude_tfd.prestacoes_conta(viagem_id);
CREATE INDEX idx_tfd_prestacoes_status     ON saude_tfd.prestacoes_conta(tenant_id, status);
CREATE INDEX idx_tfd_prestacoes_prazo      ON saude_tfd.prestacoes_conta(prazo_envio_at)
  WHERE status = 'PENDENTE';

ALTER TABLE saude_tfd.prestacoes_conta ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON saude_tfd.prestacoes_conta
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);
