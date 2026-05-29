�# SPRINTS_FASE4_AGENDAMENTO_VIAGEM.md
# saudegov — Fase 4: Reestruturação Agendamento / Viagem / Prestação de Contas

> **Instruções para o agente do Cursor:** Este arquivo documenta a Fase 4.
> Leia `docs/TFD/TFD_REESTRUTURACAO_PLANEJAMENTO.md` e `docs/TFD/SPRINTS_FASE3_TFD.md`
> antes de qualquer implementação. Nunca implemente sprints futuras sem concluir a atual.
> Ao concluir cada tarefa, registre em `public.platform_features`.

---

## Contexto da Fase 4

A Fase 3 estabeleceu a hierarquia correta:
`Processo �  Solicitação �  Agendamento �  Transporte �  Prestação de Contas`

A **Fase 4 corrige a separação de responsabilidades** entre Agendamento e Viagem:

```
MODELO FASE 3 (incompleto)
—�—�—�—�—�—�—�—�—�—�—�—�—�—�—�—�—�—�—�—�—�—�—�—�—�—�
Agendamento � � mistura consulta + dados de deslocamento
Transporte  � � segmentos por agendamento (solto)
TfdViagem   � � legado deprecated

MODELO FASE 4 (correto)
—�—�—�—�—�—�—�—�—�—�—�—�—�—�—�—�—�—�—�—�—�—�—�—�
Agendamento � � APENAS a consulta médica
             (quando/onde/com quem/convênio/acompanhantes)
Viagem      � � o evento de deslocamento coletivo
             (veículo/motorista/vagas/rota/custos/status)
ViagemPassageiro � � junção viagem �  agendamentos/pacientes
Prestação de Contas � � vinculada à Viagem (não ao agendamento)
```

**Princípio desta fase:** aditivo onde possível, substituição controlada onde necessário.
Dados legados mantidos para histórico. Sistema nunca fica inoperante entre sprints.

**Referências obrigatórias:**
- `docs/TFD/SPRINTS_FASE3_TFD.md` — o que foi implementado
- `docs/BUSINESS_RULES.md` — regras de negócio
- `docs/AUTH_PERMISSIONS.md` — permissões
- `docs/SKILL_DB_MIGRATION.md` — padrão de migrations
- `docs/SKILL_API_ROUTE.md` — padrão de Server Actions
- `docs/DESIGN_SYSTEM.md` — padrão visual

---

## Decisões de Arquitetura (fechadas)

| # | Decisão | Escolha |
|---|---------|---------|
| 1 | Locais da consulta | **B** — 1 local principal + adicionais opcionais |
| 2 | Agendamento �  Viagem | **Múltiplas viagens** + tabela de junção de passageiros |
| 3 | Prestação de Contas | **Vinculada à Viagem**, separada das ações do processo |
| 4 | Páginas novas | Lista/nova/detalhe de viagem + detalhe/histórico veículo e motorista |
| 5 | TfdTransporte | **5B** — aposentar para novos registros, concentrar na Viagem |
| 6 | Nome da entidade | **Viagem** (nova) — antiga vira `viagens_legado` |

---

## 6. FASE 4 — Reestruturação Agendamento / Viagem / PC

### Sprint 4.0 — Saneamento de Migrations (Drift)
**Status:** ✅ Concluído
**Bloqueante:** sim — nenhuma migration nova pode ser criada antes desta sprint

**Problema:** 5 migrations foram modificadas após aplicadas, causando drift de checksum:
- `20260520234500_create_saude_tfd_frota_tables`
- `20260521000000_create_saude_tfd_saldos_tables`
- `20260521010000_create_saude_tfd_solicitacoes_tables`
- `20260521020000_create_saude_tfd_viagens_tables`
- `20260528120000_sprint_3_2_agendamentos`

Adicionalmente: dois timestamps idênticos `20260528120000` (`add_tramitacao_reclassificacao` e `sprint_3_2_agendamentos`).

**Abordagem — sem reset, sem perda de dados:**

#### Passo 1 — Verificar estado real
```bash
cd packages/core-db
npx prisma migrate status --schema prisma/schema.prisma
```
Identificar quais migrations estão com status `drift detected`.

#### Passo 2 — Para cada migration com drift
Verificar se o SQL aplicado no banco corresponde ao arquivo atual:
```bash
# Ver o que está no banco para cada migration
psql $DATABASE_URL -c "SELECT migration_name, checksum FROM _prisma_migrations WHERE migration_name LIKE '%frota_tables%';"
```

