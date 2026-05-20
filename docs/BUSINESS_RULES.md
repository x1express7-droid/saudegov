# BUSINESS_RULES.md
# saudegov — Regras de Negócio

> **Instruções para o agente do Cursor:** Consulte este arquivo antes de implementar
> qualquer lógica de negócio, validação, fluxo de status, cálculo financeiro ou
> disparo de notificação. As regras aqui documentadas refletem obrigações legais
> (Portaria SAS/MS nº 55/1999 e legislação complementar) e decisões de produto.
> Não são sugestões — são obrigações. Nunca implemente um fluxo sem verificar
> a regra correspondente neste documento.

---

## 1. Módulo TFD — Tratamento Fora de Domicílio

### 1.1 Definição Legal e Escopo

O TFD é regulamentado pela **Portaria SAS/MS nº 55, de 24 de fevereiro de 1999**
e consiste em custear o deslocamento de pacientes do SUS para tratamento médico
em município diferente do seu domicílio, quando esgotados todos os meios de
tratamento locais.

**Condições obrigatórias para elegibilidade (Art. 1º, Portaria 55/1999):**
- Esgotamento comprovado dos meios de tratamento no município de origem
- Deslocamento mínimo de **50 km** entre o município de origem e o destino
- Paciente atendido exclusivamente na **rede pública ou conveniada/contratada do SUS**
- Procedimento de **média ou alta complexidade** — vedado para PAB (Atenção Básica)
- Garantia prévia de atendimento no destino com **data e hora definidos**

**Modalidades (definidas na Portaria 55/1999):**
- **TFD Intermunicipal:** deslocamento dentro do mesmo estado → responsabilidade e
  custeio da Secretaria **Municipal** de Saúde
- **TFD Interestadual:** deslocamento para outro estado → responsabilidade da
  Secretaria **Estadual** de Saúde

> O sistema atende primariamente o **TFD Intermunicipal** — custeado e gerenciado
> pelo município. O TFD Interestadual pode ser registrado para controle, mas o
> custeio é estadual.

---

### 1.2 Fluxo de Status — Processo TFD

O processo TFD segue um fluxo rígido de status. Transições inválidas devem ser
rejeitadas com erro 422.

```
RASCUNHO
  ↓ servidor salva e envia
ENVIADO
  [AUTO] notifica gestor + servidores do setor de regulação
  ↓ servidor (com analisar_laudo) abre o processo
EM_ANALISE
  ├──► PENDENTE (servidor solicita complemento)
  │    [AUTO] notifica solicitante
  │    ↓ servidor envia complemento → volta para EM_ANALISE
  │    prazo 30 dias sem retorno → alerta gestor
  │    prazo 60 dias sem retorno → gestor pode cancelar
  │
  ├──► NEGADO (gestor nega com fundamentação obrigatória)
  │    [AUTO] notifica solicitante com fundamentação
  │
  └──► APROVADO (gestor aprova com fundamentação obrigatória)
       [AUTO] verifica saldo disponível atomicamente
       [AUTO] cria reserva_saldo
       [AUTO] notifica solicitante da aprovação
       ↓ servidor cria viagem (mínimo 72h de antecedência)
       AGENDADO
       [AUTO] notifica paciente e motorista 48h antes da viagem
       ↓ [AUTO] data da viagem chegou
       EM_VIAGEM
       ↓ servidor registra retorno
       AGUARDANDO_PC (prazo: data_viagem + 10 dias corridos)
       [AUTO] alerta servidor 48h antes do vencimento do prazo
       ↓ servidor lança despesas e envia prestação
       PC_EM_ANALISE
       [AUTO] notifica gestor financeiro
       ↓ gestor aprova (após visualizar TODOS os comprovantes)
       CONCLUIDO
       [AUTO] consome reserva_saldo → atualiza valor utilizado

Em qualquer etapa antes de AGENDADO:
CANCELADO (motivo obrigatório)
  [AUTO] libera reserva_saldo se existia
```

### 1.3 Tabela de Transições de Status Permitidas

