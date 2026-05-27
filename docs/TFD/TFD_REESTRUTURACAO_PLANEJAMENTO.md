# TFD — Planejamento de Reestruturação Definitivo
## saudegov · Módulo Tratamento Fora do Domicílio

> **Versão:** 2.0 — Definitiva  
> **Data:** 26/05/2026  
> **Princípio:** construir a fundação correta agora. Tudo que vier depois é adição, nunca reestruturação.

---

## 1. Diagnóstico — O Que Está Errado Hoje

### Problema Central: Hierarquia Invertida

```
MODELO ATUAL (incorreto)
─────────────────────────
TfdSolicitacao  ← age como raiz, carrega responsabilidades demais
  └── TfdViagem (mistura agendamento + logística de transporte)
        ├── TfdItemDespesa (custo amarrado à viagem)
        └── TfdPrestacaoConta (UNIQUE viagem_id — 1 PC por viagem)

MODELO CORRETO
──────────────
Processo  ← raiz real (protocolo, dados clínicos, paciente)
  └── TfdSolicitacao  (pedido clínico — várias por processo)
        └── TfdAgendamento  (consulta marcada após aprovação)
              ├── TfdTransporte  (segmentos de deslocamento — vários)
              │     └── TfdItemDespesa  (custo por segmento)
              └── TfdPrestacaoConta  (por agendamento, unificada)
```

### Problemas Específicos

| Área | Problema atual | Impacto |
|------|---------------|---------|
| **Processo** | Existe no banco mas é só protocolo — sem dados clínicos SOAP | Subjetivo, objetivo, avaliação, plano, motivo não têm onde morar |
| **Múltiplas solicitações** | O banco suporta (1:N), mas a UI trata como 1:1 | Paciente com múltiplos laudos/tratamentos fica sem suporte |
| **Agendamento** | Embutido em `TfdViagem` sem distinção clara | "Marcar consulta" e "organizar transporte" são a mesma coisa — errado |
| **Transporte** | Não existe como entidade — 1 veículo + 1 motorista por viagem | Impossível registrar carro + avião no mesmo deslocamento |
| **Prestação de contas** | `UNIQUE viagem_id` — 1 PC por viagem | Com múltiplos segmentos de transporte o modelo quebra |
| **Fila** | Listagem ordenada por `created_at` — sem posição formal | Impossível alterar posição com justificativa auditada |
| **Perfil do Paciente** | Lista básica, sem histórico de processos, sem múltiplos contatos | Servidor não vê o histórico longitudinal do cidadão |
| **Perfil do Servidor** | Não existe como tela | Sem visão de permissões, setores e histórico de atuação |

---

## 2. Arquitetura de Entidades — Modelo Definitivo

### 2.1 Hierarquia Completa

```
PROCESSO (public.processos + saude_tfd.processo_dados_clinicos)
│  protocolo, status geral, paciente_id, dados SOAP
│
├── SOLICITAÇÃO (saude_tfd.solicitacoes) — 1 ou mais por processo
│   pedido clínico: especialidade, procedimentos, CID, laudo,
│   urgência, prestador, acompanhante, médico solicitante
│   status: RASCUNHO → ENVIADO → EM_ANALISE → APROVADO/NEGADO
│   posicao_fila: INT (posição na fila de regulação)
│
│   (quando APROVADO, cria agendamento)
│
└── AGENDAMENTO (saude_tfd.agendamentos) — 1 ou mais por solicitação aprovada
    data, hora, tipo atendimento, prestador confirmado,
    profissional que atenderá, orientações, acompanhante
    status: AGENDADO → EM_VIAGEM (auto) → REALIZADO | CANCELADO
    │
    ├── TRANSPORTE (saude_tfd.transportes) — 1 ou mais segmentos por agendamento
    │   tipo: TERRESTRE_PROPRIO | TERRESTRE_TERCEIRO | AEREO | FLUVIAL | OUTRO
    │   origem, destino, data/hora saída e chegada
    │   km saída + km chegada (para frota própria)
    │   veículo + motorista (para frota própria)
    │   custo estimado + custo real
    │   status: PENDENTE → CONFIRMADO → EM_TRANSITO (auto) → CONCLUIDO | CANCELADO
    │   └── TfdTransporteAnexo (passagens, notas, comprovantes por segmento)
    │
    ├── ITEM DE DESPESA (saude_tfd.itens_despesa) — vinculado ao transporte
    │   tipo: TRANSPORTE | ALIMENTACAO | HOSPEDAGEM | OUTRO
    │   valor, comprovante obrigatório se ≥ R$50
    │
    └── PRESTAÇÃO DE CONTAS (saude_tfd.prestacoes_conta) — por agendamento
        agrega todos os custos de todos os segmentos de transporte
        status: PENDENTE → ENVIADA → APROVADA | REJEITADA
```

