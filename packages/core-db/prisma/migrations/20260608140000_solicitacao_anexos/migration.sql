-- Vínculo N:N entre solicitações TFD e anexos (documentos por solicitação)

CREATE TABLE saude_tfd.solicitacao_anexos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  solicitacao_id  UUID NOT NULL REFERENCES saude_tfd.solicitacoes(id) ON DELETE CASCADE,
  anexo_id        UUID NOT NULL REFERENCES public.anexos(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_tfd_solicitacao_anexo UNIQUE (solicitacao_id, anexo_id)
);

CREATE INDEX idx_tfd_solicitacao_anexos_tenant ON saude_tfd.solicitacao_anexos(tenant_id);
CREATE INDEX idx_tfd_solicitacao_anexos_solicitacao ON saude_tfd.solicitacao_anexos(solicitacao_id);
CREATE INDEX idx_tfd_solicitacao_anexos_anexo ON saude_tfd.solicitacao_anexos(anexo_id);

-- Backfill: laudo principal já vinculado à solicitação
INSERT INTO saude_tfd.solicitacao_anexos (tenant_id, solicitacao_id, anexo_id)
SELECT s.tenant_id, s.id, s.laudo_anexo_id
FROM saude_tfd.solicitacoes s
WHERE s.laudo_anexo_id IS NOT NULL
ON CONFLICT (solicitacao_id, anexo_id) DO NOTHING;
