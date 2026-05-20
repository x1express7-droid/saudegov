-- Migration: create_public_organograma
-- Sprint 0.2 — Schema Base do Banco

CREATE TABLE public.secretarias (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  nome            VARCHAR(200) NOT NULL,
  sigla           VARCHAR(20),
  responsavel_id  UUID REFERENCES public.users(id) ON DELETE SET NULL,
  ativa           BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.departamentos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  secretaria_id   UUID NOT NULL REFERENCES public.secretarias(id) ON DELETE CASCADE,
  nome            VARCHAR(200) NOT NULL,
  sigla           VARCHAR(20),
  responsavel_id  UUID REFERENCES public.users(id) ON DELETE SET NULL,
  ativo           BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.setores (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  departamento_id UUID NOT NULL REFERENCES public.departamentos(id) ON DELETE CASCADE,
  nome            VARCHAR(200) NOT NULL,
  sigla           VARCHAR(20),
  email_setor     VARCHAR(255),
  responsavel_id  UUID REFERENCES public.users(id) ON DELETE SET NULL,
  ativo           BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.servidor_setores (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  setor_id    UUID NOT NULL REFERENCES public.setores(id) ON DELETE CASCADE,
  cargo       VARCHAR(200),
  principal   BOOLEAN NOT NULL DEFAULT false,
  ativo       BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_servidor_setor UNIQUE (user_id, setor_id)
);

CREATE TABLE public.modulo_setor_responsavel (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  modulo      VARCHAR(50) NOT NULL,
  setor_id    UUID NOT NULL REFERENCES public.setores(id) ON DELETE CASCADE,
  ativo       BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_modulo_setor UNIQUE (tenant_id, modulo, setor_id)
);

ALTER TABLE public.secretarias ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON public.secretarias
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

ALTER TABLE public.departamentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON public.departamentos
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

ALTER TABLE public.setores ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON public.setores
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

ALTER TABLE public.servidor_setores ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON public.servidor_setores
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

ALTER TABLE public.modulo_setor_responsavel ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON public.modulo_setor_responsavel
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
