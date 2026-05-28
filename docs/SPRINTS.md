# SPRINTS.md
# saudegov — Roteiro de Implementação

> **Instruções para o agente do Cursor:** Consulte este arquivo para entender
> o que já foi implementado e o que está sendo desenvolvido agora. Nunca
> implemente funcionalidades de sprints futuras sem concluir a sprint atual.
> Ao concluir uma tarefa, registre em `public.platform_features`.

---

## 1. Visão Geral das Fases

```
FASE 0 → Fundação (infraestrutura, multi-tenant, auth)
FASE 1 → MVP TFD (fluxo completo do módulo TFD)
FASE 2 → Paridade TFD pós-MVP (relatórios, financeiro/UX, regras documentadas, notificações)
FASE 3 → Módulo Regulação
FASE 4 → Módulo UBS
...
```

---

## 2. FASE 0 — Fundação da Plataforma

### Sprint 0.1 — Monorepo e Infraestrutura Base
**Status:** ✅ Concluído

**Entregas:**
- [x] Inicializar monorepo com Turborepo
- [x] Criar estrutura de pastas conforme `MONOREPO.md`
- [x] Configurar `tsconfig.base.json` compartilhado
- [x] Configurar ESLint + Prettier globais
- [x] Criar `apps/painel-dev` e `apps/painel-servidor` Next.js 15
- [x] Criar `packages/core-db` com Prisma multi-schema
- [x] Configurar Neon (PostgreSQL) — ambientes dev e produção
- [x] Configurar Vercel para os 2 apps com wildcard domain
- [x] Configurar Cloudflare com zona do domínio-base da implantação
- [x] `.env.example` documentado

**Critério de conclusão:** ambos os apps sobem localmente, banco conectado.

---

### Sprint 0.2 — Schema Base do Banco
**Status:** ✅ Concluído

**Entregas:**
- [x] Migration: schema `public` — tenants, users, secretarias, departamentos, setores
- [x] Migration: servidor_setores, modulo_setor_responsavel
- [x] Migration: processos, tramitacoes, anexos
- [x] Migration: notificacoes, audit_logs, protocolo_sequencias, platform_features
- [x] Migration: schema `saude_base` — pacientes, unidades
- [x] RLS habilitado em todas as tabelas de negócio
- [x] Seed de desenvolvimento com tenant + usuários de teste
- [x] `packages/core-db` exportando `getPrismaForTenant`

**Critério de conclusão:** migrations rodam sem erro, seed funciona, RLS testado.

---

### Sprint 0.3 — Autenticação e Multi-tenant
**Status:** ✅ Concluído

**Entregas:**
- [x] `packages/core-auth` — Tenant Resolver (sem cache; cache na fase final de produção)
- [x] `packages/core-auth` — NextAuth v5 configurado
- [x] Middleware `painel-servidor` — Tenant Resolver + Auth Guard
- [x] Middleware `painel-dev` — IP allowlist + Auth Guard SUPERADMIN
- [x] Rotas de login nos 2 apps
- [x] Recuperação de senha (token 1h, uso único)
- [x] Funções `requireAuth`, `requireTenantRole`, `requirePermission`
- [x] `assertModuleActive` → 404 para módulo inativo
- [x] `getTenantContext` em Server Components

**Critério de conclusão:** login funciona em ambos os painéis, RLS validado por tenant.

---

### Sprint 0.4 — Painel Dev — Gestão de Municípios
**Status:** ✅ Concluído

**Entregas:**
- [x] Listagem de municípios com status e módulos ativos
- [x] Formulário de criação de município
- [x] Integração API Cloudflare — criação automática de subdomínio
- [x] Suporte a domínio `.gov.br` customizado com instrução clara
- [x] Ativar/desativar módulos por município (toggle)
- [x] Suspender município
- [x] Criação do primeiro ADMIN do município (senha temporária)
- [x] Página de audit logs globais
- [x] Página de `platform_features`

**Critério de conclusão:** município criado no painel → subdomínio ativo → login funciona.

---

### Sprint 0.5 — UI Base e Design System
**Status:** ✅ Concluído

**Entregas:**
- [x] `packages/ui` — tokens CSS em `tokens.css`
- [x] Layout do `painel-servidor` — header, sidebar, content area
- [x] Tema visual por tenant (CSS vars via layout.tsx)
- [x] Componentes base: Button, Input, Select, Textarea, Card, Badge
- [x] Componentes operacionais: StatusBadge, UrgenciaBadge, ProtocoloBadge
- [x] DataTable com paginação
- [x] PageHeader, EmptyState, Alert, Spinner, Dialog
- [x] FileUpload (drag & drop, validação tipo/tamanho)
- [x] PermissionGate
- [x] TramitacaoTimeline

