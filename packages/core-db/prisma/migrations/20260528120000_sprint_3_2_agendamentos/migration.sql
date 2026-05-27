-- Sprint 3.2 — entidade agendamentos (consulta) + vínculo em prestações de contas

CREATE TYPE saude_tfd.agendamento_status AS ENUM (
  'AGENDADO',
  'EM_VIAGEM',
  'REALIZADO',
  'CANCELADO'
);

CREATE TABLE saude_tfd.agendamentos (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  processo_id          UUID NOT NULL REFERENCES public.processos(id) ON DELETE CASCADE,
  solicitacao_id       UUID NOT NULL REFERENCES saude_tfd.solicitacoes(id) ON DELETE CASCADE,
  sequencia            INT NOT NULL DEFAULT 1,
  data_consulta        DATE NOT NULL,
  hora_consulta        TIME,
  prestador_id         UUID REFERENCES saude_tfd.prestadores(id) ON DELETE SET NULL,
  profissional_nome  VARCHAR(200),
  tipo_atendimento     saude_tfd.tipo_atendimento NOT NULL,
  acompanhante_id      UUID REFERENCES saude_tfd.acompanhantes(id) ON DELETE SET NULL,
  orientacoes          TEXT,
  status               saude_tfd.agendamento_status NOT NULL DEFAULT 'AGENDADO',
  realizado_at         TIMESTAMPTZ,
  cancelado_at         TIMESTAMPTZ,
  motivo_cancelamento  TEXT,
  cancelado_por_id     UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tfd_agendamentos_tenant
  ON saude_tfd.agendamentos(tenant_id);

CREATE INDEX idx_tfd_agendamentos_processo
  ON saude_tfd.agendamentos(tenant_id, processo_id);

CREATE INDEX idx_tfd_agendamentos_solicitacao
  ON saude_tfd.agendamentos(tenant_id, solicitacao_id);

CREATE INDEX idx_tfd_agendamentos_status
  ON saude_tfd.agendamentos(tenant_id, status);

CREATE INDEX idx_tfd_agendamentos_data_consulta
  ON saude_tfd.agendamentos(tenant_id, data_consulta);

ALTER TABLE saude_tfd.agendamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON saude_tfd.agendamentos
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

ALTER TABLE saude_tfd.prestacoes_conta
  ADD COLUMN agendamento_id UUID REFERENCES saude_tfd.agendamentos(id) ON DELETE SET NULL;

CREATE INDEX idx_tfd_prestacoes_agendamento
  ON saude_tfd.prestacoes_conta(agendamento_id);

-- Migração 1:1 viagens existentes → agendamentos (mesmo id da viagem para rastreabilidade)
INSERT INTO saude_tfd.agendamentos (
  id,
  tenant_id,
  processo_id,
  solicitacao_id,
  sequencia,
  data_consulta,
  hora_consulta,
  prestador_id,
  profissional_nome,
  tipo_atendimento,
  acompanhante_id,
  orientacoes,
  status,
  realizado_at,
  cancelado_at,
  motivo_cancelamento,
  created_at,
  updated_at
)
SELECT
  v.id,
  v.tenant_id,
  s.processo_id,
  v.solicitacao_id,
  v.sequencia,
  v.data_viagem,
  v.hora_saida,
  s.prestador_id,
  NULL,
  s.tipo_atendimento,
  v.acompanhante_id,
  v.observacoes,
  CASE
    WHEN v.status = 'REALIZADA' THEN 'REALIZADO'::saude_tfd.agendamento_status
    WHEN v.status = 'CANCELADA' THEN 'CANCELADO'::saude_tfd.agendamento_status
    WHEN v.em_viagem_transicionado_at IS NOT NULL OR s.status = 'EM_VIAGEM' THEN 'EM_VIAGEM'::saude_tfd.agendamento_status
    ELSE 'AGENDADO'::saude_tfd.agendamento_status
  END,
  v.retorno_registrado_at,
  NULL,
  NULL,
  v.created_at,
  v.updated_at
FROM saude_tfd.viagens v
INNER JOIN saude_tfd.solicitacoes s
  ON s.id = v.solicitacao_id
 AND s.tenant_id = v.tenant_id;

-- Vincular prestações existentes ao agendamento correspondente (id = viagem_id)
UPDATE saude_tfd.prestacoes_conta pc
SET agendamento_id = pc.viagem_id
WHERE pc.agendamento_id IS NULL
  AND EXISTS (
    SELECT 1
    FROM saude_tfd.agendamentos a
    WHERE a.id = pc.viagem_id
      AND a.tenant_id = pc.tenant_id
  );
