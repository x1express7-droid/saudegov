-- REMOVE-PROCESSO-PARTE-1: processo_id opcional em saude_tfd.viagens (FK e índice preservados)

ALTER TABLE saude_tfd.viagens
  ALTER COLUMN processo_id DROP NOT NULL;
