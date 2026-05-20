-- Migration: create_public_processos_tramitacoes_anexos
-- Sprint 0.2 — Schema Base do Banco

CREATE TYPE public.processo_status AS ENUM (
  'ABERTO',
  'EM_ANDAMENTO',
  'AGUARDANDO_COMPLEMENTO',
  'CONCLUIDO',
  'CANCELADO',
  'ARQUIVADO'
);

CREATE TABLE public.processos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  protocolo       VARCHAR(50) NOT NULL,
  modulo          VARCHAR(50) NOT NULL,
  status          public.processo_status NOT NULL DEFAULT 'ABERTO',
  titulo          VARCHAR(500) NOT NULL,
  setor_id        UUID REFERENCES public.setores(id) ON DELETE SET NULL,
  responsavel_id  UUID REFERENCES public.users(id) ON DELETE SET NULL,
  aberto_por_id   UUID REFERENCES public.users(id) ON DELETE SET NULL,
  concluido_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_protocolo UNIQUE (tenant_id, protocolo)
);

CREATE INDEX idx_processos_tenant_id  ON public.processos(tenant_id);
CREATE INDEX idx_processos_protocolo  ON public.processos(tenant_id, protocolo);
CREATE INDEX idx_processos_modulo     ON public.processos(tenant_id, modulo);
CREATE INDEX idx_processos_status     ON public.processos(tenant_id, status);
CREATE INDEX idx_processos_setor      ON public.processos(setor_id);

ALTER TABLE public.processos ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON public.processos
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE TYPE public.tramitacao_tipo AS ENUM (
  'ABERTURA',
  'ENCAMINHAMENTO',
  'COMPLEMENTO_SOLICITADO',
  'COMPLEMENTO_ENVIADO',
  'DECISAO',
  'AGENDAMENTO',
  'RETORNO_REGISTRADO',
  'PRESTACAO_ENVIADA',
  'PRESTACAO_APROVADA',
  'PRESTACAO_REJEITADA',
  'CANCELAMENTO',
  'CONCLUSAO',
  'OBSERVACAO_INTERNA'
);

CREATE TABLE public.tramitacoes (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  processo_id      UUID NOT NULL REFERENCES public.processos(id) ON DELETE CASCADE,
  tipo             public.tramitacao_tipo NOT NULL,
  descricao        TEXT NOT NULL,
  visivel_servidor BOOLEAN NOT NULL DEFAULT true,
  usuario_id       UUID REFERENCES public.users(id) ON DELETE SET NULL,
  metadata         JSONB DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tramitacoes_tenant    ON public.tramitacoes(tenant_id);
CREATE INDEX idx_tramitacoes_processo  ON public.tramitacoes(processo_id);
CREATE INDEX idx_tramitacoes_created   ON public.tramitacoes(created_at DESC);

ALTER TABLE public.tramitacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON public.tramitacoes
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE TABLE public.anexos (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  processo_id      UUID REFERENCES public.processos(id) ON DELETE CASCADE,
  uploader_id      UUID REFERENCES public.users(id) ON DELETE SET NULL,
  nome_original    VARCHAR(500) NOT NULL,
  storage_path     VARCHAR(1000) NOT NULL,
  mime_type        VARCHAR(100) NOT NULL,
  tamanho_bytes    BIGINT NOT NULL,
  confirmado       BOOLEAN NOT NULL DEFAULT false,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_anexos_tenant    ON public.anexos(tenant_id);
CREATE INDEX idx_anexos_processo  ON public.anexos(processo_id);

ALTER TABLE public.anexos ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON public.anexos
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
