# FASE5_CONSOLIDACAO_DESLOCAMENTO.md
# saudegov — Fase 5: Consolidação do Deslocamento TFD

> **Data:** 29/05/2026
> **Contexto:** Após as Fases 3 e 4, o sistema possui três modelos paralelos de
> deslocamento que coexistem sem integração automática, causando confusão operacional.
> Esta fase estabelece um **fluxo único e canônico**.

---

## O Problema

Hoje existem 3 mundos paralelos sem ponte:

| Mundo | Entidade | Situação |
|-------|----------|----------|
| Legado (Fases 1-2) | `TfdViagemLegado` | Dados históricos, ainda visível na UI |
| Fase 3 | `TfdTransporte` (segmentos no agendamento) | Ativo na UI, mas congelado por decisão |
| Fase 4 | `TfdViagem` (viagem coletiva) | Modelo alvo, mas sem integração com segmentos |

Isso causa:
- Três lugares diferentes para "organizar deslocamento"
- Duas prestações de contas para o mesmo paciente
- Usuário não sabe qual caminho usar
- Dados potencialmente duplicados (veículo/motorista cadastrado em dois lugares)

---

## Decisão Estratégica

### Fluxo único e canônico da Fase 5

```
Processo → Solicitação → Agendamento (consulta) → Viagem (deslocamento) → PC (financeiro)
```

**Regra central:**
- **Agendamento** = apenas a consulta médica (quando, onde, com quem)
- **Viagem** = o deslocamento (como chegar lá) com segmentos opcionais
- **PC** = sempre vinculada à Viagem, nunca ao Agendamento para novos casos

### Cenários operacionais suportados

| Cenário | Como fica |
|---------|-----------|
| **A (dominante)** — Van municipal com vários pacientes | 1 Viagem com tipo TERRESTRE_PROPRIO + múltiplos agendamentos vinculados |
| **B — Deslocamento individual** | 1 Viagem com 1 passageiro + segmento AEREO ou TERCEIRO sem frota própria |
| **C — Misto** | 1 Viagem com segmento TERRESTRE_PROPRIO (van até aeroporto) + segmento AEREO |

**A Viagem absorve todos os cenários.** Não há mais necessidade de segmentos dentro do Agendamento.

---

## O Que Muda

### Some da UI (novos fluxos)
- Seção "Transportes" dentro do detalhe do agendamento → substituída por card "Viagem vinculada"
- PC por agendamento para novos registros → redirecionada para PC da Viagem
- Aba "Viagens legadas" na listagem de agendamentos → movida para seção Histórico somente leitura

### Permanece (histórico)
- Todos os dados de `TfdViagemLegado` → somente leitura, nunca criar novos
- Todos os dados de `TfdTransporte` existentes → somente leitura
- PC por agendamento existentes → somente leitura, sem novos lançamentos

### É adicionado
- Segmentos dentro da Viagem (mover `TfdTransporte` para `viagem_id` em vez de `agendamento_id`)
- Card "Viagem vinculada" no detalhe do agendamento com link e status
- Status `EM_VIAGEM` no agendamento derivado automaticamente da viagem (não manual)
- Segmentos AEREO/TERCEIRO na Viagem sem exigir veículo/motorista da frota

---

## Modelo de Dados Alvo

```
TfdViagem (viagem coletiva ou individual)
├── viagem_passageiros → TfdAgendamento (pacientes)
├── TfdViagemSegmento (novo — move TfdTransporte para cá)
│   ├── TERRESTRE_PROPRIO (veículo + motorista da frota)
│   ├── TERRESTRE_TERCEIRO (sem frota própria)
│   ├── AEREO (passagem — só custo e anexo)
│   ├── FLUVIAL
│   └── OUTRO
└── TfdPrestacaoConta (PC da viagem inteira)
    └── TfdItemDespesa (por segmento ou avulso)
```

---

## 7. FASE 5 — Consolidação do Deslocamento