### 2.2 Dados Clínicos do Processo (SOAP)

Pertencem ao **Processo**, não à Solicitação. São o acompanhamento longitudinal do cidadão.

Nova tabela: `saude_tfd.processo_dados_clinicos`

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `processo_id` | UUID FK | Referência ao processo (UNIQUE) |
| `subjetivo` | TEXT | Relato do paciente / queixa principal |
| `objetivo` | TEXT | Dados objetivos observados |
| `avaliacao` | TEXT | Avaliação clínica |
| `plano` | TEXT | Plano de tratamento |
| `motivo_quadro` | TEXT | Motivo / quadro clínico |
| `observacao` | TEXT | Observações adicionais |
| `registrado_por_id` | UUID FK users | Servidor que registrou |
| `created_at` / `updated_at` | TIMESTAMPTZ | Controle |

### 2.3 Fila com Posição Auditada

Para suportar o conceito de fila do TR (e futuro portal do cidadão) sem reestruturar depois:

**Campos na `saude_tfd.solicitacoes`:**
- `posicao_fila INTEGER NULL` — posição atual na fila de regulação (NULL quando não está na fila)

**Nova tabela: `saude_tfd.fila_movimentacoes`** — histórico imutável

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `solicitacao_id` | UUID FK | Solicitação movimentada |
| `posicao_anterior` | INT NULL | Posição antes da movimentação |
| `posicao_nova` | INT NULL | Posição após a movimentação |
| `tipo_movimentacao` | ENUM | ENTRADA, SAIDA, AVANCO, RECUO, PRIORIDADE |
| `justificativa` | TEXT | Obrigatória para alterações manuais |
| `usuario_id` | UUID FK | Quem movimentou |
| `created_at` | TIMESTAMPTZ | Imutável |

**Mapeamento status → situação do cidadão** (para futuro portal):

| Status interno | Situação para o cidadão |
|----------------|------------------------|
| RASCUNHO, ENVIADO, EM_ANALISE, PENDENTE | Aguardando vaga |
| APROVADO, AGENDADO, EM_VIAGEM, AGUARDANDO_PC, PC_EM_ANALISE | Consulta agendada |
| CONCLUIDO | Atendido |
| NEGADO, CANCELADO | Retirado da fila |

### 2.4 Campos Preparados para o Futuro (sem custo agora)

Adicionados como `nullable` — sem impacto no fluxo atual, prontos para quando precisar:

**Na `saude_tfd.solicitacoes`:**
- `medico_solicitante_nome VARCHAR(200)` — médico que solicitou (externo ou interno)
- `medico_crm VARCHAR(20)` — CRM do médico
- `medico_uf_conselho CHAR(2)` — UF do conselho
- `cid_secundario VARCHAR(10)` — CID secundário (TR pede)
- `cid_causas_associadas VARCHAR(10)` — CID causas associadas (TR pede)
- `modalidade_tfd ENUM(INTERMUNICIPAL, INTERESTADUAL)` — distingue responsabilidade (Portaria 55/1999)

