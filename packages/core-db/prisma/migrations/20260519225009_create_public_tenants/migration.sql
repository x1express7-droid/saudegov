-- Migration: create_public_tenants
-- Sprint 0.2 — Schema Base do Banco

CREATE TABLE public.tenants (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            VARCHAR(100) UNIQUE NOT NULL,
  name            VARCHAR(200) NOT NULL,
  domain          VARCHAR(255) UNIQUE NOT NULL,
  domain_custom   VARCHAR(255) UNIQUE,
  cloudflare_zone_id   VARCHAR(100),
  cloudflare_record_id VARCHAR(100),
  modules         JSONB NOT NULL DEFAULT '{"saude": {"tfd": false}}',
  theme           JSONB NOT NULL DEFAULT '{}',
  settings        JSONB NOT NULL DEFAULT '{}',
  active          BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tenants_domain        ON public.tenants(domain);
CREATE INDEX idx_tenants_domain_custom ON public.tenants(domain_custom);
CREATE INDEX idx_tenants_slug          ON public.tenants(slug);
CREATE INDEX idx_tenants_active        ON public.tenants(active);

-- Sem RLS em tenants — lida pelo Tenant Resolver antes do contexto estar disponível