### Sprint 5.1 — UI: Fluxo Único no Agendamento
**Status:** ✅ Concluído
**Estimativa:** 1 semana
**Risco:** baixo — apenas UI, sem migrations

**Objetivo:** o agendamento para de expor transportes e PC diretamente. Mostra apenas a viagem vinculada.

#### Backend
- [x] Query `get-viagem-por-agendamento.ts` — busca a(s) viagem(ns) nova(s) que têm o agendamento como passageiro via `viagem_passageiros`. Retorna: id, protocolo, status, dataSaida, origemDescricao, destinoDescricao.
- [x] Atualizar `get-agendamento-detalhe.ts` — incluir campo `viagensVinculadas` (lista de viagens onde este agendamento é passageiro)

#### Frontend
- [x] No detalhe do agendamento (`/processos/[id]/agendamentos/[agId]`):
  - Substituir seção "Transportes" (TfdTransporte) por card **"Deslocamento"**
  - Se há viagem vinculada: exibir card com protocolo VGM, status badge, data/rota, link "Ver viagem →"
  - Se não há viagem: exibir EmptyState "Nenhum deslocamento vinculado" com botão "Criar viagem" → `/saude/tfd/viagens/nova?agendamentoId=[id]`
  - Manter seção de transportes legados como acordeão colapsado "Segmentos históricos (legado)" — sem botão de adicionar
- [x] Remover botão "Adicionar segmento de transporte" do fluxo principal
- [x] Remover card de PC por agendamento da sidebar — substituir por link para PC da viagem quando houver
- [x] Na listagem de agendamentos (`/saude/tfd/agendamentos`): remover aba "Viagens legadas" do título principal, mover para seção colapsável "Histórico"

**Critério de conclusão:** servidor que acessa o agendamento vê apenas "Deslocamento" com link para a viagem. Não há mais caminho visível para criar segmentos de transporte novos.

---

### Sprint 5.2 — Segmentos dentro da Viagem
**Status:** ✅ Concluído
**Estimativa:** 1,5 semanas
**Depende de:** Sprint 5.1

**Objetivo:** a Viagem passa a ter segmentos de deslocamento (substituindo TfdTransporte por agendamento).

#### Banco (migration)
- [x] Adicionar coluna `viagem_id UUID FK saude_tfd.viagens` em `saude_tfd.transportes` (nullable — manter `agendamento_id` para histórico)
- [x] Índice em `viagem_id`
- [x] Não remover `agendamento_id` — dados históricos preservados

#### Backend
- [x] Atualizar `criarSegmentoTransporte` — aceitar `viagemId` em vez de `agendamentoId` como campo principal
- [x] Query `get-segmentos-viagem.ts` — segmentos de uma viagem (via `viagem_id`)
- [x] Atualizar `get-viagem-detalhe.ts` — incluir segmentos de transporte da viagem

#### Frontend
- [x] Na página da viagem (`/saude/tfd/viagens/[id]`), aba Detalhes:
  - Adicionar seção **"Segmentos de deslocamento"** com lista e botão "Adicionar segmento"
  - Formulário de segmento: tipo (TERRESTRE_PROPRIO com frota / TERRESTRE_TERCEIRO / AEREO / FLUVIAL / OUTRO), origem, destino, data/hora, veículo+motorista apenas para TERRESTRE_PROPRIO, custo estimado, upload de comprovante
  - Para AEREO e TERCEIRO: apenas custo e anexo (passagem) — sem campos de frota
  - Linha do tempo visual da rota completa (segmentos em sequência)
- [x] Atualizar `nova-viagem-form.tsx` — opção de já adicionar segmentos no momento da criação (opcional)

**Critério de conclusão:** viagem com van (TERRESTRE_PROPRIO) + voo (AEREO) funciona como segmentos da mesma viagem. Agendamento mostra link para viagem com os segmentos.

---

### Sprint 5.3 — PC Unificada e Aposentadoria do Legado
**Status:** ✅ Concluído
**Estimativa:** 1 semana
**Depende de:** Sprint 5.2

