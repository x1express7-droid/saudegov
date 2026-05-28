-- Limpa campos SOAP gravados incorretamente com texto placeholder "Não preenchido".
UPDATE saude_tfd.processo_dados_clinicos
SET
  subjetivo = NULL,
  objetivo = NULL,
  avaliacao = NULL,
  plano = NULL,
  motivo_quadro = NULL,
  observacao = NULL,
  updated_at = NOW()
WHERE
  subjetivo ILIKE '%Não preenchid%'
  OR objetivo ILIKE '%Não preenchid%'
  OR avaliacao ILIKE '%Não preenchid%'
  OR plano ILIKE '%Não preenchid%'
  OR motivo_quadro ILIKE '%Não preenchid%'
  OR observacao ILIKE '%Não preenchid%';
