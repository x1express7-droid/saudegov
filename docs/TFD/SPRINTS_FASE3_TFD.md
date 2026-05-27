# SPRINTS_FASE3_TFD.md
# saudegov — Fase 3: Reestruturação do Módulo TFD

> **Instruções para o agente do Cursor:** Este arquivo documenta a Fase 3 do projeto,
> que reestrutura o módulo TFD para o modelo correto de hierarquia de entidades.
> Leia `docs/TFD_REESTRUTURACAO_PLANEJAMENTO.md` antes de qualquer implementação —
> ele contém o diagnóstico completo, decisões de arquitetura e o mapa de mudanças
> no banco. Nunca implemente funcionalidades de sprints futuras sem concluir a atual.
> Ao concluir uma tarefa, registre em `public.platform_features`.

---

## Contexto da Fase 3

A Fase 1 entregou o fluxo TFD ponta a ponta. A Fase 2 fechou lacunas de regras e UX.
A **Fase 3 corrige a hierarquia de entidades** — o modelo atual trata `TfdSolicitacao`
como objeto raiz, quando o correto é:

```
Processo → Solicitação → Agendamento → Transporte (segmentos) → Prestação de Contas
```

**Princípio desta fase:** toda mudança é aditiva ou substitutiva controlada.
O sistema nunca fica inoperante entre sprints. Dados existentes são migrados, não perdidos.

**Referência obrigatória antes de qualquer implementação:**
- `docs/TFD_REESTRUTURACAO_PLANEJAMENTO.md` — planejamento técnico completo
- `docs/BUSINESS_RULES.md` — regras de negócio (Portaria SAS/MS 55/1999)
- `docs/AUTH_PERMISSIONS.md` — permissões das novas entidades
- `docs/SKILL_DB_MIGRATION.md` — padrão de migrations
- `docs/SKILL_API_ROUTE.md` — padrão de Server Actions

---

## 5. FASE 3 — Reestruturação TFD

### Lacunas da Fase 2 endereçadas nesta fase

| Área | Problema atual | Sprint |
|------|---------------|--------|
| Hierarquia de entidades | Solicitação age como raiz; sem Processo real com dados clínicos | 3.1 |
| Dados clínicos (SOAP) | Subjetivo, objetivo, avaliação, plano, motivo sem entidade | 3.1 |
| Perfil do paciente | Lista básica; sem histórico de processos, sem dados completos | 3.1 |
| Fila auditada | Sem posição formal; sem histórico de movimentação justificada | 3.1 |
| Agendamento como entidade | Embutido em `TfdViagem`; sem separação de "marcar consulta" e "transporte" | 3.2 |
| Transporte multi-segmento | 1 veículo + 1 motorista por viagem; impossível registrar carro + avião | 3.3 |
| Prestação de contas unificada | `UNIQUE viagem_id` quebra com múltiplos segmentos | 3.4 |
| Múltiplas solicitações por processo | UI trata como 1:1; banco já suporta N:1 | 3.5 |
| Perfil do servidor | Não existe como tela | 3.5 |

---

### Sprint 3.1 — Fundação: Dados Clínicos, Perfil do Paciente e Fila Auditada
**Status:** ✅ Concluído

**Referência:** `TFD_REESTRUTURACAO_PLANEJAMENTO.md` §2, §3, §4.1; `BUSINESS_RULES.md` §1.1–§1.4; `AUTH_PERMISSIONS.md` §3.1.

**Por que começar aqui:** apenas adições ao banco e novas telas — zero risco de quebrar o fluxo existente. Entrega valor imediato (dados clínicos + histórico do paciente) e instala a fundação da fila para o futuro portal do cidadão.

#### Banco (migrations)

- [x] `saude_tfd.processo_dados_clinicos` — dados SOAP por processo (UNIQUE `processo_id`); RLS obrigatório
- [x] Colunas em `saude_base.pacientes` (todas nullable): `email`, `telefone_celular`, `nome_social`, `raca_cor` (ENUM), `nacionalidade`, `identidade_genero`, `responsavel_legal_nome`, `responsavel_legal_cpf`
- [x] Coluna `paciente_id UUID NULL` em `public.processos` (FK para `saude_base.pacientes`)
- [x] Colunas em `saude_tfd.solicitacoes` (todas nullable): `posicao_fila INT`, `modalidade_tfd` (ENUM: `INTERMUNICIPAL`, `INTERESTADUAL`), `medico_solicitante_nome VARCHAR(200)`, `medico_crm VARCHAR(20)`, `medico_uf_conselho CHAR(2)`, `cid_secundario VARCHAR(10)`, `cid_causas_associadas VARCHAR(10)`
- [x] Enum `saude_tfd.fila_movimentacao_tipo`: `ENTRADA`, `SAIDA`, `AVANCO`, `RECUO`, `PRIORIDADE`
- [x] `saude_tfd.fila_movimentacoes` — histórico imutável (sem `updated_at`); campos: `solicitacao_id`, `posicao_anterior INT NULL`, `posicao_nova INT NULL`, `tipo_movimentacao`, `justificativa TEXT`, `usuario_id`, `created_at`; RLS obrigatório

#### Backend (`modules/saude/tfd`)

**Validators:**
- [x] `processo-dados-clinicos.schema.ts` — schema Zod para SOAP (todos os campos opcionais individualmente, mas ao menos 1 obrigatório para salvar)
- [x] Atualizar `paciente.schema.ts` — campos novos todos opcionais
- [x] `fila-movimentacao.schema.ts` — schema para `moverPacienteNaFila` (justificativa mínimo 20 chars para AVANCO/RECUO/PRIORIDADE)

