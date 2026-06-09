-- REMOVE-PROCESSO-PARTE-4: índice por processo_id não é mais usado como filtro de listagem
DROP INDEX IF EXISTS saude_tfd.idx_tfd_viagens_nova_processo;