**Na `saude_base.pacientes`:**
- `email VARCHAR(255)` — contato adicional
- `telefone_celular VARCHAR(20)` — separado do fixo atual
- `nome_social VARCHAR(200)` — nome social (TR pede)
- `raca_cor ENUM` — BRANCA, PRETA, PARDA, AMARELA, INDIGENA, NAO_INFORMADO
- `nacionalidade VARCHAR(50)` — nacionalidade (TR pede)
- `identidade_genero VARCHAR(50)` — identidade de gênero (TR pede)
- `responsavel_legal_nome VARCHAR(200)` — para menores/incapazes
- `responsavel_legal_cpf VARCHAR(11)` — para menores/incapazes

---

## 3. Novos Enums do Banco

```sql
-- Status do agendamento (substitui parte de TfdViagemStatus)
CREATE TYPE saude_tfd.agendamento_status AS ENUM (
  'AGENDADO',
  'EM_VIAGEM',    -- automático quando data_consulta chega (job)
  'REALIZADO',
  'CANCELADO'
);

-- Tipo do segmento de transporte
CREATE TYPE saude_tfd.tipo_segmento_transporte AS ENUM (
  'TERRESTRE_PROPRIO',    -- frota do município (veículo + motorista)
  'TERRESTRE_TERCEIRO',   -- fretado / terceirizado
  'AEREO',                -- passagem aérea
  'FLUVIAL',              -- barco / lancha
  'OUTRO'
);

-- Status do segmento de transporte
CREATE TYPE saude_tfd.transporte_status AS ENUM (
  'PENDENTE',      -- criado, aguardando confirmação
  'CONFIRMADO',    -- passagem emitida / veículo reservado
  'EM_TRANSITO',   -- automático na hora_saida (job)
  'CONCLUIDO',     -- chegada registrada
  'CANCELADO'
);

-- Tipo de movimentação na fila
CREATE TYPE saude_tfd.fila_movimentacao_tipo AS ENUM (
  'ENTRADA',      -- paciente entra na fila
  'SAIDA',        -- paciente sai (aprovado, negado, cancelado)
  'AVANCO',       -- sobe posições
  'RECUO',        -- desce posições
  'PRIORIDADE'    -- urgência altera posição
);
```

---

## 4. Todas as Mudanças no Banco

### 4.1 Tabelas a CRIAR

| Tabela | Schema | Propósito |
|--------|--------|-----------|
| `processo_dados_clinicos` | `saude_tfd` | Dados SOAP do processo |
| `agendamentos` | `saude_tfd` | Consultas marcadas (substitui `viagens`) |
| `transportes` | `saude_tfd` | Segmentos de transporte por agendamento |
| `transporte_anexos` | `saude_tfd` | Anexos por segmento (passagens, notas) |
| `fila_movimentacoes` | `saude_tfd` | Histórico de posição na fila (imutável) |

### 4.2 Tabelas a ALTERAR

| Tabela | O que muda |
|--------|-----------|
| `saude_base.pacientes` | + `email`, `telefone_celular`, `nome_social`, `raca_cor`, `nacionalidade`, `identidade_genero`, `responsavel_legal_nome`, `responsavel_legal_cpf` |
| `public.processos` | + `paciente_id UUID FK` (nullable — compatibilidade) |
| `saude_tfd.solicitacoes` | + `posicao_fila INT NULL`, + `medico_solicitante_nome`, `medico_crm`, `medico_uf_conselho`, `cid_secundario`, `cid_causas_associadas`, `modalidade_tfd` |
| `saude_tfd.itens_despesa` | + `transporte_id UUID FK NULL` (manter `viagem_id` por ora) |
| `saude_tfd.prestacoes_conta` | + `agendamento_id UUID FK NULL` (manter `viagem_id` por ora) |

### 4.3 Tabelas a DEPRECAR (não remover — manter por compatibilidade)

| Tabela | Quando deprecar | Como |
|--------|----------------|------|
| `saude_tfd.viagens` | Sprint 3.6 | Adicionar coluna `deprecated_at`, parar de usar no código |