**Critério de conclusão:** Storybook ou página de exemplo com todos os componentes.

---

### Sprint 0.6 — Configuração do Município (ADMIN)
**Status:** ✅ Concluído

**Entregas:**
- [x] CRUD de departamentos e setores (secretaria fixa por tenant)
- [x] Definir setor responsável por módulo
- [x] CRUD de servidores com seleção de papel
- [x] Tela de permissões granulares (toggles por servidor)
- [x] Configuração de tema visual (cores, logo)
- [x] Configuração de dados do município (CNPJ, timezone, e-mail)
- [x] Stub de configuração CADSUS (campo ativo/inativo + token)

**Critério de conclusão:** ADMIN configura o município completo sem ajuda do dev.

---

## 3. FASE 1 — MVP TFD (Fluxo Completo)

### Sprint 1.1 — Schema TFD e Configurações
**Status:** ✅ Concluído

**Entregas:**
- [x] Migration: `saude_tfd` — especialidades, procedimentos, prestadores
- [x] Migration: veiculos, motoristas
- [x] Migration: saldos, reservas_saldo, movimentacoes_saldo
- [x] Migration: solicitacoes, acompanhantes
- [x] Migration: viagens, itens_despesa, prestacoes_conta
- [x] RLS em todas as tabelas do módulo TFD
- [x] CRUD especialidades (Admin)
- [x] CRUD procedimentos (Admin)
- [x] CRUD prestadores externos (Admin)
- [x] CRUD veículos (Admin/Gestor)
- [x] CRUD motoristas com alerta CNH vencendo (Admin/Gestor)
- [x] `platform_features` populado com funcionalidades da sprint

**Critério de conclusão:** Admin configura TFD completo (especialidades, prestadores, frota).

---

### Sprint 1.2 — Gestão Financeira do TFD
**Status:** ✅ Concluído

**Entregas:**
- [x] Cadastro de saldo financeiro (fonte, período, valor)
- [x] Cálculo de saldo disponível (total - reservado - consumido)
- [x] Listagem de saldos com status visual (alerta < 20%)
- [x] Extrato de movimentações por saldo
- [x] Registro automático de CREDITO ao criar saldo
- [x] Tela de saldo financeiro no Painel Dev (visão SUPERADMIN)
- [x] Revisão UX/UI (labels para gestor, BRL/competência pt-BR, EmptyState contextual, alertas visuais)

**Critério de conclusão:** saldo cadastrado, cálculo correto, extrato visível.

**Débito técnico:** ver `DT-001` na seção Débitos Técnicos.

---

### Sprint 1.3 — Cadastro de Paciente e CADSUS Stub
**Status:** ✅ Concluído

**Entregas:**
- [x] `packages/validators` — validadores CPF, CNS, CNPJ, CEP
- [x] `CadsusStub` implementado conforme `CADSUS.md`
- [x] Factory `getCadsusService` — stub vs real por tenant
- [x] Server Action `buscarPacientePorCns` — busca no CADSUS stub
- [x] Server Action `vincularPaciente` — grava em `saude_base.pacientes`
- [x] Tela de busca por CNS com preenchimento automático
- [x] Validação de divergência CPF ≠ CNS
- [x] Audit log de toda consulta ao CADSUS

**Critério de conclusão:** busca CNS retorna dados, paciente gravado no banco local.

---

### Sprint 1.4 — Abertura de Solicitação TFD
**Status:** ✅ Concluído

**Entregas:**
- [x] Formulário de nova solicitação (multi-step ou seções)
- [x] Server Action `abrirSolicitacaoTfd` — cria RASCUNHO
- [x] Validação: RETORNO exige `solicitacaoOrigemId`
- [x] Validação: CPF acompanhante ≠ CPF paciente
- [x] Upload de laudo médico (PDF/JPEG/PNG, 10MB)
- [x] Server Action `enviarSolicitacaoTfd` — RASCUNHO → ENVIADO
- [x] Geração de protocolo `2025-SAUDE-TFD-000001`
- [x] Notificação para gestor + servidores do setor
- [x] Notificação extra para `MUITO_URGENTE`
- [x] Listagem de solicitações com filtros e paginação

**Critério de conclusão:** fluxo completo de abertura → envio → aparece na fila.