| De | Para | Papel mínimo | Condição obrigatória |
|---|---|---|---|
| `RASCUNHO` | `ENVIADO` | SERVIDOR + `abrir_solicitacao` | Laudo anexado e confirmado |
| `ENVIADO` | `EM_ANALISE` | SERVIDOR + `analisar_laudo` | — |
| `EM_ANALISE` | `PENDENTE` | SERVIDOR + `solicitar_complemento` | Texto do complemento obrigatório |
| `PENDENTE` | `EM_ANALISE` | SERVIDOR + `analisar_laudo` | Complemento enviado pelo solicitante |
| `EM_ANALISE` | `APROVADO` | GESTOR + `decidir_solicitacao` | Fundamentação ≥ 20 chars + saldo disponível |
| `EM_ANALISE` | `NEGADO` | GESTOR + `decidir_solicitacao` | Fundamentação ≥ 20 chars obrigatória |
| `APROVADO` | `AGENDADO` | SERVIDOR + `agendar_viagem` | Data ≥ 72h no futuro + motorista CNH válida |
| `AGENDADO` | `EM_VIAGEM` | AUTOMÁTICO | Data da viagem chegou (job agendado) |
| `EM_VIAGEM` | `AGUARDANDO_PC` | SERVIDOR + `registrar_retorno` | — |
| `AGUARDANDO_PC` | `PC_EM_ANALISE` | SERVIDOR + `enviar_prestacao` | ≥ 1 item de despesa lançado |
| `PC_EM_ANALISE` | `CONCLUIDO` | GESTOR + `aprovar_prestacao` | Todos comprovantes visualizados |
| `PC_EM_ANALISE` | `AGUARDANDO_PC` | GESTOR + `aprovar_prestacao` | Rejeição com observação obrigatória |
| Qualquer (antes de AGENDADO) | `CANCELADO` | GESTOR + `cancelar_processo` | Motivo obrigatório |

---

### 1.4 Regras de Abertura de Solicitação

**Dados obrigatórios para salvar como RASCUNHO:**
- Paciente identificado (CPF ou CNS vinculado)
- Tipo de atendimento (CONSULTA, RETORNO, EXAME, CIRURGIA)
- Especialidade
- Pelo menos 1 procedimento
- Urgência
- Prestador de destino

**Dados obrigatórios para ENVIAR (RASCUNHO → ENVIADO):**
- Tudo do rascunho acima
- Laudo médico anexado e confirmado no storage (PDF, JPEG ou PNG, máx. 10MB)
- Laudo assinado pelo médico assistente vinculado ao SUS (Art. 6º, Portaria 55/1999)

**Regra de RETORNO:**
- Tipo `RETORNO` exige `solicitacao_origem_id` vinculado a uma solicitação anterior
  do **mesmo paciente** com status `CONCLUIDO`
- Sistema valida automaticamente — erro 422 se não cumprido
- Laudo médico deve ser renovado a cada **6 meses** (Manual TFD)

**Regra de ACOMPANHANTE (Art. 7º, Portaria 55/1999):**
- Acompanhante só é autorizado quando o médico **justifica no laudo** a
  impossibilidade do paciente se deslocar desacompanhado
- **Obrigatório por lei:** menores de idade e maiores de 60 anos
  (Portaria MS nº 280/1999)
- CPF do acompanhante ≠ CPF do paciente (validação obrigatória)
- Apenas 1 acompanhante por solicitação (exceção: menores de 2 anos com
  justificativa médica podem ter 2)

**Regra de URGÊNCIA:**
- `MUITO_URGENTE`: sinalização visual prioritária na fila + notificação imediata
  ao gestor no momento do envio
- As demais urgências seguem ordem de chegada na fila

---

### 1.5 Regras de Regulação e Decisão

**Fundamentação obrigatória (Art. 6º, Portaria 55/1999):**
- Toda aprovação exige fundamentação com mínimo de 20 caracteres
- Toda negativa exige fundamentação com mínimo de 20 caracteres
- Fundamentação é registrada no banco e aparece na tramitação

**Regras de aprovação:**
- O gestor deve selecionar o saldo financeiro que custeará a viagem
- O sistema verifica atomicamente (SELECT FOR UPDATE) o saldo disponível
- Se saldo insuficiente → erro 422 → gestor deve cadastrar novo saldo ou ajustar
- Na aprovação, o sistema cria automaticamente uma `reserva_saldo` com valor estimado
- O valor estimado é informado pelo gestor no momento da aprovação

**Regras de negativa:**
- Processo negado encerra o fluxo naquela solicitação
- Solicitante pode abrir nova solicitação com documentação complementar
  (não há recurso formal no sistema — orientar externamente)

**Vedações legais (Art. 1º §3º e §5º, Portaria 55/1999):**
- Não autorizar TFD para procedimentos do **PAB (Piso de Atenção Básica)**
- Não autorizar TFD para **tratamentos experimentais**
- Não autorizar TFD para deslocamentos **menores de 50 km**
- Não pagar diárias para pacientes **hospitalizados** no destino
- Não pagar TFD em **regiões metropolitanas** (distância insuficiente)

