-- Sprint 4.3 — nova entidade viagem (viagens_legado + viagens + viagem_passageiros)

ALTER TYPE "public"."tramitacao_tipo" ADD VALUE IF NOT EXISTS 'VIAGEM_CRIADA';
ALTER TYPE "public"."tramitacao_tipo" ADD VALUE IF NOT EXISTS 'VIAGEM_STATUS_ALTERADO';
ALTER TYPE "public"."tramitacao_tipo" ADD VALUE IF NOT EXISTS 'VIAGEM_CONCLUIDA';
ALTER TYPE "public"."tramitacao_tipo" ADD VALUE IF NOT EXISTS 'VIAGEM_CANCELADA';

CREATE TYPE saude_tfd.tfd_viagem_status_v2 AS ENUM (
  'PLANEJADA',
  'CONFIRMADA',
  'EM_ANDAMENTO',
  'CONCLUIDA',
  'CANCELADA'
);

ALTER TABLE saude_tfd.viagens RENAME TO viagens_legado;

CREATE TABLE saude_tfd.viagens (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  protocolo          VARCHAR(50) NOT NULL,
  processo_id        UUID NOT NULL REFERENCES public.processos(id) ON DELETE CASCADE,
  veiculo_id         UUID REFERENCES saude_tfd.veiculos(id) ON DELETE SET NULL,
  motorista_id       UUID REFERENCES saude_tfd.motoristas(id) ON DELETE SET NULL,
  data_saida         DATE NOT NULL,
  hora_saida         TIME,
  data_chegada       DATE,
  hora_chegada       TIME,
  km_saida           INT,
  km_chegada         INT,
  origem_descricao   VARCHAR(300) NOT NULL,
  destino_descricao  VARCHAR(300) NOT NULL,
  tempo_estimado_min INT,
  custo_estimado     DECIMAL(10, 2),
  custo_real         DECIMAL(10, 2),
  status             saude_tfd.tfd_viagem_status_v2 NOT NULL DEFAULT 'PLANEJADA',
  observacoes        TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_tfd_viagem_nova_protocolo UNIQUE (tenant_id, protocolo)
);

CREATE INDEX idx_tfd_viagens_nova_tenant ON saude_tfd.viagens(tenant_id);
CREATE INDEX idx_tfd_viagens_nova_processo ON saude_tfd.viagens(processo_id);
CREATE INDEX idx_tfd_viagens_nova_motorista ON saude_tfd.viagens(motorista_id);
CREATE INDEX idx_tfd_viagens_nova_veiculo ON saude_tfd.viagens(veiculo_id);
CREATE INDEX idx_tfd_viagens_nova_status ON saude_tfd.viagens(status);
CREATE INDEX idx_tfd_viagens_nova_data_saida ON saude_tfd.viagens(data_saida);

ALTER TABLE saude_tfd.viagens ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON saude_tfd.viagens
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE TABLE saude_tfd.viagem_passageiros (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  viagem_id           UUID NOT NULL REFERENCES saude_tfd.viagens(id) ON DELETE CASCADE,
  agendamento_id      UUID NOT NULL REFERENCES saude_tfd.agendamentos(id) ON DELETE CASCADE,
  tipo_trecho         saude_tfd.tfd_tipo_viagem NOT NULL,
  acompanhantes_count INT NOT NULL DEFAULT 0,
  status_presenca     VARCHAR(20) NOT NULL DEFAULT 'PENDENTE',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_tfd_viagem_passageiro_trecho UNIQUE (viagem_id, agendamento_id, tipo_trecho)
);

CREATE INDEX idx_tfd_viagem_passageiros_tenant ON saude_tfd.viagem_passageiros(tenant_id);
CREATE INDEX idx_tfd_viagem_passageiros_viagem ON saude_tfd.viagem_passageiros(viagem_id);
CREATE INDEX idx_tfd_viagem_passageiros_agendamento ON saude_tfd.viagem_passageiros(agendamento_id);

ALTER TABLE saude_tfd.viagem_passageiros ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON saude_tfd.viagem_passageiros
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
