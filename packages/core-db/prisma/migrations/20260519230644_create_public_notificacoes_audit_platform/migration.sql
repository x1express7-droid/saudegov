-- Migration: create_public_notificacoes_audit_platform
-- Sprint 0.2 — Schema Base do Banco

CREATE TYPE public.notificacao_canal AS ENUM ('EMAIL', 'IN_APP');
CREATE TYPE public.notificacao_status AS ENUM ('PENDENTE', 'ENVIADO', 'FALHOU', 'LIDO');

CREATE TABLE public.notificacoes (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id      UUID REFERENCES public.users(id) ON DELETE CASCADE,
  processo_id  UUID REFERENCES public.processos(id) ON DELETE CASCADE,
  canal        public.notificacao_canal NOT NULL,
  status       public.notificacao_status NOT NULL DEFAULT 'PENDENTE',
  titulo       VARCHAR(200) NOT NULL,
  corpo        TEXT NOT NULL,
  tentativas   INTEGER NOT NULL DEFAULT 0,
  lido_at      TIMESTAMPTZ,
  enviado_at   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notif_tenant   ON public.notificacoes(tenant_id);
CREATE INDEX idx_notif_user     ON public.notificacoes(user_id);
CREATE INDEX idx_notif_pendente ON public.notificacoes(status)
  WHERE status = 'PENDENTE';

ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON public.notificacoes
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE TABLE public.audit_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  user_id         UUID REFERENCES public.users(id) ON DELETE SET NULL,
  acao            VARCHAR(100) NOT NULL,
  entidade        VARCHAR(100) NOT NULL,
  entidade_id     UUID,
  payload_antes   JSONB,
  payload_depois  JSONB,
  ip_address      INET,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_tenant    ON public.audit_logs(tenant_id);
CREATE INDEX idx_audit_user      ON public.audit_logs(user_id);
CREATE INDEX idx_audit_entidade  ON public.audit_logs(entidade, entidade_id);
CREATE INDEX idx_audit_created   ON public.audit_logs(created_at DESC);

CREATE TABLE public.protocolo_sequencias (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  modulo      VARCHAR(50) NOT NULL,
  ano         INTEGER NOT NULL,
  ultimo_seq  INTEGER NOT NULL DEFAULT 0,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_protocolo_seq UNIQUE (tenant_id, modulo, ano)
);

CREATE TABLE public.platform_features (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sistema           VARCHAR(50) NOT NULL,
  modulo            VARCHAR(50) NOT NULL,
  funcionalidade    VARCHAR(100) NOT NULL,
  descricao         TEXT NOT NULL,
  painel_dev        BOOLEAN NOT NULL DEFAULT false,
  painel_servidor   BOOLEAN NOT NULL DEFAULT false,
  permissao_chave   VARCHAR(100),
  status            VARCHAR(20) NOT NULL DEFAULT 'ativo',
  sprint            VARCHAR(20),
  criado_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_platform_feature UNIQUE (sistema, modulo, funcionalidade)
);