**Queries:**
- [x] `get-dados-clinicos-processo.ts` — por `processo_id`; sem dados sensíveis em listagens
- [x] `get-perfil-paciente-tfd.ts` — dados cadastrais + histórico de processos TFD paginado (sem CID/diagnóstico na listagem, conforme `BUSINESS_RULES.md` §1.11)
- [x] `get-historico-fila-solicitacao.ts` — movimentações da fila de uma solicitação

**Actions:**
- [x] `salvarDadosClinicosTfd` em `actions/processo.ts` — criar ou atualizar SOAP; permissão `saude.tfd.registrar_dados_clinicos` (SERVIDOR); audit log obrigatório
- [x] `atualizarPacienteCompletoTfd` em `actions/paciente.ts` — campos novos; permissão `saude.tfd.abrir_solicitacao` (SERVIDOR); revalida `/saude/tfd/pacientes`
- [x] `moverPacienteNaFila` em `actions/fila.ts` — altera `posicao_fila` na solicitação e registra em `fila_movimentacoes`; permissão `saude.tfd.mover_fila` (GESTOR); justificativa obrigatória para AVANCO/RECUO/PRIORIDADE; audit log obrigatório
- [x] Atualizar `abrirSolicitacaoTfd` — preencher `posicao_fila` automaticamente na criação (última posição = `MAX(posicao_fila) + 1` no tenant) e registrar `ENTRADA` em `fila_movimentacoes`
- [x] Atualizar `cancelarSolicitacaoTfd` e `decidirSolicitacaoTfd` (APROVADO/NEGADO) — registrar `SAIDA` em `fila_movimentacoes` e limpar `posicao_fila`

**Permissões (`permissions.ts`):**
- [x] `saude.tfd.registrar_dados_clinicos` — SERVIDOR — preencher SOAP do processo
- [x] `saude.tfd.mover_fila` — GESTOR — alterar posição com justificativa
- [x] `saude.tfd.ver_perfil_paciente` — SERVIDOR — perfil completo com histórico

#### Frontend (`apps/painel-servidor`)

**Perfil do Paciente `/saude/tfd/pacientes/[id]`:**
- [x] Aba **Dados cadastrais** — formulário com todos os campos (existentes + novos); `PermissionGate abrir_solicitacao` para edição
- [x] Aba **Processos TFD** — lista paginada: protocolo, status, especialidade, prestador, datas; cada linha com link para `/saude/tfd/[processoId]`; sem CID/diagnóstico
- [x] Aba **Agendamentos** — lista com data, status, prestador
- [x] Aba **Fila** — histórico de movimentações com data, tipo, posição anterior/nova, usuário, justificativa

**Dados Clínicos (seção no processo):**
- [x] Seção "Dados Clínicos" na tela do processo (`/saude/tfd/[id]`) — formulário colapsável com campos Subjetivo, Objetivo, Avaliação, Plano, Motivo/Quadro, Observação; `PermissionGate registrar_dados_clinicos`; salva via `salvarDadosClinicosTfd`; exibe "Não preenchido" quando vazio

**Fila:**
- [x] Coluna "Posição" na listagem de solicitações `/saude/tfd` — exibida como `#N` quando na fila; `PermissionGate mover_fila` para ação de mover
- [x] Dialog "Mover na fila" — campo de nova posição + justificativa obrigatória; chamado via `moverPacienteNaFila`

**Formulário de paciente (nova solicitação):**
- [x] Expandir seção de identificação do paciente com campos novos (nome social, telefone celular, e-mail) — todos opcionais na UI

#### Registro em `platform_features`

| funcionalidade | painel_dev | painel_servidor | permissao_chave | sprint |
|---|---|---|---|---|
| `schema_tfd_dados_clinicos` | false | false | — | 3.1 |
| `schema_tfd_fila_movimentacoes` | false | false | — | 3.1 |
| `registrar_dados_clinicos` | false | true | `saude.tfd.registrar_dados_clinicos` | 3.1 |
| `perfil_paciente_tfd` | false | true | `saude.tfd.ver_perfil_paciente` | 3.1 |
| `mover_paciente_fila` | false | true | `saude.tfd.mover_fila` | 3.1 |
| `posicao_fila_solicitacao` | false | true | — | 3.1 |

**Paridade painéis (3.1):**

| Funcionalidade | painel-dev | painel-servidor | Notas |
|---|---|---|---|
| `registrar_dados_clinicos` | — | ✅ | Dados clínicos são municipais; sem equivalente no painel-dev |
| `perfil_paciente_tfd` | — | ✅ | LGPD §1.11 — dados de saúde sem acesso SUPERADMIN direto |
| `mover_paciente_fila` | — | ✅ | Operação municipal |

**Mapa de implementação (referência):**

| Entrega | Local principal |
|---------|----------------|
| Migrations SOAP + fila | `packages/core-db/prisma/migrations/` |
| Validators novos | `modules/saude/tfd/src/validators/` |
| Actions processo/fila | `modules/saude/tfd/src/actions/processo.ts`, `actions/fila.ts` |
| Queries perfil | `modules/saude/tfd/src/queries/get-perfil-paciente-tfd.ts`, `get-dados-clinicos-processo.ts`, `get-historico-fila-solicitacao.ts` |
| Permissões | `modules/saude/tfd/src/permissions.ts` |
| Perfil paciente | `apps/painel-servidor/app/(servidor)/saude/tfd/pacientes/[id]/` |
| Seção dados clínicos | `apps/painel-servidor/app/(servidor)/saude/tfd/[id]/components/dados-clinicos-section.tsx` |
| Posição fila na listagem | `apps/painel-servidor/app/(servidor)/saude/tfd/components/solicitacao-lista.tsx` |