#### Passo 3 — Resolver drift via migrate resolve
Para cada migration com drift, usar `--applied` para marcar como aceita sem re-executar:
```bash
npx prisma migrate resolve --applied "20260520234500_create_saude_tfd_frota_tables"
npx prisma migrate resolve --applied "20260521000000_create_saude_tfd_saldos_tables"
npx prisma migrate resolve --applied "20260521010000_create_saude_tfd_solicitacoes_tables"
npx prisma migrate resolve --applied "20260521020000_create_saude_tfd_viagens_tables"
npx prisma migrate resolve --applied "20260528120000_sprint_3_2_agendamentos"
```

#### Passo 4 — Resolver conflito de timestamp
Renomear uma das migrations com timestamp duplicado:
```bash
# Renomear add_tramitacao_reclassificacao para timestamp único
# 20260528110000_add_tramitacao_reclassificacao
# Atualizar _prisma_migrations no banco para refletir o novo nome
```

#### Passo 5 — Verificar
```bash
npx prisma migrate status
# Deve mostrar: "All migrations have been applied"
npx prisma generate
npm run type-check
```

**Critério de conclusão:** `prisma migrate status` retorna "All migrations have been applied" sem drift. `npm run type-check` passa 10/10.

---

### Sprint 4.1 — Combobox com Busca (Design System)
**Status:** ✅ Concluído
**Depende de:** Sprint 4.0 concluída
**Estimativa:** 3 dias

**Por que esta ordem:** o Combobox é dependência de quase todas as telas da Fase 4. Sem ele, todos os selects de prestador, procedimento, motorista, veículo e paciente ficam inutilizáveis em produção com centenas de registros.

#### Componente `packages/ui/src/components/combobox.tsx`
- Input de busca por digitação com debounce (300ms)
- Dropdown com lista filtrada (máx 50 itens visíveis)
- Opção de loading state durante busca assíncrona
- Opção de "Nenhum resultado encontrado"
- Suporte a valor único e múltiplos valores (multiselect opcional)
- Acessível: keyboard navigation, aria-labels, role=combobox
- Segue design tokens do projeto (CSS vars existentes)
- Export em `packages/ui/src/index.ts`

#### Adotar em selects existentes
- Select de prestador no formulário de agendamento
- Select de procedimento no formulário de nova solicitação
- Select de motorista no formulário de transporte
- Select de veículo no formulário de transporte
- Select de especialidade no formulário de nova solicitação

**Critério de conclusão:** Combobox renderiza, filtra por digitação, seleciona valor. Adotado nos 5 selects listados. `tsc --noEmit` passa.

---

### Sprint 4.2 — Agendamento Ampliado
**Status:** ✅ Concluído
**Depende de:** Sprint 4.1 concluída
**Estimativa:** 1,5 semanas

#### Banco (migrations)

- [x] Enum `TfdTipoViagem`: `IDA`, `VOLTA`, `IDA_VOLTA`
- [x] Enum `TfdConvenio`: `SUS`, `PARTICULAR`
- [x] Colunas em `saude_tfd.agendamentos` (nullable): `tipo_viagem TfdTipoViagem`, `convenio TfdConvenio DEFAULT SUS`
- [x] Tabela `saude_tfd.agendamento_locais`: `id`, `tenant_id`, `agendamento_id` FK, `ordem INT`, `prestador_id` FK nullable, `procedimento_id` FK nullable, `horario TIME nullable`, `observacao TEXT nullable`, `created_at`. RLS obrigatório.
- [x] Tabela `saude_tfd.agendamento_acompanhantes` (junção): `id`, `tenant_id`, `agendamento_id` FK, `acompanhante_id` FK, `created_at`. UNIQUE `(agendamento_id, acompanhante_id)`. RLS obrigatório.

#### Backend

**Validators:**
- [x] Atualizar `agendamento-novo.schema.ts`: + `convenio` (enum), `tipoViagem` (enum), `acompanhanteIds: string[]` (substituir `acompanhanteId`), `novosAcompanhantes: [{nome, telefone?}]` (opcional), `locais: [{prestadorId?, procedimentoId?, horario?, observacao?}]` (optional array, locais adicionais além do principal)
- [x] Validação: horários dos locais devem estar em ordem cronológica quando informados
- [x] Validação: duplicidade — mesma solicitação + data + prestador principal bloqueada

