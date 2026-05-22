-- Migration: add_tfd_viagens_lembrete_48h_columns
-- Sprint 1.6 — controle de idempotência do job de lembrete 48h antes da viagem

ALTER TABLE saude_tfd.viagens
  ADD COLUMN lembrete_48h_enviado_at TIMESTAMPTZ,
  ADD COLUMN lembrete_48h_falhou_at TIMESTAMPTZ;
