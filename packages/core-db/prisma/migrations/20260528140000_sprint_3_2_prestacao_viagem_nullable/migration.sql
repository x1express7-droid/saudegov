-- Sprint 3.2 — prestação híbrida: viagem_id opcional quando agendamento_id está preenchido

ALTER TABLE saude_tfd.prestacoes_conta
  ALTER COLUMN viagem_id DROP NOT NULL;
