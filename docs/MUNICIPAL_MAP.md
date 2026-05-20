# MUNICIPAL_MAP.md
# saudegov — Mapa do Sistema de Saúde

> **Instruções para o agente do Cursor:** Este é o mapa de referência permanente
> da plataforma. Consulte este arquivo antes de criar qualquer módulo ou
> funcionalidade. Ele define onde cada coisa nasce, a qual área pertence e qual
> é a hierarquia correta. Nunca crie um módulo sem identificar sua sigla e status
> aqui. Nunca use uma sigla que já existe em outro módulo.

---

## 1. Conceito Central

```
SECRETARIA MUNICIPAL DE SAÚDE  →  é o SISTEMA da plataforma (sigla: SAUDE)
DEPARTAMENTO / SETOR           →  é um MÓDULO dentro do sistema
FUNCIONALIDADE                 →  o que cada módulo faz
PAPEL                          →  quem pode executar cada funcionalidade
```

A plataforma saudegov atende exclusivamente a Secretaria Municipal de Saúde.
Não há outros sistemas — apenas módulos dentro do Sistema de Saúde.

**Regra de nomeação no código:**
```
Schema do banco:    saude_{sigla_modulo}
Package do módulo:  @saude/mod-saude-{sigla_modulo}
Protocolo:          ANO-SAUDE-{SIGLA}-SEQUENCIAL

Exemplos:
  Schema:    saude_tfd.*
  Package:   @saude/mod-saude-tfd
  Protocolo: 2025-SAUDE-TFD-000001
```

---

## 2. Status de Desenvolvimento

```
✅ Implementado   → módulo existe e está em produção
🔄 Em desenvolvimento → sprint atual
📋 Planejado      → documentado, aguarda desenvolvimento
💡 Identificado   → existe a necessidade, não documentado ainda
```

---

## 3. Módulos do Sistema de Saúde

---

### Módulo 01 — TFD (Tratamento Fora de Domicílio)
**Sigla:** `TFD`
**Schema:** `saude_tfd.*`
**Package:** `@saude/mod-saude-tfd`
**Protocolo:** `2025-SAUDE-TFD-000001`
**Status:** 🔄 Em desenvolvimento — **MVP**
**Base legal:** Portaria SAS/MS nº 55/1999; Portaria MS nº 280/1999

**O que faz:**
Gerencia o ciclo completo do Tratamento Fora de Domicílio — da abertura da
solicitação pelo médico assistente até a aprovação, agendamento da viagem,
prestação de contas e controle financeiro do saldo municipal destinado ao TFD.

**Principais funcionalidades:**
- Cadastro e vínculo de pacientes (com CADSUS)
- Solicitação de TFD com laudo médico obrigatório
- Fluxo de regulação e autorização médica
- Agendamento de viagens (frota própria e transporte externo)
- Controle financeiro — saldos, reservas e prestação de contas
- Relatórios gerenciais e de transparência
- Dashboard com KPIs operacionais e financeiros

**Regras críticas (Portaria 55/1999):**
- TFD só autorizado quando esgotados meios locais de tratamento
- Distância mínima de 50km para ser elegível
- Vedado para procedimentos do PAB (atenção básica)
- Solicitação feita pelo médico assistente vinculado ao SUS
- Acompanhante exige indicação médica no laudo (obrigatório para menores e maiores de 60 anos)
- Despesas cobertas: transporte, alimentação e pernoite

**Regras de negócio detalhadas em:** `BUSINESS_RULES.md` seção 1

---

### Módulo 02 — Regulação de Consultas e Exames
**Sigla:** `REGUL`
**Schema:** `saude_regul.*`
**Package:** `@saude/mod-saude-regul`
**Protocolo:** `2025-SAUDE-REGUL-000001`
**Status:** 📋 Planejado
**Base legal:** Portaria de Consolidação nº 2/2017 — Política Nacional de Regulação

**O que fará:**
Central de regulação municipal para agendamento de consultas e exames
especializados na rede SUS — incluindo encaminhamentos entre UBS e especialidades,
controle de filas e priorização por critério clínico.

---