---

### Sprint 1.5 — Regulação e Decisão
**Status:** ✅ Concluído

**Entregas:**
- [x] Server Action `iniciarAnaliseTfd` — ENVIADO → EM_ANALISE
- [x] Tela de detalhe com dados clínicos (permissão `analisar_laudo`)
- [x] URL pré-assinada 15min para visualização do laudo
- [x] Server Action `solicitarComplementoTfd` — EM_ANALISE → PENDENTE
- [x] Server Action `decidirSolicitacaoTfd` — APROVADO/NEGADO
- [x] Verificação atômica de saldo na aprovação (SELECT FOR UPDATE)
- [x] Criação automática de `reserva_saldo` na aprovação
- [x] Registro de `movimentacao_saldo` tipo RESERVA
- [x] Notificações de decisão com fundamentação
- [x] Alerta PENDENTE há 30 dias (provisório na fila; destino definitivo no dashboard TFD — Sprint 1.8)
- [x] Audit log de toda decisão

**Critério de conclusão:** aprovação/negativa funciona, saldo reservado automaticamente.

> **Nota:** o alerta de PENDENTE há 30 dias foi implementado **provisoriamente** na fila
> `/saude/tfd` (decisão de escopo desta sprint). Os alertas operacionais do gestor
> permanecem na fila **até a entrega do dashboard TFD na Sprint 1.8**; após a 1.8, o
> **destino definitivo** é `/saude/tfd/dashboard` (ver `BUSINESS_RULES.md` §1.2.1).
> A fila pode manter resumo ou link para o dashboard, mas deixa de ser o painel principal.
> `enviarComplementoTfd` incluído nesta sprint por necessidade de ciclo testável do fluxo PENDENTE.

---

### Sprint 1.6 — Agendamento de Viagem
**Status:** ✅ Concluído

**Entregas:**
- [x] Server Action `criarAgendamentoTfd` — APROVADO → AGENDADO
- [x] Validação: data mínima 72h no futuro
- [x] Filtro automático: motoristas com CNH válida na data da viagem
- [x] Seleção de veículo com verificação de capacidade
- [x] Job de notificação 48h antes da viagem
- [x] Alerta quando notificação 48h falha (provisório na fila; destino definitivo no dashboard TFD — Sprint 1.8)
- [x] Suporte a múltiplas viagens por solicitação (sequencia 1, 2, 3...)
- [x] Listagem de agendamentos com filtro por data

**Critério de conclusão:** agendamento criado, motoristas inválidos filtrados, job funciona.

> **Nota:** o alerta de falha da notificação 48h antes da viagem segue a **mesma lógica**
> do alerta PENDENTE 30 dias (Sprint 1.5): implementado **provisoriamente** na fila
> `/saude/tfd` até a Sprint 1.8. Após a entrega do dashboard TFD, o destino definitivo
> dos alertas operacionais do gestor é `/saude/tfd/dashboard` (DT-002).

---

### Sprint 1.7 — Prestação de Contas
**Status:** ✅ Concluído

**Entregas:**
- [x] Server Action `registrarRetornoTfd` — EM_VIAGEM → AGUARDANDO_PC
- [x] Criação automática de `prestacao_conta` com prazo
- [x] Job de alerta 48h antes do prazo da prestação
- [x] Server Action `registrarDespesa` — lançar itens com comprovante
- [x] Validação: comprovante obrigatório para valores ≥ R$ 50
- [x] Server Action `enviarPrestacaoContas` — AGUARDANDO_PC → PC_EM_ANALISE
- [x] Server Action `registrarVisualizacaoComprovante`
- [x] Server Action `decidirPrestacaoContas` — bloquear sem ver todos comprovantes
- [x] Aprovação: consumir reserva + registrar CONSUMO + LIBERACAO se aplicável
- [x] Rejeição: volta para AGUARDANDO_PC + notifica servidor
- [x] Status final: CONCLUIDO

**Critério de conclusão:** ciclo completo — da viagem à prestação aprovada.

---

### Sprint 1.8 — Dashboard e Cancelamento
**Status:** ✅ Concluído

