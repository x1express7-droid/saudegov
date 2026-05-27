-- Sprint 3.4 — prestação unificada por agendamento (dados + suporte a despesas sem viagem legada)

UPDATE saude_tfd.prestacoes_conta
SET agendamento_id = viagem_id
WHERE viagem_id IS NOT NULL AND agendamento_id IS NULL;

ALTER TABLE saude_tfd.itens_despesa
  ALTER COLUMN viagem_id DROP NOT NULL;

ALTER TABLE saude_tfd.itens_despesa
  ADD COLUMN agendamento_id UUID REFERENCES saude_tfd.agendamentos(id) ON DELETE SET NULL;

CREATE INDEX idx_tfd_itens_despesa_agendamento
  ON saude_tfd.itens_despesa(agendamento_id);