### Módulo 03 — Vigilância Sanitária
**Sigla:** `VISA`
**Schema:** `saude_visa.*`
**Package:** `@saude/mod-saude-visa`
**Protocolo:** `2025-SAUDE-VISA-000001`
**Status:** 💡 Identificado
**Base legal:** Lei 9.782/1999 — Sistema Nacional de Vigilância Sanitária

**O que fará:**
Licenciamento sanitário de estabelecimentos, fiscalização, autos de infração
e controle de validade de licenças no município.

---

### Módulo 04 — Vigilância Epidemiológica
**Sigla:** `VIEPI`
**Schema:** `saude_viepi.*`
**Package:** `@saude/mod-saude-viepi`
**Protocolo:** `2025-SAUDE-VIEPI-000001`
**Status:** 💡 Identificado
**Base legal:** Lei 6.259/1975 — notificação compulsória de doenças

**O que fará:**
Notificação e controle de doenças de notificação compulsória, monitoramento
de surtos, campanhas de vacinação e boletins epidemiológicos.

---

### Módulo 05 — Farmácia Municipal
**Sigla:** `FARMA`
**Schema:** `saude_farma.*`
**Package:** `@saude/mod-saude-farma`
**Protocolo:** `2025-SAUDE-FARMA-000001`
**Status:** 💡 Identificado
**Base legal:** Assistência Farmacêutica no SUS — Resoluções CFF

**O que fará:**
Controle de estoque de medicamentos, dispensação para pacientes cadastrados,
rastreabilidade de lotes e relatórios de consumo por período.

---

### Módulo 06 — UBS / Atenção Básica
**Sigla:** `UBS`
**Schema:** `saude_ubs.*`
**Package:** `@saude/mod-saude-ubs`
**Protocolo:** `2025-SAUDE-UBS-000001`
**Status:** 💡 Identificado
**Base legal:** Política Nacional de Atenção Básica (PNAB) — Portaria nº 2.436/2017

**O que fará:**
Gestão das Unidades Básicas de Saúde — cadastro de pacientes por território,
produção assistencial, encaminhamentos e acompanhamento de famílias (ESF).

---

### Módulo 07 — Saúde Mental
**Sigla:** `SMENT`
**Schema:** `saude_sment.*`
**Package:** `@saude/mod-saude-sment`
**Protocolo:** `2025-SAUDE-SMENT-000001`
**Status:** 💡 Identificado
**Base legal:** Lei 10.216/2001 — Reforma Psiquiátrica; Portaria 3.088/2011 — RAPS

**O que fará:**
Acompanhamento de pacientes em saúde mental, gestão de CAPS (Centro de Atenção
Psicossocial) e NASF, controle de internações e alta hospitalar.

---

### Módulo 08 — Campanhas e Vacinação
**Sigla:** `VACIN`
**Schema:** `saude_vacin.*`
**Package:** `@saude/mod-saude-vacin`
**Protocolo:** `2025-SAUDE-VACIN-000001`
**Status:** 💡 Identificado
**Base legal:** PNI — Programa Nacional de Imunizações

**O que fará:**
Controle de estoque de vacinas, registro de aplicações, acompanhamento de
cobertura vacinal por território e alertas de doses pendentes.

---

## 4. Mapa de Prioridade de Desenvolvimento

| Fase | Módulo | Sigla | Justificativa |
|---|---|---|---|
| **Fase 1 — MVP** | TFD | `TFD` | Maior demanda municipal, processo bem definido em lei |
| **Fase 2** | Regulação | `REGUL` | Alto volume de encaminhamentos, complementa o TFD |
| **Fase 3** | UBS / Atenção Básica | `UBS` | Base de toda a saúde municipal |
| **Fase 3** | Farmácia Municipal | `FARMA` | Controle de medicamentos de alto custo |
| **Fase 4** | Vigilância Sanitária | `VISA` | Processo regulatório independente |
| **Fase 4** | Vigilância Epidemiológica | `VIEPI` | Controle e notificação de doenças |
| **Fase 5** | Saúde Mental | `SMENT` | CAPS e RAPS |
| **Fase 5** | Vacinação | `VACIN` | Complemento à atenção básica |

---

