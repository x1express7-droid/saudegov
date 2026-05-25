-- Observações registradas pelo atendente na abertura da solicitação TFD

ALTER TABLE saude_tfd.solicitacoes
  ADD COLUMN IF NOT EXISTS observacoes_abertura TEXT;
