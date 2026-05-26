-- Migration: sprint_2_3_tfd_operational_rules
-- Sprint 2.3 — vedações Portaria 55, estorno (FK origem), job EM_VIAGEM (idempotência)

-- Procedimento: flag PAB (§1.5 — vedação na aprovação)
ALTER TABLE saude_tfd.procedimentos
  ADD COLUMN eh_pab BOOLEAN NOT NULL DEFAULT false;

-- Solicitação: vedações registradas na decisão de aprovação (§1.5)
ALTER TABLE saude_tfd.solicitacoes
  ADD COLUMN distancia_km DECIMAL(8, 2),
  ADD COLUMN tratamento_experimental BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN regiao_metropolitana BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN paciente_hospitalizado_destino BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN vedacoes_confirmadas_por_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN vedacoes_confirmadas_at TIMESTAMPTZ;

-- Extrato: rastreio do lançamento estornado — imutabilidade via novo registro ESTORNO (§1.8)
ALTER TABLE saude_tfd.movimentacoes_saldo
  ADD COLUMN movimentacao_origem_id UUID REFERENCES saude_tfd.movimentacoes_saldo(id) ON DELETE RESTRICT;

CREATE INDEX idx_tfd_movimentacoes_origem
  ON saude_tfd.movimentacoes_saldo(movimentacao_origem_id)
  WHERE movimentacao_origem_id IS NOT NULL;

-- Viagem: idempotência do job AGENDADO → EM_VIAGEM (§1.10)
ALTER TABLE saude_tfd.viagens
  ADD COLUMN em_viagem_transicionado_at TIMESTAMPTZ;

CREATE INDEX idx_tfd_viagens_em_viagem_pendente
  ON saude_tfd.viagens(tenant_id, data_viagem)
  WHERE em_viagem_transicionado_at IS NULL AND status = 'AGENDADA';