**Entregas:**
- [x] Dashboard TFD — KPIs, gráfico por status (CSS), alertas consolidados, últimas solicitações (`/saude/tfd/dashboard`)
- [x] Alertas no dashboard: urgentes, saldo baixo, PCs vencendo, pendentes 30 dias, lembrete viagem (destino definitivo — DT-002 encerrado)
- [x] Server Action `cancelarSolicitacaoTfd` — com liberação de reserva e notificação `PROCESSO_CANCELADO`
- [x] Validação: cancelamento bloqueado após AGENDADO
- [x] Relatório PDF por competência (`gerarRelatorioCompetenciaTfd`) — URL assinada 24h, rate limit 3/h
- [x] Relatório PDF por paciente (`gerarRelatorioPacienteTfd`) — sem dados clínicos
- [x] Audit logs Painel Dev — filtros expandidos (data, usuário, módulo, ações operacionais)

**Paridade painéis (1.8):**

| Funcionalidade | painel-dev | painel-servidor |
|---|---|---|
| `dashboard_tfd` | — | ✅ |
| `cancelar_solicitacao` | — | ✅ |
| `relatorio_competencia` | — | ✅ |
| `relatorio_paciente` | — | ✅ |
| `audit_log_filtros_expandidos` | ✅ | — |

**Adiado para Sprint 2.1 (entregue):** relatórios por prestador, motorista e produção mensal; exportações CSV (extrato, listagens); rodapé unificado §1.12.

**Fora do escopo (permanece):** exportação CSV/PDF de audit logs.

**Critério de conclusão:** dashboard operacional, cancelamento funciona, relatórios PDF básicos (competência + paciente), audit logs com filtros expandidos no Painel Dev.

---

## Débitos Técnicos

### DT-001 — Build de produção quebra sem Turbopack — `core-auth` barrel exporta módulos server-only

| Campo | Descrição |
|-------|-----------|
| **Identificador** | `DT-001` |
| **Status** | Resolvido |
| **Origem** | Identificado no fechamento da Sprint 1.2; problema pré-existente desde Sprint 0.3 |
| **Causa** | `@saude/core-auth` exporta `auth.config` e `get-tenant-context` (usam `next/headers`) no mesmo barrel; bundler puxa esses módulos para o client quando qualquer consumer importa `@saude/core-auth` via `@saude/ui` ou formulários |
| **Impacto** | `next build` clássico falha nos dois apps; painel-servidor falha também com Turbopack. Confirmado em dev: PrismaClientValidationError no edge runtime bloqueia painel-servidor. Resolve antes do staging. |
| **Resolução** | Subpaths server/client criados em `@saude/core-auth`, `@saude/core-documents` e `@saude/mod-saude-tfd`. Build clássico passa sem Turbopack. Resolvido no encerramento da Sprint 1.7. |

### DT-002 — Documentação do alerta PENDENTE 30 dias diverge do código

| Campo | Descrição |
|-------|-----------|
| **Identificador** | `DT-002` |
| **Status** | Encerrado |
| **Sprint de resolução** | 2.2 |
| **Origem** | Fechamento Sprint 1.5 |
| **Causa** | `docs/SPRINTS.md` descrevia alerta de 30 dias como "no dashboard"; implementado na fila `/saude/tfd` por decisão de escopo das sprints 1.5 e 1.6. Documentação divergia do código. |
| **Impacto** | Baixo — apenas documentação. Nenhum impacto funcional. |
| **Resolução (parcial — Sprint 1.8)** | `SPRINTS.md` (notas 1.5/1.6) e `BUSINESS_RULES.md` (§1.2.1) alinhados ao destino definitivo. Sprint 1.8 entregou `/saude/tfd/dashboard` com alertas consolidados; banners removidos da fila para gestores com `ver_dashboard`. |
| **Resolução (encerramento — Sprint 2.2)** | Bloco **Financeiro** no dashboard gestor (KPI saldo disponível consolidado, lista de saldos em alerta, extrato das últimas 5 movimentações). Notificação in-app **`SALDO_BAIXO`** na transição para alerta (&lt; 20%). Submenu **Financeiro** no sidebar TFD. `BUSINESS_RULES.md` §1.2.1 atualizado com consolidação dos alertas operacionais no dashboard. |

### DT-003 — Prisma Client local desatualizado após migrations da sprint

| Campo | Descrição |
|-------|-----------|
| **Identificador** | `DT-003` |
| **Status** | Resolvido |
| **Origem** | Fechamento Sprint 1.5 |
| **Causa** | Prisma Client em `packages/core-db` pode estar desatualizado após migrations da sprint (delegate `tfdSolicitacao` ausente localmente em alguns ambientes). |
| **Impacto** | Scripts locais e smoke RLS usam SQL raw como contorno. Build e type-check não afetados (`skipLibCheck`). Pode causar erros em dev após `git pull` sem `db:generate`. |
| **Resolução** | Script `npm run db:generate` na raiz; `turbo.json` executa `db:generate` antes de `type-check` e `build`; CI em `.github/workflows/ci.yml`; onboarding documentado no `README.md`. |

