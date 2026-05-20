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
FASE 2 → Relatórios e exportação TFD
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
- [x] Configurar Cloudflare com zona `saudemunic.com.br`
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
- [x] `packages/core-auth` — Tenant Resolver com cache
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
**Status:** 📋 Planejado

**Entregas:**
- [ ] Listagem de municípios com status e módulos ativos
- [ ] Formulário de criação de município
- [ ] Integração API Cloudflare — criação automática de subdomínio
- [ ] Suporte a domínio `.gov.br` customizado com instrução clara
- [ ] Ativar/desativar módulos por município (toggle)
- [ ] Suspender município
- [ ] Criação do primeiro ADMIN do município (senha temporária)
- [ ] Página de audit logs globais
- [ ] Página de `platform_features`

**Critério de conclusão:** município criado no painel → subdomínio ativo → login funciona.

---

### Sprint 0.5 — UI Base e Design System
**Status:** 📋 Planejado

**Entregas:**
- [ ] `packages/ui` — tokens CSS em `tokens.css`
- [ ] Layout do `painel-servidor` — header, sidebar, content area
- [ ] Tema visual por tenant (CSS vars via layout.tsx)
- [ ] Componentes base: Button, Input, Select, Textarea, Card, Badge
- [ ] Componentes operacionais: StatusBadge, UrgenciaBadge, ProtocoloBadge
- [ ] DataTable com paginação
- [ ] PageHeader, EmptyState, Alert, Spinner, Dialog
- [ ] FileUpload (drag & drop, validação tipo/tamanho)
- [ ] PermissionGate
- [ ] TramitacaoTimeline

**Critério de conclusão:** Storybook ou página de exemplo com todos os componentes.

---

### Sprint 0.6 — Configuração do Município (ADMIN)
**Status:** 📋 Planejado

**Entregas:**
- [ ] CRUD de secretarias, departamentos e setores
- [ ] Definir setor responsável por módulo
- [ ] CRUD de servidores com seleção de papel
- [ ] Tela de permissões granulares (toggles por servidor)
- [ ] Configuração de tema visual (cores, logo)
- [ ] Configuração de dados do município (CNPJ, timezone, e-mail)
- [ ] Stub de configuração CADSUS (campo ativo/inativo + token)

**Critério de conclusão:** ADMIN configura o município completo sem ajuda do dev.

---

## 3. FASE 1 — MVP TFD (Fluxo Completo)

### Sprint 1.1 — Schema TFD e Configurações
**Status:** 📋 Planejado

**Entregas:**
- [ ] Migration: `saude_tfd` — especialidades, procedimentos, prestadores
- [ ] Migration: veiculos, motoristas
- [ ] Migration: saldos, reservas_saldo, movimentacoes_saldo
- [ ] Migration: solicitacoes, acompanhantes
- [ ] Migration: viagens, itens_despesa, prestacoes_conta
- [ ] RLS em todas as tabelas do módulo TFD
- [ ] CRUD especialidades (Admin)
- [ ] CRUD procedimentos (Admin)
- [ ] CRUD prestadores externos (Admin)
- [ ] CRUD veículos (Admin/Gestor)
- [ ] CRUD motoristas com alerta CNH vencendo (Admin/Gestor)
- [ ] `platform_features` populado com funcionalidades da sprint

**Critério de conclusão:** Admin configura TFD completo (especialidades, prestadores, frota).

---

### Sprint 1.2 — Gestão Financeira do TFD
**Status:** 📋 Planejado

**Entregas:**
- [ ] Cadastro de saldo financeiro (fonte, período, valor)
- [ ] Cálculo de saldo disponível (total - reservado - consumido)
- [ ] Listagem de saldos com status visual (alerta < 20%)
- [ ] Extrato de movimentações por saldo
- [ ] Registro automático de CREDITO ao criar saldo
- [ ] Tela de saldo financeiro no Painel Dev (visão SUPERADMIN)

**Critério de conclusão:** saldo cadastrado, cálculo correto, extrato visível.

---

### Sprint 1.3 — Cadastro de Paciente e CADSUS Stub
**Status:** 📋 Planejado

**Entregas:**
- [ ] `packages/validators` — validadores CPF, CNS, CNPJ, CEP
- [ ] `CadsusStub` implementado conforme `CADSUS.md`
- [ ] Factory `getCadsusService` — stub vs real por tenant
- [ ] Server Action `buscarPacientePorCns` — busca no CADSUS stub
- [ ] Server Action `vincularPaciente` — grava em `saude_base.pacientes`
- [ ] Tela de busca por CNS com preenchimento automático
- [ ] Validação de divergência CPF ≠ CNS
- [ ] Audit log de toda consulta ao CADSUS

**Critério de conclusão:** busca CNS retorna dados, paciente gravado no banco local.

---

### Sprint 1.4 — Abertura de Solicitação TFD
**Status:** 📋 Planejado

**Entregas:**
- [ ] Formulário de nova solicitação (multi-step ou seções)
- [ ] Server Action `abrirSolicitacaoTfd` — cria RASCUNHO
- [ ] Validação: RETORNO exige `solicitacaoOrigemId`
- [ ] Validação: CPF acompanhante ≠ CPF paciente
- [ ] Upload de laudo médico (PDF/JPEG/PNG, 10MB)
- [ ] Server Action `enviarSolicitacaoTfd` — RASCUNHO → ENVIADO
- [ ] Geração de protocolo `2025-SAUDE-TFD-000001`
- [ ] Notificação para gestor + servidores do setor
- [ ] Notificação extra para `MUITO_URGENTE`
- [ ] Listagem de solicitações com filtros e paginação