---

### 1.6 Regras de Agendamento de Viagem

**Antecedência mínima:**
- Data da viagem deve ser ≥ **72 horas** a partir do momento do agendamento
- Sistema bloqueia datas inválidas — erro 422 antes de salvar

**Motorista:**
- Apenas motoristas com CNH **válida na data da viagem** podem ser selecionados
- CNH vencida → motorista não aparece na lista de seleção
- CNH vencendo em ≤ 30 dias → alerta visual no cadastro do motorista

**Veículo:**
- Apenas veículos com `ativo = true` aparecem para seleção
- Capacidade de passageiros deve comportar paciente + acompanhante (se houver)

**Notificação automática 48h antes:**
- Sistema envia notificação in-app para o servidor responsável e motorista
- Se ambos os canais falharem → alerta visual na dashboard do gestor para
  contato manual

**Múltiplas viagens por solicitação:**
- Uma solicitação aprovada pode ter mais de uma viagem (ex: ida e retorno)
- Cada viagem tem sua própria prestação de contas
- Campo `sequencia` (1, 2, 3...) identifica a ordem das viagens

---

### 1.7 Regras de Prestação de Contas

**Prazo de envio:**
- Prestação deve ser enviada em até **10 dias corridos** após a data de retorno
- Sistema calcula automaticamente: `prazo_envio_at = data_retorno + 10 dias`
- Alerta automático para o servidor responsável **48h antes** do vencimento
- Prazo vencido sem envio → alerta na dashboard do gestor

**Despesas permitidas (Art. 4º, Portaria 55/1999):**
- `TRANSPORTE` → passagem terrestre, aérea ou fluvial (canhoto obrigatório)
- `ALIMENTACAO` → ajuda de custo para alimentação (valor definido por tabela SUS)
- `HOSPEDAGEM` → diária de pernoite (apenas quando necessário)
- `OUTRO` → outros gastos justificados com comprovante

**Regra dos comprovantes:**
- Todo item de despesa com valor ≥ R$ 50,00 exige comprovante anexado
- Comprovante é um anexo vinculado ao item de despesa
- Transporte: canhoto de passagem ou comprovante de compra obrigatório
  (Art. 1º §1º, Portaria SAS/MS 55/1999)

**Regra de aprovação da prestação:**
- Botão "Aprovar Prestação" fica **desabilitado** até o gestor abrir
  individualmente cada comprovante
- Sistema registra quais comprovantes foram visualizados em `comprovantes_vistos`
- Aprovação sem visualizar todos → erro 422

**Efeito da aprovação:**
- `reserva_saldo.status` → `CONSUMIDA`
- Registra `movimentacao_saldo` tipo `CONSUMO` com valor real gasto
- Se valor real < valor estimado → registra `LIBERACAO` da diferença
- `solicitacao.status` → `CONCLUIDO`
- `processo.status` → `CONCLUIDO`

**Efeito da rejeição:**
- `prestacao.status` → `REJEITADA`
- Gestor deve informar observação obrigatória explicando o problema
- Servidor recebe notificação e pode corrigir e reenviar
- Status da solicitação volta para `AGUARDANDO_PC`

---

### 1.8 Regras Financeiras — Saldos

**Cadastro de saldo:**
- Todo saldo tem: descrição, fonte de recurso, valor total, período de competência
- Fontes permitidas: FEDERAL_FNS, ESTADUAL, MUNICIPAL_PROPRIO, EMENDA_PARLAMENTAR
- Um saldo pode ser associado a procedimentos específicos (campo JSONB)
- Um saldo pode ser associado a especialidades específicas (campo JSONB)

**Cálculo do saldo disponível:**
```
Disponível = valor_total
           - SUM(reservas_saldo.valor_estimado WHERE status = 'ATIVA')
           - SUM(movimentacoes_saldo.valor WHERE tipo = 'CONSUMO')
```

**Alerta de saldo baixo:**
- Se `disponível < 20%` do `valor_total` → alerta visual na dashboard do gestor
- Alerta não bloqueia operações — é apenas visual

**Reserva automática na aprovação:**
- Criada automaticamente pelo sistema — o gestor não cria manualmente
- Valor é o estimado informado pelo gestor na decisão de aprovação
- Status inicia como `ATIVA`
- Liberada automaticamente se processo for `CANCELADO`
- Consumida automaticamente na aprovação da prestação de contas

**Imutabilidade do extrato:**
- Registros em `movimentacoes_saldo` são imutáveis (sem `updated_at`)
- Correções são feitas com novo registro tipo `ESTORNO`
- Toda movimentação registra quem executou (`usuario_id` obrigatório)