### 4.4 Tabelas a MANTER sem alteração

Todas as outras tabelas continuam exatamente como estão:
`especialidades`, `procedimentos`, `prestadores`, `veiculos`, `motoristas`,
`saldos`, `reservas_saldo`, `movimentacoes_saldo`, `acompanhantes`,
`public.tramitacoes`, `public.anexos`, `public.notificacoes`, `public.audit_logs`

---

## 5. Novas Permissões Necessárias

Adicionar ao catálogo em `modules/saude/tfd/src/permissions.ts`:

| Chave | Papel mínimo | O que autoriza |
|-------|-------------|----------------|
| `saude.tfd.gerenciar_processo` | SERVIDOR | Criar e editar processos TFD |
| `saude.tfd.registrar_dados_clinicos` | SERVIDOR | Preencher dados SOAP do processo |
| `saude.tfd.criar_agendamento` | SERVIDOR | Criar agendamento de consulta |
| `saude.tfd.gerenciar_transporte` | SERVIDOR | Criar e gerenciar segmentos de transporte |
| `saude.tfd.mover_fila` | GESTOR | Alterar posição de paciente na fila com justificativa |
| `saude.tfd.ver_perfil_paciente` | SERVIDOR | Acessar perfil completo do paciente com histórico |

---

## 6. Novas Rotas e Páginas

### 6.1 Rotas Novas

| Rota | Descrição | Papel mínimo |
|------|-----------|-------------|
| `/saude/tfd/processos` | Fila de processos (substitui `/saude/tfd`) | SERVIDOR |
| `/saude/tfd/processos/novo` | Abrir novo processo | SERVIDOR + `gerenciar_processo` |
| `/saude/tfd/processos/[id]` | Perfil do processo (abas) | SERVIDOR |
| `/saude/tfd/processos/[id]/solicitacoes/nova` | Nova solicitação no processo | SERVIDOR + `abrir_solicitacao` |
| `/saude/tfd/processos/[id]/solicitacoes/[solId]` | Detalhe da solicitação | SERVIDOR |
| `/saude/tfd/processos/[id]/agendamentos/novo` | Novo agendamento pós-aprovação | SERVIDOR + `criar_agendamento` |
| `/saude/tfd/processos/[id]/agendamentos/[agId]` | Detalhe do agendamento | SERVIDOR |
| `/saude/tfd/processos/[id]/agendamentos/[agId]/transporte/novo` | Adicionar segmento de transporte | SERVIDOR + `gerenciar_transporte` |
| `/saude/tfd/processos/[id]/agendamentos/[agId]/prestacao` | Prestação de contas | SERVIDOR |
| `/saude/tfd/pacientes/[id]` | Perfil completo do paciente | SERVIDOR + `ver_perfil_paciente` |
| `/configuracoes/servidores/[id]` | Perfil do servidor | ADMIN |

### 6.2 Rotas a Manter / Redirecionar

| Rota atual | Situação |
|-----------|----------|
| `/saude/tfd` | Redirect 301 → `/saude/tfd/processos` |
| `/saude/tfd/nova` | Redirect 301 → `/saude/tfd/processos/novo` |
| `/saude/tfd/[id]` | Redirect 301 → `/saude/tfd/processos/[id]` |
| `/saude/tfd/agendamentos` | Manter — visão global de agendamentos |
| `/saude/tfd/prestacoes` | Manter — visão global de prestações |
| `/saude/tfd/dashboard` | Manter e expandir |
| `/saude/tfd/pacientes` | Manter — lista de pacientes |
| `/saude/tfd/configuracoes/*` | Manter sem alteração |

---

## 7. Plano de Sprints

> Cada sprint entrega algo funcional e testável. O sistema nunca fica quebrado entre sprints.

---

### Sprint 3.1 — Fundação: Dados Clínicos + Paciente + Fila
**Estimativa:** 1 semana
**Risco:** baixo — apenas adições, zero breaking changes

