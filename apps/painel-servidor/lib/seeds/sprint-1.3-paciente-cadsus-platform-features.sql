-- Sprint 1.3 — Paciente e CADSUS stub (TFD)
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
    'buscar_paciente_cns',
    'Busca de paciente no CADSUS pelo CNS com preenchimento automático de dados',
    false,
    true,
    'saude.tfd.abrir_solicitacao',
    'ativo',
    '1.3',
    NOW(),
    NOW()
  ),
  (
    gen_random_uuid(),
    'saude',
    'tfd',
    'vincular_paciente',
    'Vínculo de paciente ao município com gravação em saude_base.pacientes',
    false,
    true,
    'saude.tfd.abrir_solicitacao',
    'ativo',
    '1.3',
    NOW(),
    NOW()
  ),
  (
    gen_random_uuid(),
    'saude',
    'tfd',
    'validar_divergencia_cpf_cns',
    'Detecção e bloqueio de divergência entre CPF informado e CNS cadastrado',
    false,
    true,
    'saude.tfd.abrir_solicitacao',
    'ativo',
    '1.3',
    NOW(),
    NOW()
  )
ON CONFLICT (sistema, modulo, funcionalidade) DO NOTHING;