**Queries:**
- [x] `get-procedimentos-por-especialidade.ts` — procedimentos filtrados pela especialidade da solicitação (para select de locais)
- [x] `get-locais-agendamento.ts` — locais adicionais de um agendamento
- [x] `get-acompanhantes-agendamento.ts` — acompanhantes vinculados ao agendamento (nova junção)

**Actions:**
- [x] Atualizar `criarAgendamentoNovo`: persistir convênio/tipoViagem, criar locais adicionais, criar acompanhantes novos em `TfdAcompanhante` + vincular via junção, validar duplicidade
- [x] Nova action `adicionarAcompanhanteAgendamento` — adicionar acompanhante existente ou criar novo
- [x] Nova action `removerAcompanhanteAgendamento`
- [x] Nova action `adicionarLocalAgendamento`
- [x] Nova action `removerLocalAgendamento`

#### Frontend

**Formulário `agendamento-novo-form.tsx` reorganizado em blocos:**

- [x] **Bloco 1 — Dados da consulta** (read-only: paciente, protocolo, especialidade; editável: data, hora, tipo atendimento, convênio, tipo de viagem)
- [x] **Bloco 2 — Local principal** (prestador via Combobox, profissional, hora)
- [x] **Bloco 3 — Locais adicionais** (lista repetível: Combobox prestador + procedimento + horário + observação; botão Adicionar/Remover)
- [x] **Bloco 4 — Acompanhantes** (lista dos vinculados à solicitação com checkbox; botão "Adicionar acompanhante" abre form inline: nome + telefone)
- [x] **Bloco 5 — Observações** (orientações existentes renomeadas)
- [x] **Ações:** botão "Salvar agendamento" e botão "Salvar e ir para alocação" (cria e redireciona para `/saude/tfd/viagens/nova?agendamentoId=[id]`)

#### Registro em `platform_features`

| funcionalidade | sprint |
|---|---|
| `agendamento_convenio_tipo_viagem` | 4.2 |
| `agendamento_locais_multiplos` | 4.2 |
| `agendamento_acompanhantes_multiplos` | 4.2 |
| `combobox_busca_typeahead` | 4.1 |

**Critério de conclusão:** formulário de agendamento com todos os blocos funcionando. Locais adicionais e acompanhantes múltiplos persistindo corretamente. Combobox ativo nos selects. `tsc --noEmit` passa.

---

### Sprint 4.3 — Nova Entidade Viagem (Núcleo)
**Status:** ✅ Concluído
**Depende de:** Sprint 4.2 concluída
**Estimativa:** 2 semanas

#### Banco (migrations)

- [x] **Renomear tabela legada:** `saude_tfd.viagens` �  `saude_tfd.viagens_legado`. Atualizar model Prisma `TfdViagem` �  `TfdViagemLegado`. Atualizar relações em `TfdItemDespesa.viagem_id` e `TfdPrestacaoConta.viagem_id` para apontar para `viagens_legado`.

- [x] **Enum `TfdViagemStatusV2`:** `PLANEJADA`, `CONFIRMADA`, `EM_ANDAMENTO`, `CONCLUIDA`, `CANCELADA`

- [x] **Tabela `saude_tfd.viagens` (nova):**
  ```
  id, tenant_id, protocolo VARCHAR(50) UNIQUE por tenant,
  processo_id FK processos,
  veiculo_id FK veiculos nullable,
  motorista_id FK motoristas nullable,
  data_saida DATE NOT NULL,
  hora_saida TIME nullable,
  data_chegada DATE nullable,
  hora_chegada TIME nullable,
  km_saida INT nullable,
  km_chegada INT nullable,
  origem_descricao VARCHAR(300) NOT NULL,
  destino_descricao VARCHAR(300) NOT NULL,
  tempo_estimado_min INT nullable,
  custo_estimado DECIMAL(10,2) nullable,
  custo_real DECIMAL(10,2) nullable,
  status TfdViagemStatusV2 DEFAULT PLANEJADA,
  observacoes TEXT nullable,
  created_at, updated_at
  ```
  RLS obrigatório. Índices em tenant_id, processo_id, motorista_id, status, data_saida.

