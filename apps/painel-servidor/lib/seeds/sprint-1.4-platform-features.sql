-- Sprint 1.4 — Abertura de Solicitação TFD
-- Registra funcionalidades em public.platform_features
-- Executar manualmente após concluir a sprint (não é migration).

INSERT INTO public.platform_features (
  id,
  sistema,
  modulo,
  funcionalidade,
  descricao,
  painel_dev,
  painel_servidor,
  permissao_chave,
  status,
  sprint,
  criado_at,
  atualizado_at
) VALUES
  (
    gen_random_uuid(),
    'saude',
    'tfd',
    'abrir_solicitacao',
    'Abertura de solicitação TFD em rascunho com protocolo, processo e validações de negócio',
    false,
    true,
    'saude.tfd.abrir_solicitacao',
    'ativo',
    '1.4',
    NOW(),
    NOW()
  ),
  (
    gen_random_uuid(),
    'saude',
    'tfd',
    'enviar_solicitacao',
    'Envio de solicitação TFD (RASCUNHO → ENVIADO) com laudo confirmado, tramitação e notificações',
    false,
    true,
    'saude.tfd.abrir_solicitacao',
    'ativo',
    '1.4',
    NOW(),
    NOW()
  ),
  (
    gen_random_uuid(),
    'saude',
    'tfd',
    'listar_solicitacoes',
    'Fila de solicitações TFD com filtros por status, urgência e protocolo e paginação (SERVIDOR: setor; GESTOR/ADMIN: tenant)',
    false,
    true,
    NULL,
    'ativo',
    '1.4',
    NOW(),
    NOW()
  ),
  (
    gen_random_uuid(),
    'saude',
    'tfd',
    'upload_laudo',
    'Upload de laudo médico (PDF, JPEG ou PNG, máx. 10 MB) com URL pré-assinada e confirmação no storage',
    false,
    true,
    'saude.tfd.abrir_solicitacao',
    'ativo',
    '1.4',
    NOW(),
    NOW()
  )
ON CONFLICT (sistema, modulo, funcionalidade) DO NOTHING;
