-- Migration: create_saude_tfd_solicitacoes_tables
-- Sprint 1.1 — Solicitações TFD, acompanhantes e FK reservas_saldo → solicitacoes

CREATE TYPE saude_tfd.status_solicitacao AS ENUM (
  'RASCUNHO',
  'ENVIADO',
  'EM_ANALISE',
  'PENDENTE',
  'APROVADO',
  'NEGADO',
  'AGENDADO',
  'EM_VIAGEM',
  'AGUARDANDO_PC',
  'PC_EM_ANALISE',
  'CONCLUIDO',
  'CANCELADO'
);

CREATE TYPE saude_tfd.tipo_atendimento AS ENUM (
  'CONSULTA',
  'RETORNO',
  'EXAME',
  'CIRURGIA'
);

CREATE TYPE saude_tfd.urgencia AS ENUM (
  'BAIXA',
  'INTERMEDIARIA',
  'GRAVE',
  'MUITO_URGENTE'
);

CREATE TYPE saude_tfd.relacao_acompanhante AS ENUM (
  'CONJUGE',
  'FILHO_A',
  'PAI_MAE',
  'RESPONSAVEL_LEGAL',
  'CUIDADOR',
  'OUTRO'
);

CREATE TABLE saude_tfd.solicitacoes (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id               UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  processo_id             UUID NOT NULL REFERENCES public.processos(id) ON DELETE CASCADE,
  paciente_id             UUID NOT NULL REFERENCES saude_base.pacientes(id),
  solicitante_id          UUID NOT NULL REFERENCES public.users(id),
  unidade_origem_id       UUID REFERENCES saude_base.unidades(id) ON DELETE SET NULL,
  especialidade_id        UUID REFERENCES saude_tfd.especialidades(id) ON DELETE SET NULL,
  prestador_id            UUID REFERENCES saude_tfd.prestadores(id) ON DELETE SET NULL,
  procedimentos           JSONB NOT NULL DEFAULT '[]',
  tipo_atendimento        saude_tfd.tipo_atendimento NOT NULL,
  solicitacao_origem_id   UUID REFERENCES saude_tfd.solicitacoes(id) ON DELETE SET NULL,
  urgencia                saude_tfd.urgencia NOT NULL DEFAULT 'BAIXA',
  status                  saude_tfd.status_solicitacao NOT NULL DEFAULT 'RASCUNHO',
  cid_principal           VARCHAR(10),
  diagnostico             TEXT,
  laudo_anexo_id          UUID REFERENCES public.anexos(id) ON DELETE SET NULL,
  acompanhante_necessario BOOLEAN NOT NULL DEFAULT false,
  fundamentacao_decisao   TEXT,
  decidido_por_id         UUID REFERENCES public.users(id) ON DELETE SET NULL,
  decidido_at             TIMESTAMPTZ,
  saldo_id                UUID REFERENCES saude_tfd.saldos(id) ON DELETE SET NULL,
  motivo_cancelamento     TEXT,
  cancelado_por_id        UUID REFERENCES public.users(id) ON DELETE SET NULL,
  cancelado_at            TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tfd_sol_tenant   ON saude_tfd.solicitacoes(tenant_id);
CREATE INDEX idx_tfd_sol_processo ON saude_tfd.solicitacoes(processo_id);
CREATE INDEX idx_tfd_sol_paciente ON saude_tfd.solicitacoes(paciente_id);
CREATE INDEX idx_tfd_sol_status   ON saude_tfd.solicitacoes(tenant_id, status);
CREATE INDEX idx_tfd_sol_urgencia ON saude_tfd.solicitacoes(tenant_id, urgencia);
CREATE INDEX idx_tfd_sol_origem   ON saude_tfd.solicitacoes(solicitacao_origem_id)
  WHERE solicitacao_origem_id IS NOT NULL;

ALTER TABLE saude_tfd.solicitacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON saude_tfd.solicitacoes
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE TABLE saude_tfd.acompanhantes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  solicitacao_id  UUID NOT NULL REFERENCES saude_tfd.solicitacoes(id) ON DELETE CASCADE,
  nome            VARCHAR(200) NOT NULL,
  cpf             VARCHAR(11) NOT NULL,
  relacao         saude_tfd.relacao_acompanhante NOT NULL,
  telefone        VARCHAR(20),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tfd_acomp_tenant      ON saude_tfd.acompanhantes(tenant_id);
CREATE INDEX idx_tfd_acomp_solicitacao ON saude_tfd.acompanhantes(solicitacao_id);

ALTER TABLE saude_tfd.acompanhantes ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON saude_tfd.acompanhantes
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);

ALTER TABLE saude_tfd.reservas_saldo
  ADD CONSTRAINT fk_reserva_solicitacao
  FOREIGN KEY (solicitacao_id) REFERENCES saude_tfd.solicitacoes(id);

ALTER TABLE saude_tfd.reservas_saldo
  ALTER COLUMN solicitacao_id SET NOT NULL;