- [x] **Tabela `saude_tfd.viagem_passageiros`:**
  ```
  id, tenant_id,
  viagem_id FK viagens (nova),
  agendamento_id FK agendamentos,
  tipo_trecho TfdTipoViagem (IDA/VOLTA/IDA_VOLTA),
  acompanhantes_count INT DEFAULT 0,
  status_presenca VARCHAR(20) DEFAULT PENDENTE,
  created_at
  ```
  UNIQUE `(viagem_id, agendamento_id, tipo_trecho)`. RLS obrigatório.

- [x] **Job:** `CONFIRMADA �  EM_ANDAMENTO` automático na `data_saida + hora_saida`

#### Backend

**Permissões:**
- [x] `saude.tfd.gerenciar_viagem` — SERVIDOR — criar/editar viagens
- [x] `saude.tfd.monitorar_viagem` — SERVIDOR — ver detalhes e acompanhar

**Validators (`viagem.schema.ts`):**
- [x] `criarViagemSchema`: `processoId`, `veiculoId?`, `motoristaId?`, `dataSaida`, `horaSaida?`, `origemDescricao`, `destinoDescricao`, `tempoEstimadoMin?`, `custoEstimado?`, `observacoes?`
- [x] `vincularAgendamentoSchema`: `viagemId`, `agendamentoId`, `tipoTrecho`
- [x] `mudarStatusViagemSchema`: `viagemId`, `novoStatus`, `observacao?`
- [x] `registrarKmSchema`: `viagemId`, `kmSaida?`, `kmChegada?`, `dataChegada?`, `horaChegada?`, `custoReal?`

**Queries:**
- [x] `get-viagens.ts` — listagem global com filtros (status, data, motorista, veículo, processo)
- [x] `get-viagem-detalhe.ts` — viagem completa: passageiros, agendamentos, veículo, motorista, custos, tramitações
- [x] `get-agendamentos-disponiveis-para-viagem.ts` — agendamentos APROVADO/AGENDADO sem viagem ou compatíveis com a data
- [x] `get-vagas-disponiveis.ts` — capacidade veículo �� passageiros já vinculados (considera acompanhantes)

**Actions (`actions/viagem-nova.ts`):**
- [x] `criarViagem` — cria viagem, gera protocolo, audit log, tramitação
- [x] `editarViagem` — atualiza dados (só antes de EM_ANDAMENTO)
- [x] `vincularAgendamentoNaViagem` — valida vagas, cria `viagem_passageiro`, verifica capacidade
- [x] `desvincularPassageiro` — remove passageiro (só antes de EM_ANDAMENTO)
- [x] `mudarStatusViagem` — transições permitidas com guardas
- [x] `registrarChegadaViagem` — registra km chegada, data/hora, custo real �  status CONCLUIDA
- [x] `cancelarViagem` — PLANEJADA/CONFIRMADA �  CANCELADA com motivo

**Job:**
- [x] `processar-transicao-viagem.ts` — `CONFIRMADA �  EM_ANDAMENTO` automático

#### Frontend

**Página `/saude/tfd/viagens`:**
- [x] Lista com filtros: status (badges coloridos), data, motorista, veículo, processo
- [x] Cada linha: protocolo da viagem, data saída, origem� destino, veículo, motorista, passageiros (X/Y vagas), status badge, link para detalhe
- [x] Botão "Nova Viagem" com `PermissionGate gerenciar_viagem`
- [x] Status com cores únicas: PLANEJADA=indigo, CONFIRMADA=teal, EM_ANDAMENTO=cyan, CONCLUIDA=emerald, CANCELADA=slate

**Página `/saude/tfd/viagens/nova`:**
- [x] Bloco 1: Dados da viagem (data saída, hora, origem, destino, tempo estimado, observações)
- [x] Bloco 2: Alocação (Combobox veículo, Combobox motorista — com CNH badge válida/vencendo/vencida)
- [x] Bloco 3: Passageiros — lista de agendamentos disponíveis para vincular com painel de vagas em tempo real (X vagas livres de Y total), cada agendamento mostra: paciente, data consulta, tipo trecho, acompanhantes; checkbox para selecionar
- [x] Painel de vagas: atualiza em tempo real ao selecionar/deselecionar passageiros
- [x] Botões: "Salvar como Planejada" e "Salvar e Confirmar"

