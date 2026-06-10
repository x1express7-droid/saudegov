-- PC-PARTE-3: adiantamento entregue ao paciente antes da viagem
ALTER TABLE saude_tfd.prestacoes_conta
  ADD COLUMN IF NOT EXISTS valor_adiantamento DECIMAL(12, 2) NULL;