### DT-004 — Exportação municipal: módulos além de TFD sem coleta de dados

| Campo | Descrição |
|-------|-----------|
| **Identificador** | `DT-004` |
| **Status** | Aberto |
| **Origem** | Fechamento Sprint 2.1 |
| **Causa** | `exportarDadosMunicipio` (Painel Dev) coleta dados apenas do módulo `tfd`; demais módulos ativos (`regul`, `visa`, etc.) retornam aviso em `modulosSemDados` no arquivo exportado. |
| **Impacto** | Baixo — SUPERADMIN recebe exportação completa do TFD; backup de outros módulos exige sprint futura quando existirem schemas de dados. |
| **Resolução** | Implementar coletores por módulo quando cada módulo de saúde tiver modelo persistido na plataforma. |

---

## 4. FASE 2 — Paridade TFD pós-MVP

A Fase 1 entregou o fluxo ponta a ponta (solicitação → regulação → viagem → prestação → saldo/extrato).
A Fase 2 fecha **lacunas entre código e documentação** (`BUSINESS_RULES.md`, `AUTH_PERMISSIONS.md`,
`API_CONTRACTS.md`) e melhora **descoberta na UI** do financeiro TFD.

> **Fora do escopo desta fase (decisão explícita):** associação de saldo a procedimentos/especialidades
> específicas (decisão **C1**, adiada na Sprint 1.2 — avaliar em fase futura se necessário).

### Lacunas da Fase 1 mapeadas para a Fase 2

| Área | O que falta | Sprint |
|------|-------------|--------|
| Relatórios exportáveis (prestador, motorista, produção, CSV) | Entregue na 2.1 | ✅ 2.1 |
| Navegação e dashboard financeiro do gestor | Menu, KPI saldo, extrato resumido, acesso GESTOR | ✅ 2.2 |
| Regras `BUSINESS_RULES` não codificadas | — | ✅ 2.3 |
| Notificações §1.14 | Canal e-mail + retry/fallback | ✅ 2.4 |
| CADSUS produção | RNDS real | 2.5 |
| Config TFD incompleta na UI | Aba Procedimentos; inativar saldo | ✅ 2.2 |

---

### Sprint 2.1 — Relatórios e Exportação TFD
**Status:** ✅ Concluído

**Referência:** `BUSINESS_RULES.md` §1.12; fora de escopo explícito na Sprint 1.8.

**Entregas:**
- [x] Relatório por prestador (volume e gastos por hospital/clínica; sem CID/diagnóstico)
- [x] Relatório por motorista (viagens e custos no período)
- [x] Relatório de produção mensal (aprovadas, negadas, concluídas, canceladas com valores)
- [x] Extrato financeiro completo por saldo e período (visualização + exportação CSV)
- [x] `audit_logs` com `acao = EXPORT` apenas na exportação CSV do extrato (não na leitura da página)
- [x] Exportação CSV das listagens TFD prioritárias (fila, agendamentos, prestações, saldos)
- [x] Exportação de dados do município (Painel Dev — SUPERADMIN)
- [x] Rodapé PDF/CSV conforme §1.12: gerado por, data/hora, saudegov

**Paridade painéis (2.1):**

| Funcionalidade | painel-dev | painel_servidor | Permissão / notas |
|---|---|---|---|
| `relatorio_prestador` | — | ✅ | `saude.tfd.exportar_relatorio` + GESTOR |
| `relatorio_motorista` | — | ✅ | idem |
| `relatorio_producao_mensal` | — | ✅ | idem |
| `exportar_extrato_csv` | — | ✅ | `saude.tfd.gerenciar_saldo` + GESTOR |
| `export_csv_fila` | — | ✅ | `exportar_relatorio` + GESTOR |
| `export_csv_agendamentos` | — | ✅ | idem |
| `export_csv_prestacoes` | — | ✅ | idem |
| `export_csv_saldos` | — | ✅ | idem |
| `exportar_dados_municipio` | ✅ | — | SUPERADMIN (`requireSuperAdmin`) |

**Mapa de implementação (referência):**