#### Banco (migrations)
- [ ] `saude_tfd.processo_dados_clinicos` (SOAP) com RLS
- [ ] Campos novos em `saude_base.pacientes` (nullable — sem quebrar existente)
- [ ] `paciente_id` nullable em `public.processos`
- [ ] `posicao_fila` e `modalidade_tfd` e campos médico/CID opcionais em `saude_tfd.solicitacoes`
- [ ] `saude_tfd.fila_movimentacoes` com RLS (imutável — sem `updated_at`)

#### Backend (`modules/saude/tfd`)
- [ ] Action `salvarDadosClinicosTfd` — criar/atualizar SOAP
- [ ] Query `getDadosClinicosTfd` — por processo_id
- [ ] Action `atualizarPacienteCompleto` — campos novos
- [ ] Query `getPerfilPacienteTfd` — dados + histórico de processos paginado
- [ ] Action `moverPacienteNaFila` — requer `mover_fila` (GESTOR), registra em `fila_movimentacoes`
- [ ] Query `getHistoricoFilaPaciente` — tramitações da fila
- [ ] Permissões novas em `permissions.ts`

#### Frontend
- [ ] Seção "Dados Clínicos" na tela do processo — formulário SOAP colapsável, com `PermissionGate registrar_dados_clinicos`
- [ ] Página `/saude/tfd/pacientes/[id]` — perfil completo
  - Aba: Dados cadastrais (editável pelo servidor com permissão)
  - Aba: Histórico de processos TFD (lista paginada com link para cada processo)
  - Aba: Agendamentos (lista)
  - Aba: Movimentações de fila (histórico auditado)
- [ ] Expandir formulário de paciente com campos novos (todos opcionais na UI)
- [ ] Badge de posição na fila na listagem de solicitações

**Critério de conclusão:** servidor preenche SOAP, salva. Perfil do paciente mostra histórico. Fila tem posição visível.

---

### Sprint 3.2 — Agendamento como Entidade Própria
**Estimativa:** 1,5 semanas
**Depende de:** Sprint 3.1

#### Banco (migrations)
- [ ] Enum `saude_tfd.agendamento_status`
- [ ] Tabela `saude_tfd.agendamentos` com RLS
- [ ] `agendamento_id UUID NULL` em `saude_tfd.prestacoes_conta`
- [ ] Script de migração: dados de `viagens` → `agendamentos`

#### Backend
- [ ] Action `criarAgendamentoTfd` — vincula ao processo e solicitação, valida 72h mínimo
- [ ] Action `registrarRetornoAgendamento` — REALIZADO, cria prestação
- [ ] Action `cancelarAgendamento` — antes de EM_VIAGEM
- [ ] Query `getAgendamentosPorProcesso` — todos os agendamentos de um processo
- [ ] Query `getAgendamentoDetalhe` — detalhe completo
- [ ] Query `getAgendamentosTfd` (global) — atualizada para nova entidade
- [ ] Job: `AGENDADO → EM_VIAGEM` automático na `data_consulta`
- [ ] Notificação 48h antes do agendamento (servidor + motorista)
- [ ] Auditoria obrigatória em todas as actions

#### Frontend
- [ ] `/saude/tfd/processos/[id]/agendamentos/novo`
  - Data, hora, prestador, profissional que atenderá, tipo atendimento, acompanhante, orientações
  - Validação 72h mínimo visível na UI
- [ ] `/saude/tfd/processos/[id]/agendamentos/[agId]`
  - Status badge visual (AGENDADO / EM_VIAGEM / REALIZADO / CANCELADO)
  - Seção de transportes (lista vazia inicialmente)
  - Ações: registrar retorno, cancelar
  - Link para prestação de contas
- [ ] Atualizar `/saude/tfd/agendamentos` — usar nova entidade
- [ ] Atualizar aba "Agendamentos" no perfil do processo