## 5. Convenções de Nomenclatura no Código

### Schema do banco
```
saude_{sigla_modulo_lower}

Exemplos:
  saude_tfd.*
  saude_regul.*
  saude_visa.*
  saude_farma.*
```

### Package do módulo
```
@saude/mod-saude-{sigla_modulo_lower}

Exemplos:
  @saude/mod-saude-tfd
  @saude/mod-saude-regul
  @saude/mod-saude-visa
```

### Pasta no monorepo
```
modules/saude/{sigla_modulo_lower}/

Exemplos:
  modules/saude/tfd/
  modules/saude/regulacao/
  modules/saude/visa/
```

### Protocolo de processo
```
ANO-SAUDE-{SIGLA}-SEQUENCIAL (6 dígitos, zerado a cada ano por tenant)

Exemplos:
  2025-SAUDE-TFD-000001
  2025-SAUDE-REGUL-000042
  2025-SAUDE-VISA-000007
```

### Chave em `tenant.modules` (JSONB)
```json
{
  "saude": {
    "tfd": true,
    "regul": false,
    "visa": false,
    "farma": false,
    "ubs": false,
    "sment": false,
    "vacin": false
  }
}
```

### Permissões granulares
```
saude.{modulo}.{acao}

Exemplos TFD:
  saude.tfd.abrir_solicitacao
  saude.tfd.analisar_laudo
  saude.tfd.decidir_solicitacao
  saude.tfd.aprovar_contas
  saude.tfd.gerenciar_saldo
  saude.tfd.configurar
```

---

## 6. Schema Compartilhado — `saude_base`

Além dos schemas por módulo, existe um schema `saude_base` compartilhado por
todos os módulos do sistema de saúde. Ele contém entidades que são comuns a
mais de um módulo e não devem ser duplicadas.

```
saude_base.pacientes      → cadastro único de pacientes por município
saude_base.profissionais  → médicos e profissionais de saúde vinculados ao SUS
saude_base.unidades       → unidades de saúde (UBS, UPA, Hospital, Clínica)
```

**Regra:** módulos nunca duplicam dados que já existem no `saude_base`.
Se um dado é necessário para mais de um módulo, ele pertence ao `saude_base`.

---

## 7. Regras para Adicionar Novo Módulo

```
1. Identificar a área de saúde e sua base legal
2. Adicionar neste mapa com status 📋 Planejado
3. Definir sigla única (verificar que não existe outra igual)
4. Documentar regras de negócio em BUSINESS_RULES.md
5. Documentar contratos em API_CONTRACTS.md
6. Criar schema no DATABASE_SCHEMA.md
7. Criar estrutura no monorepo seguindo MONOREPO.md
8. Registrar permissões em AUTH_PERMISSIONS.md
9. Registrar funcionalidades em platform_features (banco)
```

### Nunca fazer
```
❌ Criar módulo sem sigla definida neste mapa
❌ Usar sigla que já existe em outro módulo
❌ Criar schema sem seguir a convenção saude_{modulo}
❌ Duplicar entidade que já existe no saude_base
❌ Desenvolver módulo sem base legal identificada
```

---

## 8. Relação com o Organograma do Município

Este mapa define a estrutura **padrão** da plataforma. Cada município configura
seu organograma real via Painel Servidor — podendo usar nomes diferentes para os
setores (ex: "Departamento de Regulação e TFD" em vez de "Setor TFD"), mas o
**módulo correspondente na plataforma é sempre o mesmo**.

A tabela `public.modulo_setor_responsavel` faz essa ponte:
```
Município: Altamira/PA
  Setor real: "Coordenadoria de TFD"
  Módulo na plataforma: saude.tfd
  Setor responsável: recebe todas as solicitações TFD abertas
```

---

## 9. Documentos Relacionados

- `ARCHITECTURE.md` — visão técnica de como os módulos se organizam no código
- `DATABASE_SCHEMA.md` — schema completo com todas as tabelas por módulo
- `BUSINESS_RULES.md` — regras de negócio detalhadas por módulo
- `AUTH_PERMISSIONS.md` — permissões granulares por módulo
- `SPRINTS.md` — ordem de implementação por fase
