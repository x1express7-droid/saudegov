-- Sprint 5.3: PC unificada na viagem nova — referência em itens_despesa
-- Nota: viagem_id referencia viagens_legado (histórico).
--       viagem_nova_id referencia saude_tfd.viagens (modelo canônico Fase 4/5).

ALTER TABLE saude_tfd.itens_despesa
  ADD COLUMN IF NOT EXISTS viagem_nova_id UUID
  REFERENCES saude_tfd.viagens(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tfd_despesas_viagem_nova
  ON saude_tfd.itens_despesa(viagem_nova_id);
