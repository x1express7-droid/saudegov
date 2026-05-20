-- Sprint 0.6 — Tarefa 1 — Organograma (departamentos e setores; secretaria fixa por tenant)
-- Executar manualmente ou via seed do core-db após implementação.

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
    'saude',
    'config',
    'listar_organograma',
    'Listagem do organograma: secretaria fixa (somente leitura), departamentos e setores.',
    false,
    true,
    'saude.config.organograma',
    'ativo',
    '0.6'
  ),
  (
    'saude',
    'config',
    'criar_departamento',
    'Cadastro de departamento na Secretaria Municipal de Saúde.',
    false,
    true,
    'saude.config.organograma',
    'ativo',
    '0.6'
  ),
  (
    'saude',
    'config',
    'atualizar_departamento',
    'Edição de departamento no organograma.',
    false,
    true,
    'saude.config.organograma',
    'ativo',
    '0.6'
  ),
  (
    'saude',
    'config',
    'desativar_departamento',
    'Desativação de departamento (soft delete via campo ativo).',
    false,
    true,
    'saude.config.organograma',
    'ativo',
    '0.6'
  ),
  (
    'saude',
    'config',
    'criar_setor',
    'Cadastro de setor vinculado a um departamento.',
    false,
    true,
    'saude.config.organograma',
    'ativo',
    '0.6'
  ),
  (
    'saude',
    'config',
    'atualizar_setor',
    'Edição de setor no organograma (nome, sigla, e-mail).',
    false,
    true,
    'saude.config.organograma',
    'ativo',
    '0.6'
  ),
  (
    'saude',
    'config',
    'desativar_setor',
    'Desativação de setor (soft delete via campo ativo).',
    false,
    true,
    'saude.config.organograma',
    'ativo',
    '0.6'
  ),
  (
    'saude',
    'config',
    'definir_setor_responsavel',
    'Definição do setor responsável por cada módulo ativo do município.',
    false,
    true,
    'saude.config.responsaveis',
    'ativo',
    '0.6'
  ),
  (
    'saude',
    'config',
    'criar_servidor',
    'Cadastro de servidor (GESTOR ou SERVIDOR) com vínculo a setores.',
    false,
    true,
    'saude.config.servidores',
    'ativo',
    '0.6'
  ),
  (
    'saude',
    'config',
    'atualizar_servidor',
    'Edição de servidor municipal (nome, e-mail, papel, setores).',
    false,
    true,
    'saude.config.servidores',
    'ativo',
    '0.6'
  ),
  (
    'saude',
    'config',
    'desativar_servidor',
    'Desativação de servidor (users.active = false).',
    false,
    true,
    'saude.config.servidores',
    'ativo',
    '0.6'
  ),
  (
    'saude',
    'config',
    'atualizar_permissoes',
    'Atualização de permissões granulares por servidor.',
    false,
    true,
    'saude.config.permissoes',
    'ativo',
    '0.6'
  ),
  (
    'saude',
    'config',
    'atualizar_tema',
    'Atualização de cores do tema visual do município.',
    false,
    true,
    'saude.config.tema',
    'ativo',
    '0.6'
  ),
  (
    'saude',
    'config',
    'atualizar_logo',
    'Atualização da URL da logo no tema.',
    false,
    true,
    'saude.config.tema',
    'ativo',
    '0.6'
  ),
  (
    'saude',
    'config',
    'atualizar_dados_municipio',
    'Atualização de CNPJ, timezone e e-mail de notificação do município.',
    false,
    true,
    'saude.config.municipio',
    'ativo',
    '0.6'
  ),
  (
    'saude',
    'config',
    'configurar_cadsus_stub',
    'Configuração do stub CADSUS (ativo/inativo e token placeholder).',
    false,
    true,
    'saude.config.municipio',
    'ativo',
    '0.6'
  )
ON CONFLICT (sistema, modulo, funcionalidade) DO UPDATE SET
  descricao = EXCLUDED.descricao,
  painel_dev = EXCLUDED.painel_dev,
  painel_servidor = EXCLUDED.painel_servidor,
  permissao_chave = EXCLUDED.permissao_chave,
  status = EXCLUDED.status,
  sprint = EXCLUDED.sprint,
  atualizado_at = NOW();

-- Desativa features de CRUD de secretaria (substituídas pela regra de entidade fixa)
UPDATE public.platform_features
SET status = 'inativo', atualizado_at = NOW()
WHERE sistema = 'saude'
  AND modulo = 'config'
  AND funcionalidade IN ('criar_secretaria', 'atualizar_secretaria', 'desativar_secretaria');