**Critério de conclusão:** agendamento criado separado da solicitação. Job EM_VIAGEM funcionando. Detalhe do agendamento acessível com status correto.

---

### Sprint 3.3 — Transporte com Múltiplos Segmentos
**Estimativa:** 1,5 semanas
**Depende de:** Sprint 3.2

#### Banco (migrations)
- [ ] Enum `saude_tfd.tipo_segmento_transporte`
- [ ] Enum `saude_tfd.transporte_status`
- [ ] Tabela `saude_tfd.transportes` com RLS
- [ ] Tabela `saude_tfd.transporte_anexos` com RLS
- [ ] `transporte_id UUID NULL` em `saude_tfd.itens_despesa` (manter `viagem_id` por ora)
- [ ] Job: `CONFIRMADO → EM_TRANSITO` automático na `hora_saida`

#### Backend
- [ ] Action `criarSegmentoTransporte` — cria segmento no agendamento
- [ ] Action `confirmarTransporte` — PENDENTE → CONFIRMADO
- [ ] Action `registrarChegadaTransporte` — EM_TRANSITO → CONCLUIDO
- [ ] Action `cancelarTransporte`
- [ ] Action `adicionarAnexoTransporte` — passagem, nota de combustível, etc.
- [ ] Query `getTransportesPorAgendamento`
- [ ] Query `getTransporteDetalhe` — segmento completo com anexos e despesas
- [ ] Validação: frota própria exige `veiculo_id` + `motorista_id`; CNH válida na data
- [ ] Validação: capacidade do veículo comporta paciente + acompanhante

#### Frontend
- [ ] `/saude/tfd/processos/[id]/agendamentos/[agId]/transporte/novo`
  - Seletor de tipo de segmento (condicional)
  - Se TERRESTRE_PROPRIO: veículo + motorista + km saída
  - Se AEREO/TERCEIRO: apenas descrição + custos + upload passagem
  - Origem, destino (texto livre + seleção de prestadores cadastrados)
  - Data/hora saída e chegada
  - Custo estimado
- [ ] Seção de transportes no detalhe do agendamento
  - Lista de segmentos com status individual e badge de tipo
  - Ações por segmento: confirmar, registrar chegada, cancelar, adicionar anexo
- [ ] Suporte a múltiplos segmentos — botão "Adicionar segmento de transporte"
- [ ] Visualização clara da rota completa (ex: Campo Grande → Ônibus → Campo Grande → Avião → São Paulo)

**Critério de conclusão:** agendamento com carro (frota própria) + passagem aérea funciona com status independentes por segmento.

---

### Sprint 3.4 — Prestação de Contas Unificada por Agendamento
**Estimativa:** 1 semana
**Depende de:** Sprint 3.3

#### Banco (migrations)
- [ ] Alterar `saude_tfd.prestacoes_conta`: `agendamento_id UUID NOT NULL` (após migração dos dados)
- [ ] Remover constraint `UNIQUE viagem_id` → criar `UNIQUE agendamento_id`
- [ ] Migrar prestações existentes para usar `agendamento_id`

#### Backend
- [ ] Refatorar `registrarDespesa` → associar a `transporte_id` (não mais `viagem_id`)
- [ ] Refatorar `enviarPrestacaoContas` → por agendamento
- [ ] Refatorar `decidirPrestacaoContas` → aprova PC do agendamento inteiro
- [ ] Query `getPrestacaoDetalhe` — agrupa itens de todos os segmentos de transporte
- [ ] Extrato financeiro por agendamento — todos os segmentos com seus custos
- [ ] Regras LGPD mantidas: comprovante obrigatório ≥ R$50 por item
- [ ] Regra de visualização de comprovantes antes de aprovar (todos devem ser abertos)

#### Frontend
- [ ] `/saude/tfd/processos/[id]/agendamentos/[agId]/prestacao`
  - Resumo agrupado por segmento de transporte
  - Lançamento de despesas extras (alimentação, hospedagem)
  - Botão enviar prestação (validação: ≥ 1 despesa lançada)
  - Painel de aprovação do gestor com visualização por segmento
  - Bloqueio do botão aprovar até todos os comprovantes serem visualizados