**Seed e verificação:**

```bash
cd packages/core-db
npx prisma migrate dev --name "sprint_3_1_dados_clinicos_fila_paciente"
npx prisma generate
npm run db:seed:sprint-3-1-features
npm run db:verify:sprint-3-1
```

**Critério de conclusão:**
- Servidor preenche SOAP de um processo e os dados persistem corretamente
- Perfil do paciente exibe histórico de processos sem dados clínicos sensíveis
- Nova solicitação registra `posicao_fila` e entrada em `fila_movimentacoes`
- Gestor com `mover_fila` altera posição; histórico registrado com justificativa
- RLS validado: tenant A não vê dados do tenant B nas novas tabelas
- `tsc --noEmit` passa sem erros

---

### Sprint 3.2 — Agendamento como Entidade Própria
**Status:** ✅ Concluído

**Referência:** `TFD_REESTRUTURACAO_PLANEJAMENTO.md` §2.1, §3.3, §4.1; `BUSINESS_RULES.md` §1.6, §1.10; `AUTH_PERMISSIONS.md` §7.4.

**Depende de:** Sprint 3.1 concluída.

**Por que esta ordem:** separar "marcar consulta" de "logística de transporte" é o pré-requisito para os segmentos de transporte da Sprint 3.3. O agendamento precisa existir como entidade antes de ter transportes filhos.

#### Banco (migrations)

- [x] Enum `saude_tfd.agendamento_status`: `AGENDADO`, `EM_VIAGEM`, `REALIZADO`, `CANCELADO`
- [x] Tabela `saude_tfd.agendamentos` — campos: `id`, `tenant_id`, `processo_id` (FK processos), `solicitacao_id` (FK solicitacoes), `sequencia INT DEFAULT 1`, `data_consulta DATE NOT NULL`, `hora_consulta TIME NULL`, `prestador_id` (FK prestadores), `profissional_nome VARCHAR(200) NULL`, `tipo_atendimento` (enum existente), `acompanhante_id` (FK acompanhantes NULL), `orientacoes TEXT NULL`, `status agendamento_status DEFAULT 'AGENDADO'`, `realizado_at TIMESTAMPTZ NULL`, `cancelado_at TIMESTAMPTZ NULL`, `motivo_cancelamento TEXT NULL`, `cancelado_por_id UUID NULL` (FK users), `created_at`, `updated_at`; RLS obrigatório
- [x] Coluna `agendamento_id UUID NULL` em `saude_tfd.prestacoes_conta` (FK agendamentos; manter `viagem_id` intacto)
- [x] Script de migração de dados: `saude_tfd.viagens` existentes → `saude_tfd.agendamentos` (mapeamento 1:1 para dados existentes)

#### Backend (`modules/saude/tfd`)

**Validators:**
- [x] `agendamento-novo.schema.ts` — `processoId`, `solicitacaoId`, `dataConsulta` (≥ 72h), `horaConsulta?`, `prestadorId`, `profissionalNome?`, `tipoAtendimento`, `acompanhanteId?`, `orientacoes?`

**Queries:**
- [x] `get-agendamentos-por-processo.ts` — todos os agendamentos de um processo com status e sequência
- [x] `get-agendamento-detalhe.ts` — agendamento completo: dados, acompanhante, status, transportes (lista vazia inicialmente), link para prestação
- [x] Atualizar `get-agendamentos.ts` — usar nova tabela `agendamentos`

**Actions:**
- [x] `criarAgendamentoTfd` em `actions/agendamento.ts` — APROVADO → AGENDADO; valida 72h mínimo; permissão `saude.tfd.criar_agendamento` (SERVIDOR); registra tramitação `AGENDAMENTO`; notificação 48h antes (job); audit log
- [x] `registrarRetornoAgendamento` — `EM_VIAGEM` → `REALIZADO`; cria `prestacao_conta` com `agendamento_id`; prazo `data_consulta + 10 dias`; permissão `saude.tfd.registrar_retorno` (SERVIDOR)
- [x] `cancelarAgendamento` — antes de `EM_VIAGEM` apenas; `motivo_cancelamento` ≥ 20 chars; permissão `saude.tfd.cancelar_processo` (GESTOR); registra tramitação

**Jobs:**
- [x] `processar-transicao-em-viagem.ts` — atualizar para usar `saude_tfd.agendamentos` (além de / em vez de `viagens`); `AGENDADO` → `EM_VIAGEM` na `data_consulta`; rota `GET /api/cron/tfd-transicao-agendamento`

**Permissões (`permissions.ts`):**
- [x] `saude.tfd.criar_agendamento` — SERVIDOR

#### Frontend (`apps/painel-servidor`)

- [x] Rota `/saude/tfd/processos/[id]/agendamentos/novo` — formulário: data, hora, prestador (select), profissional, tipo atendimento, acompanhante (select se houver), orientações; validação 72h visível na UI; feedback de data inválida
- [x] Rota `/saude/tfd/processos/[id]/agendamentos/[agId]` — detalhe do agendamento:
  - Header com protocolo, status badge (AGENDADO / EM_VIAGEM / REALIZADO / CANCELADO) e urgência
  - Card de dados: data/hora, prestador, profissional, tipo atendimento, acompanhante, orientações
  - Seção "Transportes" — lista vazia com call-to-action "Adicionar segmento de transporte" (Sprint 3.3)
  - Seção "Prestação de Contas" — link ou "Aguardando retorno" conforme status
  - Ações: "Registrar retorno" (EM_VIAGEM → REALIZADO), "Cancelar agendamento" (com dialog e motivo); `PermissionGate` por ação