| Entrega | Local principal |
|---------|-----------------|
| Rodapé e CSV genérico | `packages/core-documents` (`formatRodapeExport`, `gerarCsvRelatorio`, `gerarPdfRelatorio`, `salvarExportTemporario*`) |
| Relatórios PDF (prestador, motorista, produção) | `modules/saude/tfd/src/actions/relatorio.ts`, `get-relatorio-*.ts`, `validators/relatorio.schema.ts` |
| Relatórios PDF 1.8 (competência, paciente) | mesma action `relatorio.ts` |
| Painel relatórios gestor | `apps/painel-servidor/.../dashboard/components/tfd-relatorios-panel.tsx` |
| Extrato CSV | `get-extrato-completo.ts`, `exportacao.ts` → `exportarExtratoSaldoTfdCsv` |
| CSV listagens | `get-*-completo.ts`, `validators/exportacao.schema.ts`, `exportacao.ts`, `tfd-export-csv-button.tsx` |
| Exportação municipal | `apps/painel-dev/lib/actions/exportar-dados-municipio.ts`, `coletar-dados-municipio.ts` |
| Download temporário | `GET /api/storage/export-download/[exportId]` (painel-servidor e painel-dev; `fmt=csv` \| `json`) |

**Seed e verificação:**

```bash
cd packages/core-db
npm run db:seed:sprint-2-1-features
npm run db:verify:sprint-2-1-features
```

**Critério de conclusão:** gestor com `exportar_relatorio` gera relatórios e CSV com auditoria; LGPD mantida; SUPERADMIN exporta município pelo Painel Dev.

---

### Sprint 2.2 — Financeiro TFD: UX, navegação e paridade do gestor
**Status:** ✅ Concluído

**Referência:** mapa financeiro TFD; `AUTH_PERMISSIONS.md` §7.5; Sprint 1.2 (saldos) e 1.8 (dashboard).

**Entregas:**
- [x] Submenu **Financeiro** (ou itens equivalentes) em `saude-modules-nav.ts`:
  - Saldos → `/saude/tfd/configuracoes/saldos`
  - Prestações de contas → `/saude/tfd/prestacoes`
  - Relatórios → link para seção do dashboard gestor ou rota dedicada
- [x] Aba **Procedimentos** no layout `/saude/tfd/configuracoes/*` (página já existe na 1.1)
- [x] **GESTOR** com `gerenciar_saldo` acessa configuração TFD (saldos) sem exigir papel ADMIN
  - Rotas de config TFD acessíveis a GESTOR conforme permissões granulares
- [x] Server Action `desativarSaldoTfd` (ou equivalente) — saldo `ativo = false`; sem apagar extrato
- [x] Dashboard gestor — bloco **Financeiro**:
  - KPI saldo disponível consolidado (soma ou card por saldo ativo)
  - Alerta visual se algum saldo &lt; 20% (reforço além da lista em alertas)
  - Extrato resumido: últimas N movimentações (todas os saldos ou saldo principal)
- [x] Notificação in-app `SALDO_BAIXO` quando disponível &lt; 20% (`BUSINESS_RULES.md` §1.14)
- [x] Documentar em `BUSINESS_RULES.md` §1.2.1 que alertas operacionais estão no dashboard (DT-002 encerrado)

**Critério de conclusão:** gestor encontra saldo, prestações e indicadores financeiros sem URL manual; GESTOR com permissão acessa saldos.

**Não inclui:** reserva manual (proibida por regra); associação saldo × procedimento (C1).

**Paridade painéis (2.2):**

| Funcionalidade | painel-dev | painel_servidor | Permissão / notas |
|---|---|---|---|
| `nav_financeiro_tfd` | — | ✅ | Itens filtrados: `gerenciar_saldo`, `aprovar_prestacao`, `exportar_relatorio` |
| `dashboard_financeiro_tfd` | — | ✅ | `saude.tfd.ver_dashboard` + GESTOR |
| `notificacao_saldo_baixo` | — | ✅ | `saude.tfd.ver_dashboard` — evento `SALDO_BAIXO` in-app |
| `desativar_saldo` | — | ✅ | `saude.tfd.gerenciar_saldo` + GESTOR |

**Mapa de implementação (referência):**

