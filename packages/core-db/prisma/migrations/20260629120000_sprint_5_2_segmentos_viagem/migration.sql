-- Sprint 5.2: segmentos de deslocamento vinculados à viagem TFD

ALTER TABLE saude_tfd.transportes
  ALTER COLUMN agendamento_id DROP NOT NULL;

ALTER TABLE saude_tfd.transportes
  ADD COLUMN IF NOT EXISTS viagem_id UUID
  REFERENCES saude_tfd.viagens(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_tfd_transportes_viagem
  ON saude_tfd.transportes(viagem_id);