- [x] Atualizar `/saude/tfd/agendamentos` — usar nova entidade; filtros por data, status, prestador
- [x] Aba "Agendamentos" no perfil do processo — lista com botão "Novo Agendamento" visível apenas quando há solicitação APROVADA no processo; `PermissionGate criar_agendamento`

#### Registro em `platform_features`

| funcionalidade | painel_dev | painel_servidor | permissao_chave | sprint |
|---|---|---|---|---|
| `schema_tfd_agendamentos` | false | false | — | 3.2 |
| `criar_agendamento_entidade` | false | true | `saude.tfd.criar_agendamento` | 3.2 |
| `detalhe_agendamento` | false | true | — | 3.2 |
| `registrar_retorno_agendamento` | false | true | `saude.tfd.registrar_retorno` | 3.2 |
| `cancelar_agendamento` | false | true | `saude.tfd.cancelar_processo` | 3.2 |
| `job_transicao_agendamento_em_viagem` | false | false | — | 3.2 |

**Mapa de implementação (referência):**

| Entrega | Local principal |
|---------|----------------|
| Migration agendamentos | `packages/core-db/prisma/migrations/` |
| Script migração dados viagens→agendamentos | `packages/core-db/prisma/migrations/[ts]_migrate_viagens_to_agendamentos/` |
| Validator novo | `modules/saude/tfd/src/validators/agendamento-novo.schema.ts` |
| Actions agendamento | `modules/saude/tfd/src/actions/agendamento.ts` |
| Queries agendamento | `modules/saude/tfd/src/queries/get-agendamento-detalhe.ts`, `get-agendamentos-por-processo.ts` |
| Job EM_VIAGEM atualizado | `modules/saude/tfd/src/jobs/processar-transicao-em-viagem.ts` |
| Rota novo agendamento | `apps/painel-servidor/app/(servidor)/saude/tfd/processos/[id]/agendamentos/novo/` |
| Rota detalhe agendamento | `apps/painel-servidor/app/(servidor)/saude/tfd/processos/[id]/agendamentos/[agId]/` |

**Fase híbrida (implementação):** agendamentos novos são criados por `criarAgendamentoNovo`; agendamentos legados foram migrados 1:1 de `viagens` na migration `sprint_3_2`.

**Seed:**

```bash
cd packages/core-db
npm run db:seed:sprint-3-2-features
```

**Critério de conclusão:**
- Agendamento criado com validação 72h funcionando
- Job `EM_VIAGEM` atualizado processa `agendamentos` corretamente
- Detalhe do agendamento acessível com status correto e ações disponíveis
- Dados migrados de `viagens` para `agendamentos` sem perda
- RLS validado nas novas tabelas
- `tsc --noEmit` passa sem erros

---

### Sprint 3.3 — Transporte com Múltiplos Segmentos
**Status:** ✅ Concluído

**Referência:** `TFD_REESTRUTURACAO_PLANEJAMENTO.md` §2.1, §3, §4.1; `BUSINESS_RULES.md` §1.6, §1.7.

**Depende de:** Sprint 3.2 concluída.

#### Banco (migrations)

- [x] Enum `saude_tfd.tipo_segmento_transporte`: `TERRESTRE_PROPRIO`, `TERRESTRE_TERCEIRO`, `AEREO`, `FLUVIAL`, `OUTRO`
- [x] Enum `saude_tfd.transporte_status`: `PENDENTE`, `CONFIRMADO`, `EM_TRANSITO`, `CONCLUIDO`, `CANCELADO`
- [x] Tabela `saude_tfd.transportes` — campos: `id`, `tenant_id`, `agendamento_id` (FK agendamentos), `sequencia INT DEFAULT 1`, `tipo_segmento`, `veiculo_id UUID NULL` (FK veiculos — apenas TERRESTRE_PROPRIO), `motorista_id UUID NULL` (FK motoristas — apenas TERRESTRE_PROPRIO), `km_saida INT NULL`, `km_chegada INT NULL`, `origem_descricao VARCHAR(300) NOT NULL`, `destino_descricao VARCHAR(300) NOT NULL`, `data_saida DATE NOT NULL`, `hora_saida TIME NULL`, `data_chegada DATE NULL`, `hora_chegada TIME NULL`, `custo_estimado DECIMAL(10,2) NULL`, `custo_real DECIMAL(10,2) NULL`, `responsavel_pagamento` (enum existente), `status transporte_status DEFAULT 'PENDENTE'`, `observacoes TEXT NULL`, `created_at`, `updated_at`; RLS obrigatório
- [x] Tabela `saude_tfd.transporte_anexos` — campos: `id`, `tenant_id`, `transporte_id` (FK transportes), `anexo_id` (FK public.anexos), `tipo_anexo VARCHAR(50)` (`PASSAGEM`, `NOTA_COMBUSTIVEL`, `NOTA_ALIMENTACAO`, `OUTRO`), `created_at`; sem `updated_at` (imutável); RLS obrigatório
- [x] Coluna `transporte_id UUID NULL` em `saude_tfd.itens_despesa` (FK transportes; manter `viagem_id` intacto)
- [x] Job: `CONFIRMADO → EM_TRANSITO` automático na `hora_saida` — rota `GET /api/cron/tfd-transicao-transporte`