| Entrega | Local principal |
|---------|-----------------|
| Submenu Financeiro (sidebar TFD) | `modules/saude/tfd/src/utils/tfd-financeiro-nav.ts`, `packages/ui/src/config/saude-modules-nav.ts`, `packages/ui/src/components/sidebar.tsx` |
| Config TFD — abas e GESTOR | `modules/saude/tfd/src/utils/tfd-config-nav.ts`, `apps/painel-servidor/.../configuracoes/layout.tsx` e páginas por aba |
| Inativar saldo | `desativarSaldoTfd` em `modules/saude/tfd/src/actions/configuracao.ts`, `saldo-lista.tsx` |
| Bloco Financeiro no dashboard | `get-dashboard-financeiro-tfd.ts`, `dashboard-saldos-shared.ts`, `tfd-dashboard-financeiro.tsx` |
| Notificação `SALDO_BAIXO` | `packages/core-notifications` (`SALDO_BAIXO`, template, dispatcher); `saldo-baixo-notificacao.ts`; disparo em `decisao.ts` (reserva) e `financeiro.ts` (consumo) |
| Alertas operacionais (doc) | `docs/BUSINESS_RULES.md` §1.2.1 — DT-002 encerrado |

**Seed:**

```bash
cd packages/core-db
npm run db:seed:sprint-2-2-features
# ou via seed completo: npm run db:seed (inclui Sprint 2.2 em prisma/seed.ts)
```

---

### Sprint 2.3 — Regras operacionais e automações pendentes
**Status:** ✅ Concluído

**Referência:** `BUSINESS_RULES.md` §1.5, §1.8, §1.9, §1.10.

**Entregas:**
- [x] Server Action `estornarMovimentacaoSaldoTfd` — tipo `ESTORNO`, justificativa obrigatória, `usuario_id`, imutabilidade preservada
- [x] UI no extrato do saldo (gestor + `gerenciar_saldo`) para registrar estorno com confirmação
- [x] Cancelamento de solicitação **PENDENTE há 60 dias** — motivo mínimo incluindo opção “prazo esgotado”; libera reserva se houver
- [x] Job/cron: na **data da viagem**, transição automática `AGENDADO` → `EM_VIAGEM` (por viagem/solicitação)
- [x] Validações de vedação na decisão de aprovação (§1.5):
  - [x] Bloqueio para procedimentos PAB (`eh_pab` no cadastro)
  - [x] Distância mínima 50 km (cálculo automático ou informada na decisão)
  - [x] Flags subjetivas com confirmação explícita do gestor
- [x] `platform_features` Sprint 2.3 e script de verificação

**Paridade painéis (2.3):**

| Funcionalidade | painel-dev | painel_servidor | Permissão / notas |
|---|---|---|---|
| `estornar_movimentacao_saldo` | — | ✅ | `saude.tfd.gerenciar_saldo` + GESTOR |
| `cancelar_pendente_60_dias` | — | ✅ | `saude.tfd.cancelar_processo` + GESTOR |
| `job_transicao_em_viagem` | — | ✅ | Cron `GET /api/cron/tfd-transicao-em-viagem` |
| `validacao_vedacoes_decisao` | — | ✅ | `saude.tfd.decidir_solicitacao` + GESTOR |

**Mapa de implementação (referência):**

| Entrega | Local principal |
|---------|-----------------|
| Estorno de movimentação | `estornarMovimentacaoSaldoTfd`, `utils/saldo-movimentacao.ts`, `extrato-dialog.tsx`, `estorno-movimentacao-dialog.tsx` |
| Cancelamento 60 dias | `cancelarSolicitacaoTfd`, `pendente-prazo.ts`, `get-alertas-pendente-60-dias.ts`, `cancelar-solicitacao-dialog.tsx`, dashboard alertas |
| Job EM_VIAGEM | `processar-transicao-em-viagem.ts`, `api/cron/tfd-transicao-em-viagem`, `README.md` (cron jobs) |
| Vedações na decisão | `vedacoes-tfd.ts`, `decidirSolicitacaoTfd`, `decisao-form.tsx`, `eh_pab` em procedimentos, município origem em settings |

**Seed e verificação:**

```bash
cd packages/core-db
npm run db:seed:sprint-2-3-features
npm run db:verify:sprint-2-3
```

**Critério de conclusão:** regras §1.8–§1.10 críticas executáveis no sistema; job de viagem documentado no README de cron.

---

### Sprint 2.4 — Notificações por e-mail (TFD)
**Status:** ✅ Concluído

**Referência:** `BUSINESS_RULES.md` §1.14; `core-notifications` com canais `IN_APP` e `EMAIL`.

