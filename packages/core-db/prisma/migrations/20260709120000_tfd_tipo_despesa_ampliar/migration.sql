-- PC-PARTE-2: ampliar enum tipo_despesa conforme Portaria SAS/MS nº 55/1999
ALTER TYPE saude_tfd.tipo_despesa
  ADD VALUE IF NOT EXISTS 'TRANSPORTE_TERRESTRE';
ALTER TYPE saude_tfd.tipo_despesa
  ADD VALUE IF NOT EXISTS 'TRANSPORTE_AEREO';
ALTER TYPE saude_tfd.tipo_despesa
  ADD VALUE IF NOT EXISTS 'TRANSPORTE_FLUVIAL';
ALTER TYPE saude_tfd.tipo_despesa
  ADD VALUE IF NOT EXISTS 'DIARIA_PACIENTE';
ALTER TYPE saude_tfd.tipo_despesa
  ADD VALUE IF NOT EXISTS 'DIARIA_ACOMPANHANTE';
ALTER TYPE saude_tfd.tipo_despesa
  ADD VALUE IF NOT EXISTS 'OBITO';
ALTER TYPE saude_tfd.tipo_despesa
  ADD VALUE IF NOT EXISTS 'DEVOLUCAO';
