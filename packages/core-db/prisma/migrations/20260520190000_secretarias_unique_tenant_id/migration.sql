-- Uma Secretaria Municipal de Saúde por município (tenant)
-- Remove duplicatas mantendo o registro mais antigo por tenant_id
DELETE FROM public.secretarias s
USING public.secretarias s2
WHERE s.tenant_id = s2.tenant_id
  AND s.created_at > s2.created_at;

CREATE UNIQUE INDEX IF NOT EXISTS "secretarias_tenant_id_key" ON "public"."secretarias"("tenant_id");