**Entregas:**
- [x] Canal `email` em `core-notifications` com template mínimo por evento TFD e matriz evento × canal
- [x] Eventos com e-mail conforme §1.14 (solicitação, MUITO_URGENTE, complemento, aprovação/negativa, lembretes 48h, prestação enviada/rejeitada); exceções in-app apenas: `PRESTACAO_APROVADA`, `SALDO_BAIXO`, `RETORNO_REGISTRADO`, `NOTIFICACAO_EMAIL_FALHOU`
- [x] Fila/retry: falha → `status = FALHOU`; retentar após 15 min; após 3 falhas → `NOTIFICACAO_EMAIL_FALHOU` in-app ao gestor
- [x] Configuração por tenant: toggle `email_notifications_enabled`, `notification_email`, SMTP custom (`smtp_password_enc` AES-256-GCM) em `/configuracoes/municipio`
- [x] Disparo in-app `RETORNO_REGISTRADO` ao servidor responsável (viagem e agendamento)
- [x] Manter contexto sem dados sensíveis (LGPD Art. 11)

**Critério de conclusão:** eventos principais disparam in-app + e-mail em staging; falhas registradas e retentadas.

---

### Sprint 2.5 — Integração CADSUS Real
**Status:** 💡 Planejado

**Referência:** antiga Sprint 2.2; `CADSUS.md`.

**Entregas:**
- [ ] `CadsusRnds` com autenticação RNDS
- [ ] Configuração de certificado digital por município
- [ ] Ativação/desativação no Painel Dev
- [ ] Sincronização periódica de dados divergentes

**Critério de conclusão:** município com certificado consulta CNS real; stub permanece para dev sem certificado.

---

### Backlog opcional (pós-Fase 2 ou sob demanda)

| Item | Notas |
|------|--------|
| Saldo vinculado a procedimentos/especialidades (C1) | Decisão adiada na 1.2; exige modelagem e UX de alocação |
| Cache do Tenant Resolver em produção | Nota Sprint 0.3; otimização de infra |
| Storybook do design system | Critério 0.5; hoje coberto por `/design-system` |

---

## 5. Status Geral do Projeto

| Sprint | Descrição | Status |
|---|---|---|
| 0.1 | Monorepo e infraestrutura | ✅ Concluído |
| 0.2 | Schema base do banco | ✅ Concluído |
| 0.3 | Autenticação e multi-tenant | ✅ Concluído |
| 0.4 | Painel Dev — municípios | ✅ Concluído |
| 0.5 | UI base e design system | ✅ Concluído |
| 0.6 | Configuração do município | ✅ Concluído |
| 1.1 | Schema TFD e configurações | ✅ Concluído |
| 1.2 | Gestão financeira TFD | ✅ Concluído |
| 1.3 | Paciente e CADSUS stub | ✅ Concluído |
| 1.4 | Abertura de solicitação | ✅ Concluído |
| 1.5 | Regulação e decisão | ✅ Concluído |
| 1.6 | Agendamento de viagem | ✅ Concluído |
| 1.7 | Prestação de contas | ✅ Concluído |
| 1.8 | Dashboard e cancelamento | ✅ Concluído |
| 2.1 | Relatórios e exportação TFD | ✅ Concluído |
| 2.2 | Financeiro TFD — UX e paridade gestor | ✅ Concluído |
| 2.3 | Regras operacionais e automações | ✅ Concluído |
| 2.4 | Notificações e-mail TFD | ✅ Concluído |
| 2.5 | CADSUS real | 💡 Planejado |
| 3.1 | Dados clínicos, perfil do paciente e fila auditada (TFD) | ✅ Concluído |
| 3.2 | Agendamento como entidade própria (TFD) | ✅ Concluído |
| 3.3 | Transporte com múltiplos segmentos (TFD) | ✅ Concluído |
| 3.4 | Prestação de contas unificada por agendamento (TFD) | ✅ Concluído |
| 3.5 | Processo como raiz + perfil do servidor (TFD) | ✅ Concluído |
| 3.6 | Limpeza, consolidação e documentação (TFD) | ✅ Concluído |

---

## 6. Critério de Conclusão de Sprint

Uma sprint está concluída quando:
1. Todas as tasks marcadas como `[x]`
2. Código commitado e deploy funcionando em staging
3. Funcionalidades registradas em `public.platform_features`
4. Nenhum erro de TypeScript (`tsc --noEmit` passa)
5. RLS validado para as novas tabelas (teste com 2 tenants)

---

## 7. Documentos Relacionados

- `ARCHITECTURE.md` — visão técnica de como as sprints se encaixam
- `MUNICIPAL_MAP.md` — fases de implementação por módulo
- `BUSINESS_RULES.md` — regras que cada sprint deve implementar
- `DATABASE_SCHEMA.md` — schema que as migrations de cada sprint criam