---

### 1.9 Regras de Cancelamento

**Quem pode cancelar:** GESTOR + permissão `cancelar_processo`

**Quando pode cancelar:** qualquer status **antes de `AGENDADO`**
- Após `AGENDADO` não é possível cancelar pelo sistema — contato direto
  com o gestor para situações excepcionais

**Motivo obrigatório:** campo texto obrigatório, mínimo 20 caracteres

**Efeitos automáticos do cancelamento:**
- Se havia `reserva_saldo` com status `ATIVA` → muda para `LIBERADA`
- Registra `movimentacao_saldo` tipo `LIBERACAO`
- Registra tramitação tipo `CANCELAMENTO` com motivo
- Notifica servidor responsável pelo processo

---

### 1.10 Automações Obrigatórias

| Gatilho | Ação automática |
|---|---|
| Solicitação enviada | Identifica setor via `modulo_setor_responsavel` → notifica gestor + servidores |
| Solicitação `MUITO_URGENTE` | Notificação imediata ao gestor além da notificação padrão |
| Aprovação | Verifica saldo atomicamente → cria reserva → registra movimentação RESERVA |
| Aprovação com saldo insuficiente | Bloqueia com erro 422 — não aprova |
| Agendamento criado | Agenda job para 48h antes: notificar servidor e motorista |
| Ambos os canais de notificação falham | Alerta visual na dashboard do gestor |
| CNH do motorista vencida | Não aparece na listagem de seleção |
| CNH vencendo em ≤ 30 dias | Alerta visual no cadastro do motorista |
| Data da viagem chegou | Job muda status para `EM_VIAGEM` automaticamente |
| Retorno registrado | Cria prestação com prazo `data_viagem + 10 dias` + agenda alerta |
| 48h antes do prazo da PC | Notifica servidor responsável |
| PENDENTE há 30 dias | Alerta no painel do gestor |
| PENDENTE há 60 dias | Gestor habilitado a cancelar com motivo "prazo esgotado" |
| Prestação aprovada | Consome reserva → registra movimentação → conclui processo |
| Processo cancelado | Libera reserva → registra movimentação LIBERAÇÃO |
| Saldo disponível < 20% | Alerta visual na dashboard do gestor |

---

### 1.11 Proteção de Dados de Saúde (LGPD Art. 11)

Dados clínicos do TFD são **dados sensíveis** conforme LGPD Art. 11:

**Campos restritos:**
- `cid_principal` — nunca retornar em listagens
- `diagnostico` — nunca retornar em listagens
- Laudo médico (arquivo) — URL pré-assinada com expiração de 15 minutos

**Regras de acesso:**
- CID e diagnóstico: visíveis apenas no detalhe individual + permissão `analisar_laudo`
- Laudo: botão "Visualizar" gera URL pré-assinada de 15 min + registra `READ_SENSITIVE`
- Relatórios exportados: excluem CID e diagnóstico por padrão
- Listagens gerais: mostram apenas protocolo, especialidade, prestador, urgência e status

**Auditoria de acesso a dados sensíveis:**
- Toda leitura de CID/diagnóstico registra `audit_log` com `acao = 'READ_SENSITIVE'`
- Toda visualização de laudo registra `audit_log` com `acao = 'READ_SENSITIVE'`

**CPF do acompanhante:**
- Exibido mascarado em telas de listagem: `***.123.***-**`
- Completo apenas na tela de detalhe com permissão `analisar_laudo`

---

### 1.12 Relatórios Obrigatórios

Todo relatório deve:
- Registrar em `audit_logs` quem gerou, com quais filtros e quando
- Excluir CID e diagnóstico por padrão
- Incluir no rodapé do PDF: `"Relatório gerado por [Nome] em [data/hora] — saudegov"`

**Relatórios disponíveis:**
- Por competência (mês/ano): totais, status, valores gastos
- Por paciente: histórico de solicitações (sem dados clínicos)
- Por prestador: volume por hospital/clínica de destino
- Por motorista: viagens realizadas no período
- Extrato financeiro: movimentações de saldo por período
- Produção mensal: aprovadas, negadas, concluídas, canceladas

---

### 1.13 Regras de Validação de Dados

**CPF:**
- Apenas dígitos (sem máscara no banco)
- Validar dígitos verificadores antes de salvar
- Unicidade por `(tenant_id, cpf)` na tabela `saude_base.pacientes`

