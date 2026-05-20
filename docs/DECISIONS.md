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
