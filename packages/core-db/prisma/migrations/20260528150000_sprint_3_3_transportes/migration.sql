-- Sprint 3.3 — transportes com múltiplos segmentos por agendamento

CREATE TYPE saude_tfd.tipo_segmento_transporte AS ENUM (
  'TERRESTRE_PROPRIO',
  'TERRESTRE_TERCEIRO',
  'AEREO',
  'FLUVIAL',
  'OUTRO'
);

CREATE TYPE saude_tfd.transporte_status AS ENUM (
  'PENDENTE',
  'CONFIRMADO',
  'EM_TRANSITO',
  'CONCLUIDO',
  'CANCELADO'
);

CREATE TABLE saude_tfd.transportes (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  agendamento_id        UUID NOT NULL REFERENCES saude_tfd.agendamentos(id) ON DELETE CASCADE,
  sequencia             INT NOT NULL DEFAULT 1,
  tipo_segmento         saude_tfd.tipo_segmento_transporte NOT NULL,
  veiculo_id            UUID REFERENCES saude_tfd.veiculos(id) ON DELETE SET NULL,
  motorista_id          UUID REFERENCES saude_tfd.motoristas(id) ON DELETE SET NULL,
  km_saida              INT,
  km_chegada            INT,
  origem_descricao      VARCHAR(300) NOT NULL,
  destino_descricao     VARCHAR(300) NOT NULL,
  data_saida            DATE NOT NULL,
  hora_saida            TIME,
  data_chegada          DATE,
  hora_chegada          TIME,
  custo_estimado        DECIMAL(10, 2),
  custo_real            DECIMAL(10, 2),
  responsavel_pagamento saude_tfd.responsavel_pagamento NOT NULL DEFAULT 'MUNICIPIO',
  status                saude_tfd.transporte_status NOT NULL DEFAULT 'PENDENTE',
  observacoes           TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tfd_transportes_tenant
  ON saude_tfd.transportes(tenant_id);

CREATE INDEX idx_tfd_transportes_agendamento
  ON saude_tfd.transportes(tenant_id, agendamento_id);

CREATE INDEX idx_tfd_transportes_status
  ON saude_tfd.transportes(tenant_id, status);

CREATE INDEX idx_tfd_transportes_data_saida
  ON saude_tfd.transportes(tenant_id, data_saida);

CREATE INDEX idx_tfd_transportes_motorista
  ON saude_tfd.transportes(motorista_id);

ALTER TABLE saude_tfd.transportes ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON saude_tfd.transportes
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE TABLE saude_tfd.transporte_anexos (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  transporte_id  UUID NOT NULL REFERENCES saude_tfd.transportes(id) ON DELETE CASCADE,
  anexo_id       UUID REFERENCES public.anexos(id) ON DELETE SET NULL,
  tipo_anexo     VARCHAR(50) NOT NULL DEFAULT 'OUTRO',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tfd_transporte_anexos_tenant
  ON saude_tfd.transporte_anexos(tenant_id);

CREATE INDEX idx_tfd_transporte_anexos_transporte
  ON saude_tfd.transporte_anexos(tenant_id, transporte_id);

ALTER TABLE saude_tfd.transporte_anexos ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON saude_tfd.transporte_anexos
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

ALTER TABLE saude_tfd.itens_despesa
  ADD COLUMN transporte_id UUID REFERENCES saude_tfd.transportes(id) ON DELETE SET NULL;

CREATE INDEX idx_tfd_itens_despesa_transporte
  ON saude_tfd.itens_despesa(transporte_id);