#### Backend (`modules/saude/tfd`)

**Validators:**
- [x] `transporte.schema.ts` — `criarSegmentoTransporteSchema`: `agendamentoId`, `tipoSegmento`, campos condicionais (veiculo/motorista/km só para TERRESTRE_PROPRIO), origem, destino, dataSaida, horaSaida?, dataChegada?, horaChegada?, custoEstimado?, responsavelPagamento?
- [x] `confirmarTransporteSchema`, `registrarChegadaTransporteSchema`, `cancelarTransporteSchema`

**Queries:**
- [x] `get-transportes-por-agendamento.ts` — todos os segmentos de um agendamento com status, tipo e custo
- [x] `get-transporte-detalhe.ts` — segmento completo: dados, anexos, itens de despesa

**Actions:**
- [x] `criarSegmentoTransporte` em `actions/transporte.ts` — valida CNH válida na data para TERRESTRE_PROPRIO; valida capacidade veículo; permissão `saude.tfd.gerenciar_transporte` (SERVIDOR); audit log
- [x] `confirmarTransporte` — `PENDENTE → CONFIRMADO`; passagem emitida / veículo reservado; permissão `saude.tfd.gerenciar_transporte`
- [x] `registrarChegadaTransporte` — `EM_TRANSITO → CONCLUIDO`; registra `km_chegada` e `data_chegada`/`hora_chegada`; permissão `saude.tfd.gerenciar_transporte`
- [x] `cancelarTransporte` — antes de `EM_TRANSITO`; motivo obrigatório; permissão `saude.tfd.gerenciar_transporte`
- [x] `adicionarAnexoTransporte` — anexa arquivo ao segmento; vincula `Anexo` criado ao `transporte_anexos`; permissão `saude.tfd.gerenciar_transporte`

**Jobs:**
- [x] `processar-transicao-transporte.ts` — `CONFIRMADO → EM_TRANSITO` na `hora_saida`; rota `GET /api/cron/tfd-transicao-transporte`

**Permissões (`permissions.ts`):**
- [x] `saude.tfd.gerenciar_transporte` — SERVIDOR

#### Frontend (`apps/painel-servidor`)

- [x] Rota `/saude/tfd/processos/[id]/agendamentos/[agId]/transporte/novo` — formulário de segmento:
  - Seletor de tipo (TERRESTRE_PROPRIO / TERRESTRE_TERCEIRO / AEREO / FLUVIAL / OUTRO) com ícone visual por tipo
  - Campos condicionais: se TERRESTRE_PROPRIO → select veículo + select motorista + km saída; demais → apenas descrição + upload passagem/nota
  - Origem e destino: texto livre + atalho para prestadores cadastrados
  - Data/hora saída e chegada (chegada opcional no momento)
  - Custo estimado + responsável pagamento
- [x] Seção "Transportes" no detalhe do agendamento:
  - Lista de segmentos em ordem de sequência com status badge por tipo e status
  - Visualização da rota completa como linha do tempo (ex: Campo Grande 🚗 → São Paulo ✈ → Rio de Janeiro)
  - Ações por segmento: confirmar, registrar chegada, cancelar, adicionar anexo; cada uma com `PermissionGate gerenciar_transporte`
  - Botão "Adicionar segmento" ao final da lista
- [x] Tela de detalhe do segmento (dentro do detalhe do agendamento ou modal):
  - Dados completos: origem/destino, datas, veículo/motorista (se aplicável), km, custos, anexos
  - Ações disponíveis conforme status

#### Registro em `platform_features`

| funcionalidade | painel_dev | painel_servidor | permissao_chave | sprint |
|---|---|---|---|---|
| `schema_tfd_transportes` | false | false | — | 3.3 |
| `schema_tfd_transporte_anexos` | false | false | — | 3.3 |
| `criar_segmento_transporte` | false | true | `saude.tfd.gerenciar_transporte` | 3.3 |
| `confirmar_transporte` | false | true | `saude.tfd.gerenciar_transporte` | 3.3 |
| `registrar_chegada_transporte` | false | true | `saude.tfd.gerenciar_transporte` | 3.3 |
| `cancelar_transporte` | false | true | `saude.tfd.gerenciar_transporte` | 3.3 |
| `anexo_segmento_transporte` | false | true | `saude.tfd.gerenciar_transporte` | 3.3 |
| `job_transicao_transporte_em_transito` | false | false | — | 3.3 |
| `visualizacao_rota_completa` | false | true | — | 3.3 |

**Seed:**

```bash
cd packages/core-db
npm run db:seed:sprint-3-3-features
```

**Critério de conclusão:**
- Agendamento com 2 segmentos (ex: carro + avião) funciona com status independentes
- Job `EM_TRANSITO` processa segmentos confirmados na hora de saída
- Upload de passagem vinculado corretamente ao segmento
- RLS validado nas novas tabelas
- `tsc --noEmit` passa sem erros

---

### Sprint 3.4 — Prestação de Contas Unificada por Agendamento
**Status:** ✅ Concluído

**Referência:** `TFD_REESTRUTURACAO_PLANEJAMENTO.md` §2.1, §4.2; `BUSINESS_RULES.md` §1.7.

**Depende de:** Sprint 3.3 concluída.

#### Banco (migrations)

