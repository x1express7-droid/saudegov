-- Sprint 3.1 — dados clínicos (SOAP), fila auditada, perfil do paciente (campos preparatórios)

-- Enum: movimentação na fila de regulação
CREATE TYPE saude_tfd.fila_movimentacao_tipo AS ENUM (
  'ENTRADA',
  'SAIDA',
  'AVANCO',
  'RECUO',
  'PRIORIDADE'
);

-- Enum: modalidade TFD (Portaria 55/1999)
CREATE TYPE saude_tfd.modalidade_tfd AS ENUM (
  'INTERMUNICIPAL',
  'INTERESTADUAL'
);

-- Enum: raça/cor (cadastro paciente — TR)
CREATE TYPE saude_base.raca_cor AS ENUM (
  'BRANCA',
  'PRETA',
  'PARDA',
  'AMARELA',
  'INDIGENA',
  'NAO_INFORMADO'
);

-- Dados clínicos SOAP por processo
CREATE TABLE saude_tfd.processo_dados_clinicos (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  processo_id       UUID NOT NULL REFERENCES public.processos(id) ON DELETE CASCADE,
  subjetivo         TEXT,
  objetivo          TEXT,
  avaliacao         TEXT,
  plano             TEXT,
  motivo_quadro     TEXT,
  observacao        TEXT,
  registrado_por_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_tfd_processo_dados_clinicos_processo UNIQUE (processo_id)
);

CREATE INDEX idx_tfd_processo_dados_clinicos_tenant
  ON saude_tfd.processo_dados_clinicos(tenant_id);

CREATE INDEX idx_tfd_processo_dados_clinicos_processo
  ON saude_tfd.processo_dados_clinicos(processo_id);

ALTER TABLE saude_tfd.processo_dados_clinicos ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON saude_tfd.processo_dados_clinicos
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- Histórico imutável de posição na fila
CREATE TABLE saude_tfd.fila_movimentacoes (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  solicitacao_id     UUID NOT NULL REFERENCES saude_tfd.solicitacoes(id) ON DELETE CASCADE,
  posicao_anterior   INT,
  posicao_nova       INT,
  tipo_movimentacao  saude_tfd.fila_movimentacao_tipo NOT NULL,
  justificativa      TEXT,
  usuario_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tfd_fila_movimentacoes_tenant
  ON saude_tfd.fila_movimentacoes(tenant_id);

CREATE INDEX idx_tfd_fila_movimentacoes_solicitacao
  ON saude_tfd.fila_movimentacoes(tenant_id, solicitacao_id, created_at DESC);

ALTER TABLE saude_tfd.fila_movimentacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON saude_tfd.fila_movimentacoes
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- Paciente: campos adicionais (nullable)
ALTER TABLE saude_base.pacientes
  ADD COLUMN email VARCHAR(255),
  ADD COLUMN telefone_celular VARCHAR(20),
  ADD COLUMN nome_social VARCHAR(200),
  ADD COLUMN raca_cor saude_base.raca_cor,
  ADD COLUMN nacionalidade VARCHAR(50),
  ADD COLUMN identidade_genero VARCHAR(50),
  ADD COLUMN responsavel_legal_nome VARCHAR(200),
  ADD COLUMN responsavel_legal_cpf VARCHAR(11);

-- Processo: vínculo direto ao paciente
ALTER TABLE public.processos
  ADD COLUMN paciente_id UUID REFERENCES saude_base.pacientes(id) ON DELETE SET NULL;

CREATE INDEX idx_processos_paciente_id
  ON public.processos(tenant_id, paciente_id)
  WHERE paciente_id IS NOT NULL;

-- Solicitação: fila e campos preparatórios (TR / decisão futura)
ALTER TABLE saude_tfd.solicitacoes
  ADD COLUMN posicao_fila INT,
  ADD COLUMN modalidade_tfd saude_tfd.modalidade_tfd,
  ADD COLUMN medico_solicitante_nome VARCHAR(200),
  ADD COLUMN medico_crm VARCHAR(20),
  ADD COLUMN medico_uf_conselho CHAR(2),
  ADD COLUMN cid_secundario VARCHAR(10),
  ADD COLUMN cid_causas_associadas VARCHAR(10);

CREATE INDEX idx_tfd_sol_posicao_fila
  ON saude_tfd.solicitacoes(tenant_id, posicao_fila)
  WHERE posicao_fila IS NOT NULL;