- [ ] Atualizar `/saude/tfd/prestacoes` — usar nova estrutura

**Critério de conclusão:** PC unificada por agendamento mostrando todos os segmentos e seus custos. Aprovação com checklist de comprovantes funcionando.

---

### Sprint 3.5 — Processo como Raiz + Perfil do Servidor
**Estimativa:** 1 semana
**Depende de:** Sprint 3.2 (pode ser paralela à 3.3/3.4)

#### Banco (migrations)
- [ ] Nenhuma migration nova necessária — banco já suporta múltiplas solicitações por processo

#### Backend
- [ ] Refatorar `abrirSolicitacaoTfd` — aceita `processoId` existente OU cria processo novo
- [ ] Query `getSolicitacoesPorProcesso` — todas as solicitações de um processo com status
- [ ] Query `getProcessoTfdDetalhe` — processo completo com solicitações, agendamentos, tramitações
- [ ] Query `getPerfilServidor` — dados + setores + permissões + audit log recente filtrado
- [ ] Action `atualizarDadosServidor` — nome, telefone, matrícula (próprio ou ADMIN)
- [ ] Query `getListaProcessosTfd` — substitui `getSolicitacoesTfd` como tela principal

#### Frontend
- [ ] `/saude/tfd/processos` — nova tela principal (substitui `/saude/tfd`)
  - Filtros: status do processo, urgência, paciente, período
  - Cada linha: protocolo, paciente, status geral, última movimentação
  - Botão "Novo Processo"
- [ ] `/saude/tfd/processos/[id]` — perfil do processo com abas
  - Aba: Visão geral (dados do processo, SOAP, paciente)
  - Aba: Solicitações (lista com botão "Nova Solicitação")
  - Aba: Agendamentos (lista com botão "Novo Agendamento" se há solicitação aprovada)
  - Aba: Histórico / Tramitações (timeline completa)
  - Aba: Documentos / Anexos
- [ ] `/configuracoes/servidores/[id]` — perfil do servidor
  - Dados pessoais (editável pelo próprio + ADMIN)
  - Papel e permissões granulares (toggles — editável pelo ADMIN)
  - Setores de atuação
  - Se motorista: dados CNH com badge de alerta (vencida / vencendo)
  - Histórico recente de ações (audit log filtrado — ADMIN/GESTOR)
- [ ] Redirect de `/saude/tfd` → `/saude/tfd/processos`

**Critério de conclusão:** processo tem múltiplas solicitações navegáveis. Perfil do servidor completo. Tela principal usa nova hierarquia.

---

### Sprint 3.6 — Limpeza Final e Consolidação
**Estimativa:** 1 semana
**Depende de:** Sprints 3.1–3.5 concluídas

#### Banco (migrations)
- [ ] Adicionar `deprecated_at TIMESTAMPTZ NULL` em `saude_tfd.viagens`
- [ ] Remover `viagem_id` de `itens_despesa` (após confirmar que todos os dados foram migrados)
- [ ] Verificar e adicionar índices otimizados para novas queries
- [ ] Verificar RLS em todas as novas tabelas (checklist obrigatório)

#### Backend
- [ ] Remover actions antigas de `viagem.ts` (ou manter como alias deprecated)
- [ ] Atualizar barrel `modules/saude/tfd/src/index.ts` com todos os novos exports
- [ ] Atualizar `platform_features` com todas as novas funcionalidades das sprints 3.x
- [ ] Atualizar jobs: remover referências a `viagem_id`, usar `agendamento_id`
- [ ] Testes de integração para fluxos críticos (aprovação → agendamento → transporte → PC)
- [ ] Verificar paridade Painel Dev / Painel Servidor para novas funcionalidades