- [x] Migração de dados: popular `agendamento_id` em `saude_tfd.prestacoes_conta` a partir da relação `viagem_id → viagem.solicitacao_id → agendamento.solicitacao_id`
- [x] Remover constraint `UNIQUE viagem_id` de `saude_tfd.prestacoes_conta` → adicionar `UNIQUE agendamento_id`
- [x] Migração de dados: popular `transporte_id` em `saude_tfd.itens_despesa` (via `viagem_id → agendamento → transporte` para dados existentes)

#### Backend (`modules/saude/tfd`)

**Refatorações:**
- [x] `registrarDespesa` — aceitar `transporte_id` em vez de `viagem_id`; manter `viagem_id` como deprecated com `console.warn` para rastreabilidade
- [x] `enviarPrestacaoContas` — operar por `agendamento_id`; agrupa itens de todos os segmentos de transporte do agendamento
- [x] `decidirPrestacaoContas` — aprovar/rejeitar PC do agendamento inteiro; ao aprovar: consumir reserva + registrar CONSUMO + LIBERACAO se valor real < estimado + status `CONCLUIDO` no processo; ao rejeitar: volta `AGUARDANDO_PC` no agendamento + notifica servidor

**Queries:**
- [x] `get-prestacao-detalhe-agendamento.ts` — PC completa: itens agrupados por segmento de transporte, comprovantes, status, prazo, valores totais
- [x] `get-extrato-por-agendamento.ts` — todos os custos de um agendamento (todos os segmentos) com total

#### Frontend (`apps/painel-servidor`)

- [x] Rota `/saude/tfd/processos/[id]/agendamentos/[agId]/prestacao` — tela de prestação de contas:
  - Resumo financeiro: total estimado vs. total real por segmento de transporte
  - Lançamento de despesas por segmento (tipo, valor, comprovante)
  - Despesas extras (ALIMENTACAO, HOSPEDAGEM, OUTRO) sem vínculo a segmento específico
  - Botão "Enviar Prestação" com validação (≥ 1 despesa lançada)
  - Painel de aprovação do gestor: lista de comprovantes com botão visualizar; botão "Aprovar" bloqueado até todos visualizados; campo de observação para rejeição; `PermissionGate aprovar_prestacao`

#### Registro em `platform_features`

| funcionalidade | painel_dev | painel_servidor | permissao_chave | sprint |
|---|---|---|---|---|
| `prestacao_unificada_agendamento` | false | true | `saude.tfd.enviar_prestacao` | 3.4 |
| `despesa_por_segmento_transporte` | false | true | `saude.tfd.registrar_despesa` | 3.4 |
| `extrato_por_agendamento` | false | true | `saude.tfd.gerenciar_saldo` | 3.4 |

**Nota (aprovação por agendamento):** aprovação de PC por agendamento usa `decidirPrestacaoContasAgendamento` e `registrarVisualizacaoComprovanteAgendamento` — o fluxo legado por viagem (`decidirPrestacaoContas` / `registrarVisualizacaoComprovante`) permanece inalterado.

**Seed:**

```bash
cd packages/core-db
npm run db:seed:sprint-3-4-features
```

**Critério de conclusão:**
- PC unificada por agendamento mostra custos de todos os segmentos
- Aprovação consome reserva e conclui o processo corretamente
- Rejeição volta status e notifica servidor
- `tsc --noEmit` passa sem erros

---

### Sprint 3.5 — Processo como Raiz + Perfil do Servidor
**Status:** ✅ Concluído

**Referência:** `TFD_REESTRUTURACAO_PLANEJAMENTO.md` §2.1, §2.4, §6; `AUTH_PERMISSIONS.md` §7.2.

**Depende de:** Sprint 3.2 concluída. Pode rodar em paralelo com 3.3/3.4 se houver dois desenvolvedores.

#### Banco (migrations)

- [x] Nenhuma migration nova necessária — banco já suporta 1:N (processo → solicitações)

#### Backend (`modules/saude/tfd`)

**Queries:**
- [x] `get-processo-tfd-detalhe.ts` — processo completo: dados clínicos (SOAP), paciente, solicitações com status, agendamentos, tramitações paginadas
- [x] `get-lista-processos-tfd.ts` — substitui `getSolicitacoesTfd` como tela principal; filtra por status do processo, urgência, paciente, período; cada item: protocolo, paciente, status geral, última movimentação, urgência mais crítica
- [x] `get-perfil-servidor.ts` — dados do usuário + setores + permissões granulares + audit log recente filtrado por `user_id` (sem dados sensíveis de outros usuários)

**Actions:**
- [x] Refatorar `abrirSolicitacaoTfd` — aceitar `processoId` opcional; se não informado, cria novo processo automaticamente (comportamento atual preservado); se informado, vincula ao processo existente validando mesmo `pacienteId`
- [x] `atualizarDadosServidor` em `actions/servidor.ts` — nome, telefone, matrícula; o próprio servidor ou ADMIN; audit log obrigatório

#### Frontend (`apps/painel-servidor`)

**Tela principal de processos `/saude/tfd/processos`:**
- [x] Nova rota substituindo `/saude/tfd` — listagem de processos (não solicitações)
- [x] Filtros: status do processo, urgência, período, busca por paciente/protocolo
- [x] Cada linha: protocolo do processo, nome do paciente, status geral, número de solicitações, última movimentação, urgência mais crítica (badge)
- [x] Botão "Novo Processo" com `PermissionGate abrir_solicitacao`
- [x] Redirect `/saude/tfd` → `/saude/tfd/processos` (manter compatibilidade)

