-- Sprint 0.4 — Painel Dev — Gestão de Municípios
-- Seed de encerramento: registra funcionalidades em public.platform_features
-- Executar manualmente após concluir a sprint (não é migration).

INSERT INTO public.platform_features (
  sistema,
  modulo,
  funcionalidade,
  descricao,
  painel_dev,
  painel_servidor,
  permissao_chave,
  status,
  sprint
) VALUES
  (
    'plataforma',
    'municipios',
    'listar_municipios',
    'Listagem de municípios com status, módulos ativos, filtros e paginação no Painel Dev.',
    true,
    false,
    NULL,
    'ativo',
    '0.4'
  ),
  (
    'plataforma',
    'municipios',
    'criar_municipio',
    'Formulário de criação de município com domínio automático ou customizado e configuração inicial.',
    true,
    false,
    NULL,
    'ativo',
    '0.4'
  ),
  (
    'plataforma',
    'municipios',
    'criar_subdominio_automatico',
    'Integração com API Cloudflare para criação automática de subdomínio em saudemunic.com.br.',
    true,
    false,
    NULL,
    'ativo',
    '0.4'
  ),
  (
    'plataforma',
    'municipios',
    'registrar_dominio_custom',
    'Registro de domínio .gov.br ou customizado via Cloudflare, com instruções DNS para o TI do município.',
    true,
    false,
    NULL,
    'ativo',
    '0.4'
  ),
  (
    'plataforma',
    'municipios',
    'alterar_modulos_municipio',
    'Ativação e desativação de módulos do sistema de saúde por município no Painel Dev.',
    true,
    false,
    NULL,
    'ativo',
    '0.4'
  ),
  (
    'plataforma',
    'municipios',
    'suspender_reativar_municipio',
    'Suspensão e reativação de município — bloqueia resolução de tenant sem remover dados.',
    true,
    false,
    NULL,
    'ativo',
    '0.4'
  ),
  (
    'plataforma',
    'municipios',
    'criar_admin_municipio',
    'Criação do primeiro usuário ADMIN do município com senha temporária exibida uma única vez.',
    true,
    false,
    NULL,
    'ativo',
    '0.4'
  ),
  (
    'plataforma',
    'auditoria',
    'listar_audit_logs_globais',
    'Página de audit logs globais com filtros, paginação e detalhes de payload mascarados.',
    true,
    false,
    NULL,
    'ativo',
    '0.4'
  ),
  (
    'plataforma',
    'plataforma',
    'listar_platform_features',
    'Consulta ao registro de funcionalidades da plataforma com destaque de lacunas de paridade entre painéis.',
    true,
    false,
    NULL,
    'ativo',
    '0.4'
  )
ON CONFLICT (sistema, modulo, funcionalidade) DO UPDATE SET
  descricao = EXCLUDED.descricao,
  painel_dev = EXCLUDED.painel_dev,
  painel_servidor = EXCLUDED.painel_servidor,
  permissao_chave = EXCLUDED.permissao_chave,
  status = EXCLUDED.status,
  sprint = EXCLUDED.sprint,
  atualizado_at = NOW();
