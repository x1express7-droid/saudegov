-- AlterEnum
-- Adiciona o valor "NAO_AGUDA" como menor prioridade clínica, antes de "BAIXA".
ALTER TYPE "saude_tfd"."urgencia" ADD VALUE IF NOT EXISTS 'NAO_AGUDA' BEFORE 'BAIXA';