**Perfil do processo `/saude/tfd/processos/[id]`:**
- [x] Aba **Visão geral** — dados do processo: protocolo, status, paciente (link para perfil), dados clínicos SOAP, responsável, datas
- [x] Aba **Solicitações** — lista de todas as solicitações do processo com status individual; botão "Nova Solicitação" quando processo em andamento; `PermissionGate abrir_solicitacao`
- [x] Aba **Agendamentos** — lista de agendamentos com status; botão "Novo Agendamento" visível apenas quando há solicitação APROVADA; `PermissionGate criar_agendamento`
- [x] Aba **Histórico** — tramitações paginadas em ordem cronológica (timeline existente reutilizada)
- [x] Aba **Documentos** — todos os anexos do processo (laudos, comprovantes, passagens)
- [x] Redirect `/saude/tfd/[id]` → `/saude/tfd/processos/[id]` (compatibilidade)

**Perfil do servidor `/configuracoes/servidores/[id]`:**
- [x] Dados pessoais: nome, CPF (mascarado), matrícula, e-mail, telefone; edição pelo próprio ou ADMIN
- [x] Papel atual e permissões granulares TFD — toggles editáveis por ADMIN
- [x] Setores de atuação (lista de ServidorSetor)
- [x] Se motorista: dados CNH com badge visual (VÁLIDA / VENCENDO / VENCIDA)
- [x] Últimas 20 ações em `audit_logs` filtradas por `user_id` — visível para ADMIN/GESTOR; campos: data, ação, entidade

#### Registro em `platform_features`

| funcionalidade | painel_dev | painel_servidor | permissao_chave | sprint |
|---|---|---|---|---|
| `lista_processos_tfd` | false | true | — | 3.5 |
| `perfil_processo_tfd` | false | true | — | 3.5 |
| `multiplas_solicitacoes_por_processo` | false | true | `saude.tfd.abrir_solicitacao` | 3.5 |
| `perfil_servidor` | false | true | — | 3.5 |
| `editar_dados_servidor` | false | true | — | 3.5 |

**Nota:** busca por protocolo na lista implementada na Sprint 3.6 (`protocolo` em `getListaProcessosTfd` + campos separados na UI).

**Seed:**

```bash
cd packages/core-db
npm run db:seed:sprint-3-5-features
```

**Critério de conclusão:**
- Processo com 2 solicitações diferentes navegáveis
- Perfil do servidor exibe permissões e histórico de ações
- Redirect `/saude/tfd` → `/saude/tfd/processos` funciona sem quebrar bookmarks
- `tsc --noEmit` passa sem erros

---

### Sprint 3.6 — Limpeza, Consolidação e Documentação
**Status:** ✅ Concluído

**Referência:** `TFD_REESTRUTURACAO_PLANEJAMENTO.md` §4.3, §10.

**Depende de:** Sprints 3.1–3.5 concluídas.

#### Banco (migrations)

- [x] Adicionar `deprecated_at TIMESTAMPTZ NULL` em `saude_tfd.viagens` (marca a tabela como substituída sem remover dados)
- [x] Remover coluna `viagem_id` de `saude_tfd.itens_despesa` após confirmar que todos os dados foram migrados para `transporte_id` *(adiado — coluna mantida para prestações legadas; ver DT-005)*
- [x] Verificar e adicionar índices faltantes nas novas tabelas (executar `EXPLAIN ANALYZE` nas queries mais usadas)
- [x] Revisar todas as RLS policies das tabelas novas — smoke test com 2 tenants

#### Backend (`modules/saude/tfd`)

- [x] Remover referências a `viagem_id` nas actions refatoradas (apenas manter como stub deprecated com `console.warn`)
- [x] Atualizar barrel `modules/saude/tfd/src/index.ts` — exportar todas as novas actions, queries, validators e types das sprints 3.x
- [x] Atualizar `tfd.types.ts` — adicionar tipos para `ProcessoDetalhe`, `AgendamentoDetalhe`, `TransporteDetalhe`, `SegmentoTransporteItem`
- [x] Revisar e atualizar jobs: `processar-transicao-em-viagem.ts` → deprecar em favor de `processar-transicao-agendamento.ts`; manter ambos rodando durante período de transição
- [x] Checar paridade Painel Dev / Painel Servidor para todas as funcionalidades 3.x

#### Frontend (`apps/painel-servidor`)

- [x] Remover todos os redirects temporários e substituir por rotas definitivas onde aplicável
- [x] Atualizar sidebar TFD — item "TFD" ou "Solicitações" → "Processos TFD"
- [x] Atualizar dashboard TFD — métricas por processo (não por solicitação); atualizar KPIs e gráficos
- [x] Atualizar `platform_features` com seeds de verificação para toda a Fase 3

#### Documentação (obrigatório)

- [x] `docs/BUSINESS_RULES.md` — atualizar §1.2, §1.6, §1.7 com fluxos do agendamento e transporte
- [x] `docs/AUTH_PERMISSIONS.md` — adicionar novas permissões da Fase 3 à matriz §3.1
- [x] `docs/DATABASE_SCHEMA.md` — documentar novas tabelas: `processo_dados_clinicos`, `agendamentos`, `transportes`, `transporte_anexos`, `fila_movimentacoes`
- [x] `docs/SPRINTS.md` — adicionar Fase 3 com sprints 3.1–3.6 e marcar concluídas
- [x] `README.md` — atualizar seção de cron jobs com `tfd-transicao-agendamento` e `tfd-transicao-transporte`

**Seed e verificação:**

```bash
cd packages/core-db
npm run db:seed:sprint-3-6-cleanup
npm run db:verify:sprint-3-completo
```

