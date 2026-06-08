-- Projeção financeira por solicitação TFD (itens de custo planejado)

CREATE TABLE saude_tfd.solicitacao_custos_planejados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  solicitacao_id UUID NOT NULL REFERENCES saude_tfd.solicitacoes(id) ON DELETE CASCADE,
  descricao TEXT NOT NULL,
  valor DECIMAL(12, 2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tfd_sol_custos_planejados_tenant
  ON saude_tfd.solicitacao_custos_planejados(tenant_id);

CREATE INDEX idx_tfd_sol_custos_planejados_solicitacao
  ON saude_tfd.solicitacao_custos_planejados(solicitacao_id);

ALTER TABLE saude_tfd.solicitacao_custos_planejados ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON saude_tfd.solicitacao_custos_planejados
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