**Página `/saude/tfd/viagens/[id]`:**
- [x] Header: protocolo, status badge, data/hora saída, origem� destino
- [x] Aba **Detalhes**: veículo, motorista, rota, km, tempo estimado vs real, custo estimado vs real
- [x] Aba **Passageiros**: lista de agendamentos vinculados com paciente, acompanhantes, tipo trecho, status presença; ações: vincular mais, desvincular
- [x] Aba **Histórico**: tramitações em timeline
- [x] Sidebar de ações: mudar status, registrar chegada, editar, cancelar — com `PermissionGate` por ação
- [x] Painel de vagas: gráfico visual de ocupação

**Sidebar TFD:** adicionar item "Viagens" apontando para `/saude/tfd/viagens`

**Critério de conclusão:** criar viagem, vincular agendamentos com controle de vagas, mudar status. Job automático funcionando. `tsc --noEmit` passa.

---

### Sprint 4.4 — Detalhe e Histórico de Veículos e Motoristas
**Status:** ✅ Concluído
**Depende de:** Sprint 4.3 concluída
**Estimativa:** 1 semana

#### Backend

**Queries:**
- [x] `get-veiculo-detalhe.ts` — veículo completo + histórico de viagens (paginado) + ocupação total + custo total de viagens
- [x] `get-motorista-detalhe.ts` — motorista completo + CNH com alerta vencimento + histórico de viagens + KPIs (total km, total viagens, custo total)

#### Frontend

**Página `/saude/tfd/configuracoes/veiculos/[id]`:**
- [x] Dados do veículo: placa, modelo, marca, capacidade, ano, cor, RENAVAM, chassi, ativo
- [x] KPIs: total de viagens, km total rodado, ocupação média
- [x] Histórico de viagens: lista com data, origem� destino, motorista, passageiros, status
- [x] Botão editar dados (já existe em configuracoes)

**Página `/saude/tfd/configuracoes/motoristas/[id]`:**
- [x] Dados do motorista: nome, CNS, CNH com badge de status (VÁLIDA/VENCENDO/VENCIDA), categoria, validade
- [x] KPIs: total de viagens, km total, viagens no mês
- [x] Histórico de viagens: lista com data, origem� destino, veículo, passageiros, status
- [x] Alerta visual proeminente quando CNH vencida ou vencendo em 30 dias

**Atualizar listas de veículos e motoristas:**
- [x] Adicionar link para detalhe em cada linha das tabelas existentes
- [x] Adicionar coluna de "�altimo uso" (data da última viagem)

**Critério de conclusão:** perfil de veículo e motorista com histórico de viagens. Alertas de CNH visíveis. `tsc --noEmit` passa.

---

### Sprint 4.5 — Prestação de Contas na Viagem
**Status:** ✅ Concluído
**Depende de:** Sprint 4.3 concluída
**Estimativa:** 1 semana

**Objetivo:** mover a PC do contexto de agendamento para o contexto de viagem. PC gerada automaticamente quando viagem muda para CONCLUIDA.

#### Banco (migrations)

- [x] Garantir que `TfdPrestacaoConta.viagem_id` aponta para a **nova** tabela `viagens` (não `viagens_legado`). Se necessário, adicionar coluna `viagem_nova_id UUID FK saude_tfd.viagens nullable` e migrar dados.
- [x] PC criada automaticamente ao concluir viagem: `registrarChegadaViagem` deve criar `TfdPrestacaoConta` vinculada à nova viagem

#### Backend

**Actions:**
- [x] Atualizar `registrarChegadaViagem` para criar PC com `viagem_nova_id`
- [x] Novas actions: `registrarDespesaViagem`, `enviarPrestacaoContasViagem`, `decidirPrestacaoContasViagem` — operam por `viagemId` (nova viagem)
- [x] Manter ações legadas por agendamento para dados históricos (sem alterar)

**Queries:**
- [x] `get-prestacao-detalhe-viagem.ts` — PC completa da viagem com itens de despesa agrupados por categoria

#### Frontend

**Na página da viagem `/saude/tfd/viagens/[id]`:**
- [x] Aba **Prestação de Contas** — visível quando viagem CONCLUIDA ou AGUARDANDO_PC
  - Resumo financeiro: estimado vs real vs despesas registradas
  - Lista de despesas com tipo, valor, comprovante
  - Botão "Lançar despesa" com PermissionGate registrar_despesa
  - Botão "Enviar prestação" com PermissionGate enviar_prestacao
  - Painel de aprovação (gestor): comprovantes + aprovar/rejeitar