**Critério de conclusão da Fase 3:**
- Sistema 100% operando no novo modelo hierárquico
- Zero referências ativas a `viagem_id` no código de negócio (apenas deprecated stubs)
- Todas as funcionalidades das sprints 3.x registradas em `platform_features`
- `tsc --noEmit` passa sem erros em todos os packages
- RLS validado com 2 tenants para todas as novas tabelas
- Documentação atualizada e alinhada ao código

---

## Ordem de Execução Recomendada

```
Sprint 3.1 (1 semana)
    ↓
Sprint 3.2 (1,5 semanas)
    ↓
Sprint 3.3 (1,5 semanas) ←→ Sprint 3.5 (1 semana) [paralelas se possível]
    ↓
Sprint 3.4 (1 semana)
    ↓
Sprint 3.6 (1 semana)

Total estimado: 7 semanas sequencial / 6 semanas com 3.3 e 3.5 paralelas
```

---

## O Que Fica Preparado para Implementação Futura (sem reestruturar)

Ao final da Fase 3, estas funcionalidades poderão ser adicionadas como **pura adição**:

| Funcionalidade | Fundação criada na Fase 3 |
|----------------|--------------------------|
| Portal do cidadão (consulta de fila) | `posicao_fila` + `fila_movimentacoes` + mapeamento status→situação |
| Integração SIGTAP | `codigo_sigtap` já existe em `procedimentos`; é apenas sincronização |
| Médico solicitante com CRM | Campos `medico_crm`, `medico_uf_conselho` já na `solicitacoes` |
| CID secundário e causas associadas | Campos `cid_secundario`, `cid_causas_associadas` já na `solicitacoes` |
| Comprovante de agendamento imprimível | Dados já existem no `agendamento`; é uma página de impressão/PDF |
| Cancelamento com retorno à fila (1ª ou última posição) | `fila_movimentacoes` suporta; nova action com nova regra |
| Registro de comparecimento pós-consulta | Novo campo `compareceu BOOLEAN` + `motivo_nao_comparecimento` em `agendamentos` |
| Modalidade TFD interestadual | Campo `modalidade_tfd` já na `solicitacoes` |

---

## Débitos Técnicos da Fase 3

### DT-005 — Tabela `viagens` deprecated mas não removida

| Campo | Descrição |
|-------|-----------|
| **Identificador** | `DT-005` |
| **Status** | Resolvido (Sprint 3.6) |
| **Causa** | `saude_tfd.viagens` é mantida com `deprecated_at` para segurança durante a transição |
| **Impacto** | Baixo — tabela inativa, sem leituras ativas no código de negócio |
| **Resolução** | Migration `sprint_3_6_deprecar_viagens` adicionou `deprecated_at`; remoção física da tabela permanece como evolução futura após período de observação |

### DT-006 — Aprovação de PC legada não migrada para fluxo por agendamento

| Campo | Descrição |
|-------|-----------|
| **Identificador** | `DT-006` |
| **Status** | Resolvido (Sprint 3.6) |
| **Origem** | Sprint 3.4 |
| **Causa** | `decidirPrestacaoContas` e `registrarVisualizacaoComprovante` em `financeiro.ts` ainda operam por `viagem_id`. Prestações legadas continuam no fluxo antigo. |
| **Impacto** | Baixo — prestações criadas antes da Sprint 3.2 continuam funcionando normalmente pelo fluxo legado. |
| **Resolução** | Fluxo novo documentado e operacional via `enviarPrestacaoContasAgendamento` e itens com `agendamento_id`/`transporte_id`; fluxo legado preservado por restrição de transição |

### DT-007 — Helpers de app não totalmente removidos

| Campo | Descrição |
|-------|-----------|
| **Identificador** | `DT-007` |
| **Status** | Resolvido (Sprint 3.6) |
| **Origem** | Sprint 3.3 |
| **Causa** | `get-agendamentos-consulta-tfd.ts` e `get-acompanhantes-solicitacao-tfd.ts` em `apps/painel-servidor/lib/tfd/` viraram re-exports do módulo mas os arquivos ainda existem. |
| **Impacto** | Baixo — funcional, mas dívida de organização. |
| **Resolução** | Arquivos de re-export removidos; imports apontam para `@saude/mod-saude-tfd`; `format-hora-consulta.ts` mantido local |

### DT-008 — Busca por protocolo na lista de processos não implementada

| Campo | Descrição |
|-------|-----------|
| **Identificador** | `DT-008` |
| **Status** | Resolvido (Sprint 3.6) |
| **Origem** | Sprint 3.5 |
| **Causa** | `getListaProcessosTfd` filtra apenas por `pacienteNome` (ILIKE). Busca por protocolo do processo exige ajuste na query. |
| **Impacto** | Baixo — servidor pode buscar pelo nome do paciente. Protocolo ainda não funciona como filtro na tela principal. |
| **Resolução** | Filtro `protocolo` (ILIKE) em `getListaProcessosTfd` e campos separados na UI de `/saude/tfd/processos` |

---

## Status Geral — Fase 3

| Sprint | Descrição | Status |
|---|---|---|
| 3.1 | Dados clínicos, perfil do paciente e fila auditada | ✅ Concluído |
| 3.2 | Agendamento como entidade própria | ✅ Concluído |
| 3.3 | Transporte com múltiplos segmentos | ✅ Concluído |
| 3.4 | Prestação de contas unificada por agendamento | ✅ Concluído |
| 3.5 | Processo como raiz + perfil do servidor | ✅ Concluído |
| 3.6 | Limpeza, consolidação e documentação | ✅ Concluído |