#### Frontend
- [ ] Remover todos os redirects temporários (substituir por rotas definitivas)
- [ ] Atualizar sidebar/navegação: "TFD" → "Processos TFD"
- [ ] Atualizar dashboard TFD — métricas por processo (não por solicitação)
- [ ] Atualizar relatórios para usar nova estrutura
- [ ] Atualizar `docs/SPRINTS.md` do projeto com Fase 3 completa
- [ ] Atualizar `docs/BUSINESS_RULES.md` com novos fluxos
- [ ] Atualizar `docs/AUTH_PERMISSIONS.md` com novas permissões
- [ ] Atualizar `docs/DATABASE_SCHEMA.md` com novas tabelas

**Critério de conclusão:** sistema 100% no novo modelo. Zero referências ao modelo antigo no código ativo. Documentação alinhada.

---

## 8. Ordem de Execução

```
Sprint 3.1 (1 sem)
    ↓
Sprint 3.2 (1,5 sem)
    ↓
Sprint 3.3 (1,5 sem) ←→ Sprint 3.5 (1 sem) [podem ser paralelas]
    ↓
Sprint 3.4 (1 sem)
    ↓
Sprint 3.6 (1 sem)

Total estimado: 7 semanas (sequencial) / 6 semanas (com 3.3 e 3.5 paralelas)
```

---

## 9. O Que Fica Pronto para Implementar no Futuro Sem Reestruturar

Ao final das 6 sprints, as seguintes funcionalidades do TR poderão ser adicionadas como **pura adição** — zero reestruturação:

| Funcionalidade futura | Por que não precisa reestruturar |
|-----------------------|----------------------------------|
| Portal do cidadão (área de consulta) | Mapeamento status→situação já documentado. Novo app Next.js consome as mesmas queries. |
| Posição na fila visível ao cidadão | `posicao_fila` e `fila_movimentacoes` já existirão no banco |
| Integração SIGTAP (procedimentos) | Campos `codigo_sigtap` já existem. É só adicionar sincronização. |
| Integração E-SUS/PEC para busca de paciente | CADSUS já é abstrato (`getCadsusService`). E-SUS é mais uma implementação. |
| Médico solicitante com CRM | Campos `medico_crm`, `medico_uf_conselho` já existirão na solicitação |
| CID secundário e causas associadas | Campos `cid_secundario`, `cid_causas_associadas` já existirão |
| Comprovante de agendamento imprimível | Dados já existem no agendamento. É uma página de impressão. |
| Cancelamento com retorno à fila (1ª ou última posição) | `fila_movimentacoes` já suporta. É uma nova action com nova regra. |
| Registro de comparecimento pós-consulta | Campo `compareceu BOOLEAN` + `motivo_nao_comparecimento` em `agendamentos` |
| Múltiplos contatos do paciente (tabela separada) | Hoje: campos diretos no cadastro. Futuro: nova tabela `paciente_contatos` (mesma lógica) |
| Modalidade TFD interestadual | Campo `modalidade_tfd` já existirá na solicitação |

---

## 10. Pontos de Atenção Antes de Iniciar

| Item | Ação necessária |
|------|----------------|
| Dados de teste em `viagens` | Script de migração na Sprint 3.2 antes de qualquer deploy |
| RLS nas novas tabelas | Checklist obrigatório em cada migration (ver `DATABASE_SCHEMA.md` §7.4) |
| Jobs de status automático | Usar `agendamento_id` como chave, não `solicitacao_id` |
| Permissões novas no JWT | `permissions.ts` atualizado antes de qualquer action nova |
| `platform_features` | Registrar cada funcionalidade nova ao final de cada sprint |
| Paridade de painéis | Verificar tabela dev/servidor antes de cada entrega |
| Audit log | Toda action nova deve chamar `createAuditLog` — sem exceção |

---

## 11. Próximos Passos Imediatos

1. Validar este documento com você
2. Iniciar Sprint 3.1 — menor risco, apenas adições
3. Primeiro prompt do Cursor para Sprint 3.1 será gerado aqui quando aprovado

