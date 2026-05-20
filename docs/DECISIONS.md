# DECISIONS.md
# saudegov — Decisões de Implementação por Sprint

## Sprint 0.4 — Painel Dev — Gestão de Municípios

### D01 — getPrismaAdmin()
**Decisão:** criar helper dedicado em packages/core-db/src/admin-client.ts
**Motivo:** Painel Dev precisa acessar tabelas globais (tenants, audit_logs, platform_features) sem RLS. Usar prisma direto violaria a regra do cursorrules. Helper explícito documenta o uso intencional.
**Restrição:** uso exclusivo em apps/painel-dev e packages do core. Proibido em apps/painel-servidor e modules/*.

### D02 — requireSuperAdmin()
**Decisão:** função separada de requireTenantRole em packages/core-auth/src/authorization.ts
**Motivo:** SUPERADMIN não pertence a nenhum tenant. requireTenantRole pressupõe tenantId na sessão.

### D03 — Actions e queries de tenant em apps/painel-dev/lib/
**Decisão:** lib/actions/ e lib/queries/ exclusivos do app, não no core
**Motivo:** gestão de tenant é responsabilidade do Painel Dev. Colocar no core criaria acoplamento desnecessário.

### D04 — T07 (primeiro ADMIN) como parte de criarMunicipio
**Decisão:** criação do ADMIN é passo interno da action criarMunicipio, não tela separada
**Motivo:** API_CONTRACTS.md §3.2 e MULTI_TENANT.md §9 tratam como fluxo único. Senha exibida uma vez no retorno do formulário.

### D05 — T06 inclui reativar município
**Decisão:** suspender e reativar implementados no mesmo componente (toggle ativo/inativo)
**Motivo:** MULTI_TENANT.md §10 descreve os dois sentidos. Omitir reativação deixaria municípios permanentemente suspensos sem intervenção SQL.

### D06 — UI da Sprint 0.4 com Tailwind nativo
**Decisão:** componentes locais em apps/painel-dev/components/, sem @saude/ui
**Motivo:** Sprint 0.5 ainda não foi executada. Design system não existe. Migração possível após 0.5.

### D07 — must_change_password via migration manual
**Decisão:** campo adicionado via prisma db execute + migrate resolve por drift no histórico local
**Motivo:** migration 20260520160002_add_password_resets foi alterada após aplicada. prisma migrate dev falhou. Resolver com prisma migrate reset antes da Sprint 0.6.
**Pendente:** redirect no login (Sprint 0.6).

### D08 — Domínio .gov.br usa mesma CF_ZONE_ID
**Decisão:** registrarDominioCustomizado cria CNAME na zona da plataforma
**Limitação:** municípios com zona DNS própria exigem configuração manual. UI informa o TI do município sobre o CNAME necessário antes de ativar.

## Sprint 0.6 — Painel Servidor — Configuração Municipal

### D09 — Índice parcial `uq_modulo_setor_ativo` em `modulo_setor_responsavel`
**Decisão:** índice único parcial `(tenant_id, modulo) WHERE ativo = true` adotado na Sprint 0.6 (migration `20260520193000_add_partial_unique_modulo_setor_ativo`). Não refletido em `schema.prisma` — apenas migration + `DATABASE_SCHEMA.md`.
**Motivo:** regra estrutural de um setor responsável ativo por módulo por tenant; leitura para roteamento de notificações a partir da Sprint 1.4.
**Alternativa descartada:** manter a regra só na action `definirSetorResponsavelModulo` — risco de bug silencioso (múltiplos `ativo = true` para o mesmo módulo) em leitores que usam `findFirst` sem ordem garantida.

### D10 — Permissões granulares sem invalidar sessão ativa
**Decisão:** `atualizarPermissoesServidor` persiste merge no JSONB `users.permissions` com audit log; **não** invalida a sessão JWT do servidor afetado na Sprint 0.6.
**Motivo:** invalidação distribuída de sessão NextAuth exige complexidade adicional; UI informa que alterações valem no próximo login.
**Limitação conhecida:** servidor com sessão aberta mantém permissões antigas até novo login ou expiração do token (8h).
**Alternativa descartada:** invalidar sessão imediatamente (API_CONTRACTS.md §4.4) — adiado para sprint com gestão centralizada de sessões.

### D11 — Logo do tema via URL externa (Sprint 0.6)
**Decisão:** `atualizarLogo` grava `theme.logoUrl` (merge no JSONB); `packages/core-documents/src/storage.ts` **não existe** nesta sprint — sem upload para bucket/CDN.
**Motivo:** utilitário de storage ainda não implementado; evitar bloquear a tela de tema.
**UX:** `FileUpload` serve apenas para pré-visualização local; persistência exige URL HTTPS informada pelo ADMIN.
**Alternativa descartada:** data URL/base64 no JSONB — poluiria o banco e o middleware.
**Pendente:** integrar storage e action de upload dedicada em sprint futura.

### D12 — Configuração SMTP por tenant — modelo híbrido
**Sprint:** 0.6 (decisão); implementação gradual até 2.x
**Decisão:**
- SMTP padrão da plataforma: variáveis de ambiente (`SMTP_PLATFORM_HOST`, `SMTP_PLATFORM_PORT`, `SMTP_PLATFORM_USER`, `SMTP_PLATFORM_PASSWORD`, `SMTP_PLATFORM_FROM`, `SMTP_PLATFORM_SECURE`). Documentar em `.env.example`.
- Override por tenant: toggle `smtp_custom_enabled` em `tenants.settings`. Campos operacionais (`smtp_host`, `smtp_port`, `smtp_user`, `smtp_from`, `smtp_secure`) gravados em `settings` quando o toggle estiver ativo.
- Senha SMTP: **não** gravar em texto claro. **Não** usar bcrypt (`core-auth/crypto` atual é irreversível). Senha permanece ausente de `settings` até criptografia reversível (AES-256-GCM + `TENANT_SECRETS_ENCRYPTION_KEY`). Campo reservado: `smtp_password_enc`.
- Sprint 0.6: sem campos SMTP na UI — apenas estrutura documentada.
- Sprint 1.4: `core-notifications` usa somente SMTP da plataforma (env).
- Sprint 2.x: formulário SMTP completo no Painel Servidor com criptografia reversível (Opção B'). Tela no Painel Dev para SMTP global, se necessário.
**Alternativa descartada:** senha SMTP em texto claro no JSONB — risco em backup, audit log e vazamento. bcrypt para senha SMTP — irreversível, impossível autenticar no servidor de e-mail.

### D13 — Secretaria fixa por tenant (uma SMS por tenant)
**Decisão:** a Secretaria Municipal de Saúde é entidade fixa, não configurável pelo ADMIN. A tabela `public.secretarias` permanece como âncora de FK; CRUD de secretaria foi removido da UI e das actions. Provisionamento automático na criação do município. `UNIQUE(tenant_id)` adicionado via migration `20260520190000_secretarias_unique_tenant_id`.
**Motivo:** um único órgão de saúde por município na plataforma; evitar organograma inconsistente ou múltiplas SMS por tenant.
**Alternativa descartada:** CRUD de secretaria no Painel Servidor — complexidade desnecessária para o modelo de negócio.

### D14 — `notification_email` canônico em snake_case no JSONB
**Decisão:** o campo canônico em `tenants.settings` é `notification_email` (snake_case). O input TypeScript usa `notificationEmail` (camelCase). Leitura com fallback `notificationEmail` para compatibilidade com dados gravados antes da normalização. Gravação remove a chave camelCase legada a cada save.
**Motivo:** alinhar `settings` ao padrão snake_case do schema (`DATABASE_SCHEMA.md`); manter DX do formulário em camelCase sem quebrar tenants já provisionados.
**Alternativa descartada:** manter apenas `notificationEmail` no JSONB — inconsistente com demais chaves de `settings`.

### D15 — Dados sensíveis de integração nunca em audit log
**Decisão:** `cadsus_token` e futuros campos de credencial (ex.: `smtp_password_enc`) **nunca** aparecem em audit log, `console.error` ou payload de notificação. O audit registra apenas flags booleanas (ex.: `cadsus_token_configured`, `cadsus_token_updated`). Padrão estabelecido na Tarefa 7 (Sprint 0.6), aplicável a toda credencial em `tenants.settings`.
**Motivo:** reduzir superfície de vazamento em logs imutáveis e backups de audit.
**Alternativa descartada:** mascarar parcialmente o valor no audit — ainda expõe metadado recuperável em incidentes.

### D16 — Vínculos em `servidor_setores`: desativação sem delete
**Decisão:** remoção de setor de um servidor grava `ativo: false` em `servidor_setores` — nunca deleta o registro. Histórico de vínculos preservado. Reativação via upsert pelo constraint `uq_servidor_setor` (`user_id`, `setor_id`).
**Motivo:** auditoria e relatórios de vínculos passados; evitar perda de histórico operacional.
**Alternativa descartada:** `DELETE` em `servidor_setores` — apaga rastro e complica reativação idempotente.

### D17 — Permissões granulares: rejeitar chaves fora do catálogo
**Decisão:** a action `atualizarPermissoesServidor` rejeita qualquer chave não presente em `TFD_GRANULAR_PERMISSION_DEFINITIONS`. Retorna `ActionResponse` com `success: false` e `fieldErrors`. Impede injeção de permissões arbitrárias via request manipulado.
**Motivo:** o JSONB `users.permissions` é fonte de autorização; chaves desconhecidas não devem ser aceitas silenciosamente.
**Alternativa descartada:** ignorar chaves inválidas — comportamento permissivo que mascara tentativas de escalação de privilégio.
