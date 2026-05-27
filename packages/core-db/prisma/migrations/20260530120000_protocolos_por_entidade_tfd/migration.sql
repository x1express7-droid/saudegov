-- Protocolo independente por entidade TFD (processo já possui em public.processos)

ALTER TABLE saude_tfd.solicitacoes ADD COLUMN IF NOT EXISTS protocolo VARCHAR(50);
ALTER TABLE saude_tfd.agendamentos ADD COLUMN IF NOT EXISTS protocolo VARCHAR(50);
ALTER TABLE saude_tfd.viagens ADD COLUMN IF NOT EXISTS protocolo VARCHAR(50);

-- Backfill solicitações: 2025-SAUDE-TFD-SOL-000001
WITH ranked AS (
  SELECT
    id,
    tenant_id,
    EXTRACT(YEAR FROM created_at)::int AS ano,
    ROW_NUMBER() OVER (
      PARTITION BY tenant_id, EXTRACT(YEAR FROM created_at)
      ORDER BY created_at ASC, id ASC
    ) AS seq
  FROM saude_tfd.solicitacoes
)
UPDATE saude_tfd.solicitacoes s
SET protocolo = ranked.ano::text || '-SAUDE-TFD-SOL-' || LPAD(ranked.seq::text, 6, '0')
FROM ranked
WHERE s.id = ranked.id AND s.protocolo IS NULL;

-- Backfill agendamentos: 2025-SAUDE-TFD-AGD-000001
WITH ranked AS (
  SELECT
    id,
    tenant_id,
    EXTRACT(YEAR FROM created_at)::int AS ano,
    ROW_NUMBER() OVER (
      PARTITION BY tenant_id, EXTRACT(YEAR FROM created_at)
      ORDER BY created_at ASC, id ASC
    ) AS seq
  FROM saude_tfd.agendamentos
)
UPDATE saude_tfd.agendamentos a
SET protocolo = ranked.ano::text || '-SAUDE-TFD-AGD-' || LPAD(ranked.seq::text, 6, '0')
FROM ranked
WHERE a.id = ranked.id AND a.protocolo IS NULL;

-- Backfill viagens: 2025-SAUDE-TFD-VGM-000001
WITH ranked AS (
  SELECT
    id,
    tenant_id,
    EXTRACT(YEAR FROM created_at)::int AS ano,
    ROW_NUMBER() OVER (
      PARTITION BY tenant_id, EXTRACT(YEAR FROM created_at)
      ORDER BY created_at ASC, id ASC
    ) AS seq
  FROM saude_tfd.viagens
)
UPDATE saude_tfd.viagens v
SET protocolo = ranked.ano::text || '-SAUDE-TFD-VGM-' || LPAD(ranked.seq::text, 6, '0')
FROM ranked
WHERE v.id = ranked.id AND v.protocolo IS NULL;

-- Sincroniza contadores de sequência (SAUDE_TFD-SOL / AGD / VGM)
INSERT INTO public.protocolo_sequencias (id, tenant_id, modulo, ano, ultimo_seq)
SELECT gen_random_uuid(), tenant_id, 'SAUDE_TFD-SOL', ano, max_seq
FROM (
  SELECT tenant_id, EXTRACT(YEAR FROM created_at)::int AS ano,
    MAX(CAST(SPLIT_PART(protocolo, '-', 5) AS integer)) AS max_seq
  FROM saude_tfd.solicitacoes
  WHERE protocolo IS NOT NULL
  GROUP BY tenant_id, EXTRACT(YEAR FROM created_at)
) t
ON CONFLICT (tenant_id, modulo, ano)
DO UPDATE SET ultimo_seq = GREATEST(public.protocolo_sequencias.ultimo_seq, EXCLUDED.ultimo_seq);

INSERT INTO public.protocolo_sequencias (id, tenant_id, modulo, ano, ultimo_seq)
SELECT gen_random_uuid(), tenant_id, 'SAUDE_TFD-AGD', ano, max_seq
FROM (
  SELECT tenant_id, EXTRACT(YEAR FROM created_at)::int AS ano,
    MAX(CAST(SPLIT_PART(protocolo, '-', 5) AS integer)) AS max_seq
  FROM saude_tfd.agendamentos
  WHERE protocolo IS NOT NULL
  GROUP BY tenant_id, EXTRACT(YEAR FROM created_at)
) t
ON CONFLICT (tenant_id, modulo, ano)
DO UPDATE SET ultimo_seq = GREATEST(public.protocolo_sequencias.ultimo_seq, EXCLUDED.ultimo_seq);

INSERT INTO public.protocolo_sequencias (id, tenant_id, modulo, ano, ultimo_seq)
SELECT gen_random_uuid(), tenant_id, 'SAUDE_TFD-VGM', ano, max_seq
FROM (
  SELECT tenant_id, EXTRACT(YEAR FROM created_at)::int AS ano,
    MAX(CAST(SPLIT_PART(protocolo, '-', 5) AS integer)) AS max_seq
  FROM saude_tfd.viagens
  WHERE protocolo IS NOT NULL
  GROUP BY tenant_id, EXTRACT(YEAR FROM created_at)
) t
ON CONFLICT (tenant_id, modulo, ano)
DO UPDATE SET ultimo_seq = GREATEST(public.protocolo_sequencias.ultimo_seq, EXCLUDED.ultimo_seq);

ALTER TABLE saude_tfd.solicitacoes ALTER COLUMN protocolo SET NOT NULL;
ALTER TABLE saude_tfd.agendamentos ALTER COLUMN protocolo SET NOT NULL;
ALTER TABLE saude_tfd.viagens ALTER COLUMN protocolo SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_tfd_sol_protocolo ON saude_tfd.solicitacoes(tenant_id, protocolo);
CREATE UNIQUE INDEX IF NOT EXISTS uq_tfd_agd_protocolo ON saude_tfd.agendamentos(tenant_id, protocolo);
CREATE UNIQUE INDEX IF NOT EXISTS uq_tfd_vgm_protocolo ON saude_tfd.viagens(tenant_id, protocolo);

CREATE INDEX IF NOT EXISTS idx_tfd_sol_protocolo ON saude_tfd.solicitacoes(tenant_id, protocolo);
CREATE INDEX IF NOT EXISTS idx_tfd_agd_protocolo ON saude_tfd.agendamentos(tenant_id, protocolo);
CREATE INDEX IF NOT EXISTS idx_tfd_vgm_protocolo ON saude_tfd.viagens(tenant_id, protocolo);