**CNS (Cartão Nacional de Saúde):**
- 15 dígitos numéricos
- Validar algoritmo de verificação do CNS antes de salvar
- Unicidade por `(tenant_id, cns)` na tabela `saude_base.pacientes`

**Arquivos:**
- Tamanho máximo: **10 MB**
- Tipos permitidos: PDF, JPEG, PNG
- Nome sanitizado antes de armazenar (sem caracteres especiais)

**Textos:**
- Fundamentação de decisão: mínimo 20 caracteres
- Motivo de cancelamento: mínimo 20 caracteres
- Observação de rejeição de prestação: mínimo 20 caracteres
- Nunca renderizar HTML de input do usuário

**Datas:**
- Todas as datas no banco em `TIMESTAMPTZ`
- Exibição sempre no timezone do município (`tenant.settings.timezone`)
- Data da viagem: mínimo 72h no futuro (validação no momento do agendamento)

---

### 1.14 Notificações Obrigatórias por Evento

| Evento | Destinatário | Canal |
|---|---|---|
| Solicitação enviada | Gestor + servidores do setor | In-app + e-mail |
| Solicitação MUITO_URGENTE | Gestor (adicional) | In-app + e-mail imediato |
| Complemento solicitado | Servidor solicitante | In-app + e-mail |
| Solicitação aprovada | Servidor responsável | In-app + e-mail |
| Solicitação negada | Servidor responsável | In-app + e-mail |
| 48h antes da viagem | Servidor responsável + motorista | In-app + e-mail |
| Retorno registrado | Servidor responsável | In-app |
| 48h antes do prazo da PC | Servidor responsável | In-app + e-mail |
| Prestação enviada | Gestor financeiro | In-app + e-mail |
| Prestação aprovada | Servidor responsável | In-app |
| Prestação rejeitada | Servidor responsável | In-app + e-mail |
| Processo cancelado | Servidor responsável | In-app |
| PENDENTE há 30 dias | Gestor | In-app |
| Saldo < 20% disponível | Gestor | In-app |

**Regra de fallback:**
- Se envio de e-mail falhar → registra `status = 'FALHOU'` + tenta novamente após 15min
- Após 3 falhas → registra como falha definitiva + notifica gestor via in-app

---

## 2. Regras Globais da Plataforma

### 2.1 Geração de Protocolo

Formato: `ANO-SAUDE-{SIGLA}-{SEQUENCIAL}`

```
2025-SAUDE-TFD-000001  → 1ª solicitação TFD de 2025 do município
2025-SAUDE-TFD-000042  → 42ª solicitação TFD de 2025 do município
2026-SAUDE-TFD-000001  → reinicia a cada virada de ano
```

- Sequencial reinicia a cada virada de ano, por município
- Geração atômica com `SELECT FOR UPDATE` para evitar duplicatas
- Protocolo é único por município — dois municípios diferentes podem ter
  `2025-SAUDE-TFD-000001` sem conflito (isolamento por `tenant_id`)

### 2.2 Auditoria Obrigatória

Toda ação de escrita registra em `public.audit_logs`:

| Ação | O que registrar |
|---|---|
| CREATE | `payload_depois` com dados criados |
| UPDATE | `payload_antes` + `payload_depois` |
| DELETE / soft delete | `payload_antes` |
| Mudança de status | Status anterior + novo |
| Login / Logout | `acao: LOGIN/LOGOUT` |
| Leitura de dado sensível | `acao: READ_SENSITIVE` |
| Exportação de relatório | `acao: EXPORT` com filtros usados |

**Campos que nunca entram no audit log:**
- Senhas (mesmo hash)
- CID e diagnóstico em texto puro (registrar apenas que o dado foi acessado)
- CPF completo (registrar apenas últimos 3 dígitos: `***.***.***.123`)

### 2.3 Retenção de Dados

| Tipo de dado | Retenção mínima | Base |
|---|---|---|
| Processos TFD completos | **10 anos** após conclusão | Resolução CFM / LGPD |
| Audit logs | 5 anos | LGPD + boas práticas |
| Logs de acesso | 6 meses | Marco Civil da Internet |
| Dados de usuário inativo | Até solicitação de exclusão | LGPD Art. 18 |

---

## 3. Documentos Relacionados

- `DATABASE_SCHEMA.md` — estrutura das tabelas que suportam estas regras
- `AUTH_PERMISSIONS.md` — quem pode executar cada ação descrita aqui
- `SECURITY.md` — LGPD e proteção de dados sensíveis de saúde
- `API_CONTRACTS.md` — como as regras são expostas via API e Server Actions
- `MUNICIPAL_MAP.md` — mapa de módulos e suas bases legais
