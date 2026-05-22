-- Migration: add_tfd_prestacoes_lembrete_48h_columns
-- Sprint 1.7 — controle de idempotência do job de lembrete 48h antes do prazo da prestação

ALTER TABLE saude_tfd.prestacoes_conta
  ADD COLUMN lembrete_48h_enviado_at TIMESTAMPTZ,
  ADD COLUMN lembrete_48h_falhou_at TIMESTAMPTZ;
