-- Migration: create_public_users
-- Sprint 0.2 — Schema Base do Banco

CREATE TYPE public.user_role AS ENUM (
  'SUPERADMIN',
  'ADMIN',
  'GESTOR',
  'SERVIDOR'
);

CREATE TABLE public.users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  role            public.user_role NOT NULL DEFAULT 'SERVIDOR',
  name            VARCHAR(200) NOT NULL,
  cpf             VARCHAR(11),
  matricula       VARCHAR(50),
  email           VARCHAR(255) NOT NULL,
  email_verified  BOOLEAN NOT NULL DEFAULT false,
  phone           VARCHAR(20),
  password_hash   VARCHAR(255),
  active          BOOLEAN NOT NULL DEFAULT true,
  permissions     JSONB NOT NULL DEFAULT '{}',
  last_login_at   TIMESTAMPTZ,
  deleted_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_users_tenant_email UNIQUE (tenant_id, email),
  CONSTRAINT uq_users_tenant_cpf   UNIQUE (tenant_id, cpf)
);

CREATE INDEX idx_users_tenant_id  ON public.users(tenant_id);
CREATE INDEX idx_users_email      ON public.users(tenant_id, email);
CREATE INDEX idx_users_cpf        ON public.users(tenant_id, cpf);
CREATE INDEX idx_users_role       ON public.users(tenant_id, role);
CREATE INDEX idx_users_active     ON public.users(tenant_id, active)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_users_permissions ON public.users USING gin(permissions);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON public.users
  USING (
    tenant_id = current_setting('app.current_tenant_id')::uuid
    OR role = 'SUPERADMIN'
  );