**Critério de conclusão:** fluxo completo de abertura → envio → aparece na fila.

---

### Sprint 1.5 — Regulação e Decisão
**Status:** 📋 Planejado

**Entregas:**
- [ ] Server Action `iniciarAnaliseTfd` — ENVIADO → EM_ANALISE
- [ ] Tela de detalhe com dados clínicos (permissão `analisar_laudo`)
- [ ] URL pré-assinada 15min para visualização do laudo
- [ ] Server Action `solicitarComplementoTfd` — EM_ANALISE → PENDENTE
- [ ] Server Action `decidirSolicitacaoTfd` — APROVADO/NEGADO
- [ ] Verificação atômica de saldo na aprovação (SELECT FOR UPDATE)
- [ ] Criação automática de `reserva_saldo` na aprovação
- [ ] Registro de `movimentacao_saldo` tipo RESERVA
- [ ] Notificações de decisão com fundamentação
- [ ] Alerta PENDENTE há 30 dias no dashboard
- [ ] Audit log de toda decisão

**Critério de conclusão:** aprovação/negativa funciona, saldo reservado automaticamente.

---

### Sprint 1.6 — Agendamento de Viagem
**Status:** 📋 Planejado

**Entregas:**
- [ ] Server Action `criarAgendamentoTfd` — APROVADO → AGENDADO
- [ ] Validação: data mínima 72h no futuro
- [ ] Filtro automático: motoristas com CNH válida na data da viagem
- [ ] Seleção de veículo com verificação de capacidade
- [ ] Job de notificação 48h antes da viagem
- [ ] Alerta no dashboard quando notificação falha
- [ ] Suporte a múltiplas viagens por solicitação (sequencia 1, 2, 3...)
- [ ] Listagem de agendamentos com filtro por data

**Critério de conclusão:** agendamento criado, motoristas inválidos filtrados, job funciona.

---

### Sprint 1.7 — Prestação de Contas
**Status:** 📋 Planejado

**Entregas:**
- [ ] Server Action `registrarRetornoTfd` — EM_VIAGEM → AGUARDANDO_PC
- [ ] Criação automática de `prestacao_conta` com prazo
- [ ] Job de alerta 48h antes do prazo da prestação
- [ ] Server Action `registrarDespesa` — lançar itens com comprovante
- [ ] Validação: comprovante obrigatório para valores ≥ R$ 50
- [ ] Server Action `enviarPrestacaoContas` — AGUARDANDO_PC → PC_EM_ANALISE
- [ ] Server Action `registrarVisualizacaoComprovante`
- [ ] Server Action `decidirPrestacaoContas` — bloquear sem ver todos comprovantes
- [ ] Aprovação: consumir reserva + registrar CONSUMO + LIBERACAO se aplicável
- [ ] Rejeição: volta para AGUARDANDO_PC + notifica servidor
- [ ] Status final: CONCLUIDO

**Critério de conclusão:** ciclo completo — da viagem à prestação aprovada.

---

### Sprint 1.8 — Dashboard e Cancelamento
**Status:** 📋 Planejado

**Entregas:**
- [ ] Dashboard TFD — KPIs, gráficos, alertas operacionais
- [ ] Alertas: urgentes, saldo baixo, PCs vencendo
- [ ] Server Action `cancelarSolicitacaoTfd` — com liberação de reserva
- [ ] Validação: cancelamento bloqueado após AGENDADO
- [ ] Relatório básico por competência (PDF)
- [ ] Relatório por paciente (sem dados clínicos)
- [ ] Audit log completo da plataforma

**Critério de conclusão:** dashboard operacional, cancelamento funciona, relatório básico.

---

## 4. FASE 2 — Relatórios e Exportação

### Sprint 2.1 — Relatórios Completos TFD
**Status:** 💡 Planejado

**Entregas:**
- [ ] Relatório por prestador
- [ ] Relatório por motorista
- [ ] Extrato financeiro completo
- [ ] Relatório de produção mensal
- [ ] Exportação CSV de qualquer listagem
- [ ] Exportação de dados do município (Painel Dev)

---

### Sprint 2.2 — Integração CADSUS Real
**Status:** 💡 Planejado

**Entregas:**
- [ ] `CadsusRnds` com autenticação RNDS
- [ ] Configuração de certificado digital por município
- [ ] Ativação/desativação no Painel Dev
- [ ] Sincronização periódica de dados divergentes

---

## 5. Status Geral do Projeto

| Sprint | Descrição | Status |
|---|---|---|
| 0.1 | Monorepo e infraestrutura | ✅ Concluído |
| 0.2 | Schema base do banco | ✅ Concluído |
| 0.3 | Autenticação e multi-tenant | ✅ Concluído |
| 0.4 | Painel Dev — municípios | 📋 Planejado |
| 0.5 | UI base e design system | 📋 Planejado |
| 0.6 | Configuração do município | 📋 Planejado |
| 1.1 | Schema TFD e configurações | 📋 Planejado |
| 1.2 | Gestão financeira TFD | 📋 Planejado |
| 1.3 | Paciente e CADSUS stub | 📋 Planejado |
| 1.4 | Abertura de solicitação | 📋 Planejado |
| 1.5 | Regulação e decisão | 📋 Planejado |
| 1.6 | Agendamento de viagem | 📋 Planejado |
| 1.7 | Prestação de contas | 📋 Planejado |
| 1.8 | Dashboard e cancelamento | 📋 Planejado |
| 2.1 | Relatórios completos | 💡 Planejado |
| 2.2 | CADSUS real | 💡 Planejado |

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
