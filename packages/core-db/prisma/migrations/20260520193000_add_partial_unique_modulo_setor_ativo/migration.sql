-- Um setor responsável ativo por módulo por tenant (regra estrutural).
-- Linhas com ativo = false (histórico) não entram no índice; uq_modulo_setor no trio permanece.
CREATE UNIQUE INDEX uq_modulo_setor_ativo
ON public.modulo_setor_responsavel (tenant_id, modulo)
WHERE ativo = true;
