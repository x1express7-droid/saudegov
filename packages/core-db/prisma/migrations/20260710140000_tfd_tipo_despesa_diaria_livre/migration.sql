-- Diária com valor informado manualmente (composição de custos)

ALTER TYPE saude_tfd.tipo_despesa ADD VALUE IF NOT EXISTS 'DIARIA_LIVRE';
