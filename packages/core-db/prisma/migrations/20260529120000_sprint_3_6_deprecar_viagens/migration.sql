-- Sprint 3.6: marca tabela legada de viagens como deprecated (sem remover dados).
ALTER TABLE saude_tfd.viagens ADD COLUMN IF NOT EXISTS deprecated_at TIMESTAMPTZ;