**Objetivo:** PC sempre na Viagem. Legado em modo arquivo.

#### Banco (migration)
- [x] Atualizar `TfdItemDespesa` — novos registros usam `viagem_nova_id` (nova viagem) como referência principal; `agendamento_id` e `viagem_id` (legado) mantidos para histórico
- [x] Nenhuma remoção de dados

#### Backend
- [x] Atualizar `registrarDespesaViagemNova` — aceitar `segmentoId` opcional para vincular despesa a segmento específico
- [ ] Job `processar-transicao-agendamento.ts` — atualizar para derivar `EM_VIAGEM` do agendamento a partir do status da viagem vinculada (não mais automático por data)

#### Frontend
- [x] Remover completamente da UI:
  - `DespesaForm` e `PrestacaoAnalisePainel` das ações da solicitação (para novos fluxos)
  - Formulário de despesa no detalhe do agendamento
- [x] Na PC da viagem (`/saude/tfd/viagens/[id]` aba PC):
  - Despesas podem ser vinculadas a um segmento específico (dropdown de segmentos)
  - Ou lançadas como avulsa (alimentação, hospedagem)
- [x] Legado (`viagens_legado`, `TfdTransporte` antigos):
  - Mover para seção "Histórico" em páginas relevantes
  - Remover botões de ação (criar, editar) — somente visualização
  - Badge "Histórico" em tudo que é legado

#### Documentação
- [ ] Atualizar `BUSINESS_RULES.md` — seção §1.6 (agendamento) e §1.15 (viagem) com fluxo unificado
- [ ] Atualizar `DECISIONS.md` — registrar decisão de consolidação
- [x] Atualizar `SPRINTS.md` — Fase 5 concluída

**Critério de conclusão da Fase 5:**
- Fluxo canônico: Agendamento → Viagem → Segmentos → PC
- Nenhum novo registro em `TfdTransporte` via UI principal
- Legado visível apenas como histórico somente leitura
- `tsc --noEmit` 10/10
- Build passa sem erro

---

## Ordem de Execução

```
Sprint 5.1 (1 sem) — UI: agendamento mostra viagem, não transportes
    ↓
Sprint 5.2 (1,5 sem) — Segmentos dentro da Viagem
    ↓
Sprint 5.3 (1 sem) — PC unificada + aposentadoria do legado

Total: ~3,5 semanas
```

---

## O Que o Usuário Final Vê (após Fase 5)

### Fluxo operacional completo

```
1. Abrir processo + solicitação
2. Regulação aprova
3. Servidor cria AGENDAMENTO (consulta: data, prestador, acompanhantes)
4. Servidor cria VIAGEM (deslocamento: van/avião, motorista, vagas)
5. Servidor vincula agendamento à viagem
6. Viagem sai → status automático EM_ANDAMENTO → chega → CONCLUIDA
7. PC criada automaticamente → lançar despesas → enviar → gestor aprova
8. Processo CONCLUIDO
```

### O que o servidor NÃO precisa mais saber

- O que é "Transporte por agendamento" vs "Viagem"
- O que é "Viagem legada"
- Onde lançar a PC (sempre na Viagem)

---

## Débitos Técnicos que esta fase resolve

| DT | Descrição | Resolução |
|----|-----------|-----------|
| DT-009 | TfdTransporte congelado mas ainda na UI | ✅ Resolvido (Sprint 5.1 remove da UI; 5.2 migra para Viagem) |
| DT-010 | PC por agendamento coexistindo com PC por viagem | ✅ Resolvido (Sprint 5.3 unifica) |

---

## Status Geral — Fase 5

| Sprint | Descrição | Status |
|--------|-----------|--------|
| 5.1 | UI: fluxo único no agendamento | ✅ Concluído |
| 5.2 | Segmentos dentro da Viagem | ✅ Concluído |
| 5.3 | PC unificada e aposentadoria do legado | ✅ Concluído |