**Remover PC das ações do processo:**
- [x] Em `solicitacao-acoes.tsx`: remover `DespesaForm` e `PrestacaoAnalisePainel` do fluxo AGUARDANDO_PC/PC_EM_ANALISE para o fluxo novo
- [x] Substituir por link "Ver prestação de contas �  [viagem]"

**Critério de conclusão:** PC gerada ao concluir viagem. Fluxo completo de despesas/aprovação na tela da viagem. Ações do processo não mostram mais PC inline. `tsc --noEmit` passa.

---

### Sprint 4.6 — Polimento UX e Consolidação
**Status:** ✅ Concluído
**Depende de:** Sprints 4.0–4.5 concluídas
**Estimativa:** 1 semana

#### Tarefas

- [x] Revisar todos os formulários novos: organização em blocos/cards consistente com padrão da tela de permissões dos servidores
- [x] Revisar responsividade das novas telas (viagens, agendamento ampliado, veículo/motorista)
- [x] Adicionar estados vazios (EmptyState) em todas as listas novas
- [x] Confirmar que todos os status têm badges com cores distintas e consistentes
- [x] Remover referências a `TfdTransporte` em novas criações (congelar uso)
- [x] Atualizar `docs/BUSINESS_RULES.md` com fluxo de Viagem
- [x] Atualizar `docs/AUTH_PERMISSIONS.md` com novas permissões
- [x] Atualizar `docs/DATABASE_SCHEMA.md` com novas tabelas
- [x] Marcar Sprint 4.x como concluída em `SPRINTS_FASE4_AGENDAMENTO_VIAGEM.md`
- [x] Registrar todas as features em `platform_features`

**Critério de conclusão da Fase 4:**
- Sistema 100% operando no novo modelo de Viagem
- PC vinculada à Viagem, não ao agendamento
- Combobox ativo em todos os selects de catálogo
- `tsc --noEmit` 10/10
- `npm run build` passa sem erro
- Documentação atualizada

---

## Ordem de Execução

```
Sprint 4.0 (saneamento drift) — BLOQUEANTE
    � 
Sprint 4.1 (Combobox) — 3 dias
    � 
Sprint 4.2 (Agendamento ampliado) — 1,5 semanas
    � 
Sprint 4.3 (Nova Viagem — núcleo) — 2 semanas
    � 
Sprint 4.4 (Veículo/Motorista detalhe) — 1 semana  � ��   Sprint 4.5 (PC na Viagem) — 1 semana
    � 
Sprint 4.6 (Polimento UX) — 1 semana

Total estimado: 7�8 semanas
```

---

## Status Geral — Fase 4

| Sprint | Descrição | Status |
|---|---|---|
| 4.0 | Saneamento de migrations (drift) | ✅ Concluído |
| 4.1 | Combobox com busca (Design System) | ✅ Concluído |
| 4.2 | Agendamento ampliado | ✅ Concluído |
| 4.3 | Nova entidade Viagem (núcleo) | ✅ Concluído |
| 4.4 | Detalhe/histórico veículos e motoristas | ✅ Concluído |
| 4.5 | Prestação de Contas na Viagem | ✅ Concluído |
| 4.6 | Polimento UX e consolidação | ✅ Concluído |

---

## Débitos Técnicos da Fase 4

### DT-009 — TfdTransporte congelado (não removido)
| Campo | Detalhe |
|-------|---------|
| **Identificador** | DT-009 |
| **Status** | Resolvido (Sprint 4.6) |
| **Causa** | `TfdTransporte` continua existindo para dados históricos da Fase 3. Novos registros não devem mais usar essa entidade. |
| **Impacto** | Baixo — não afeta novas funcionalidades |
| **Resolução** | Remover `TfdTransporte` de telas novas na Sprint 4.6. Remoção total do banco após 60 dias de operação no novo modelo. |

### DT-010 — PC por agendamento (fluxo legado) coexistindo com PC por viagem
| Campo | Detalhe |
|-------|---------|
| **Identificador** | DT-010 |
| **Status** | Resolvido (Sprint 4.6) |
| **Causa** | Dados da Fase 3 têm PC vinculada a `agendamento_id`. O novo fluxo usa `viagem_id` (nova viagem). |
| **Impacto** | Médio — dois fluxos de PC em paralelo durante transição |
| **Resolução** | Migrar PCs existentes para viagens na Sprint 4.5. Unificar em único fluxo na Sprint 4.6. |
