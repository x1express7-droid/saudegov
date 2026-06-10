-- Composição de custos na solicitação TFD (tipos de despesa alinhados à viagem)

ALTER TABLE saude_tfd.solicitacao_custos_planejados
  ADD COLUMN tipo saude_tfd.tipo_despesa,
  ADD COLUMN quantidade_dias INTEGER;

ALTER TABLE saude_tfd.solicitacao_custos_planejados
  ALTER COLUMN descricao DROP NOT NULL;
