-- Migration: sprint_4_5_prestacao_nova_viagem
-- Sprint 4.5 — prestação de contas vinculada à nova tabela saude_tfd.viagens

ALTER TABLE saude_tfd.prestacoes_conta
  ADD COLUMN IF NOT EXISTS viagem_nova_id UUID
  REFERENCES saude_tfd.viagens(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tfd_prestacoes_viagem_nova
  ON saude_tfd.prestacoes_conta(viagem_nova_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_tfd_prestacao_viagem_nova
  ON saude_tfd.prestacoes_conta(viagem_nova_id)
  WHERE viagem_nova_id IS NOT NULL;

ALTER TABLE saude_tfd.itens_despesa
  ADD COLUMN IF NOT EXISTS viagem_nova_id UUID
  REFERENCES saude_tfd.viagens(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tfd_despesas_viagem_nova
  ON saude_tfd.itens_despesa(viagem_nova_id);

ALTER TYPE public.tramitacao_tipo ADD VALUE IF NOT EXISTS 'PRESTACAO_CRIADA';
