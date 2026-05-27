# Requisitos do Sistema TFD
**Fonte:** Termo de Referência — Prefeitura Municipal de Papagaios/MG  
**Objeto:** Sistema de Gerenciamento de Filas de Espera por Procedimentos, Exames e Tratamento Fora do Domicílio (TFD), Transporte e Faturamento

---

## 1. Visão Geral do Sistema

O sistema deve ser uma plataforma **web** para gestão de saúde pública municipal, cobrindo três módulos principais:

- **Módulo TFD** — Filas de espera, agendamentos e acompanhamento de pacientes
- **Módulo Transporte** — Gestão de veículos, motoristas e viagens de pacientes
- **Módulo Faturamento** — Gestão financeira dos procedimentos

---

## 2. Requisitos Técnicos e de Infraestrutura

### 2.1 Plataforma
- Sistema 100% **web**, sem necessidade de instalação nas estações clientes
- Acessível pelos principais navegadores: Chrome, Firefox, Safari, Opera e Edge
- Compatível com **dispositivos móveis** (responsivo)
- Sem emulação de terminal, sem plugins de navegador

### 2.2 Segurança
- Toda comunicação via **HTTPS/SSL**
- Suporte mínimo ao protocolo **TLS 1.3**
- Certificado SSL válido para o domínio
- Acesso ao E-SUS/PEC via conexão criptografada SSL/TLS, limitado a IP específico (/32)

### 2.3 Infraestrutura (responsabilidade da contratada)
- Servidor de aplicação, banco de dados e sistema operacional
- Licenciamento de banco de dados, framework e SO incluídos na proposta
- Plataforma e servidor web em versão **LTS** com suporte ativo
- Serviço de **backup** do sistema, banco de dados e arquivos

### 2.4 Infraestrutura (responsabilidade do município)
- Internet local, roteadores e computadores

---

## 3. Requisitos Gerais do Sistema

### 3.1 Identidade Visual
- Configuração com nome da prefeitura, brasão e bandeira do município
- Identidade aplicada em interfaces e relatórios

### 3.2 Autenticação e Segurança de Acesso
- Tela de login com usuário e senha
- Recuperação de senha autônoma (sem contato com suporte)
- Bloqueio automático após tentativas inválidas
- Desbloqueio autônomo pelo próprio usuário
- Logout disponível a qualquer momento

### 3.3 Configurações de Senha (parametrizáveis)
- Tamanho mínimo de senha
- Mínimo de letras maiúsculas
- Mínimo de letras minúsculas
- Mínimo de números
- Mínimo de caracteres especiais
- Número de tentativas antes do bloqueio
- Prazo de expiração da senha
- Controle de reutilização de senhas antigas

### 3.4 Cadastro de Usuários
Campos obrigatórios: usuário de acesso, senha, e-mail, status (ativo/inativo), validade da senha, CPF, CNS, nome, nome social, data de nascimento e filiação.

### 3.5 Controle de Permissões
- Permissões por **perfil/grupo**: definidas para um grupo e aplicadas a todos os usuários vinculados; alterações no grupo refletem automaticamente nos usuários
- Permissões por **usuário individual**: acesso específico sem necessidade de grupo
- Visualização de qual usuário está em qual perfil
- Criação/alteração de perfis a qualquer momento
- Aplicação/reaplicação de perfil para múltiplos usuários de uma vez
- Controle granular: nível de menus, funcionalidades e campos

### 3.6 Acessibilidade
- Modo claro e escuro
- Ajuste de tamanho de fonte
- Busca por menus
- Interface simples, intuitiva e autoexplicativa

---

## 4. Integrações com Bases Oficiais

| Base | Finalidade | Atualização |
|------|-----------|-------------|
| **SIGTAP** | Procedimentos agendados no TFD | Mensal |
| **IBGE** | Cadastro de municípios e UFs | Periódica |
| **CBO** | Registro de ocupações profissionais | Periódica |
| **CNES** | Profissionais e unidades de saúde | Periódica |
| **CID** | Diagnósticos e procedimentos | Periódica |
| **E-SUS/PEC** | Consulta e importação de dados de pessoas físicas | Sob demanda |

---

## 5. Cadastro Único de Pessoas

- Identificação exclusiva por **CPF** e/ou **CNS**
- Unifica cidadãos, profissionais de saúde e funcionários do município
- Sem duplicidade de registros
- Reaproveitamento automático de dados já cadastrados

---

## 6. Módulo TFD — Filas de Espera

### 6.1 Gestão de Filas
- Criação de filas customizáveis pelo município
- Inserção de paciente sempre na **última posição** da fila
- Ordem de chegada respeitada (transparência e justiça)
- Filtros por: fila específica, classificação de risco, situação da solicitação
- Busca de paciente independente da fila

### 6.2 Situações do Paciente na Fila
Todo paciente cadastrado deve estar em uma das três situações:

1. **Aguardando Vaga**
2. **Consulta Agendada**
3. **Retirado da Fila**

### 6.3 Dados para Inclusão na Fila

**Dados do Paciente:**
CPF, CNS, nome, nome social, sexo, data de nascimento, nacionalidade, município e país de nascimento, data de naturalização, portaria de naturalização, data de entrada no Brasil, filiação, cor/raça, identidade de gênero, orientação sexual, etnia, óbito (data e certidão).

**Contato do Paciente:**
Múltiplos telefones, e-mails e endereços por paciente.

**Solicitante do Exame:**
- Médico vinculado ao município: data da solicitação, unidade de saúde e identificação do médico
- Médico não vinculado: data da solicitação, UF, CRM e nome completo

**Detalhes da Solicitação:**
Fila de destino, classificação de risco, código SIGTAP do procedimento, CID principal, CID secundário, CID de causas associadas, motivo do encaminhamento, observações.

### 6.4 Acesso do Paciente
- Geração automática de **login e senha** para o paciente após inclusão na fila
- Portal exclusivo para o paciente em **endereço web separado** do sistema interno
- Funcionários do TFD podem reemitir as credenciais a qualquer momento
- O paciente visualiza no portal:
  - Posição na fila (situação: aguardando vaga)
  - Comprovante completo de agendamento (situação: consulta agendada)
  - Registro de saída da fila (situação: retirado)

### 6.5 Ações para Paciente em "Aguardando Vaga"
- **Alterar posição** na fila (com registro de histórico e justificativa)
- **Remover da fila** → situação muda para "Retirado da Fila" (com histórico)
- **Agendar consulta** → situação muda para "Consulta Agendada"

### 6.6 Agendamento de Consulta
Dados obrigatórios:
- Data e hora do agendamento
- Nome do profissional que atenderá
- Cidade do procedimento
- Nome e endereço completo do local de atendimento
- Telefone do local de atendimento
- Orientações para a consulta
- Necessidade de transporte e acompanhantes
- Se veículo exclusivo é necessário

### 6.7 Comprovante de Agendamento
Gerado automaticamente após o agendamento, contendo:
- Dados do paciente: nome, nome social, CPF, CNS, data de nascimento, telefone, e-mail e endereço
- Dados da consulta: data/hora, procedimento, CIDs, profissional, orientações, local, endereço e telefone
- Dados de transporte e acompanhantes
- Reemissível a qualquer momento por funcionários do TFD

### 6.8 Ações para Paciente em "Consulta Agendada"
- **Editar agendamento** (somente antes da data da consulta)
- **Cancelar consulta** (com histórico de movimentação); ao cancelar, o operador escolhe:
  - Voltar para a **primeira posição** da fila
  - Voltar para a **última posição** da fila
- **Registrar comparecimento** (após a data da consulta):
  - Compareceu: encerramento do ciclo
  - Não compareceu: obrigatório informar o motivo
- **Remover da fila** → situação muda para "Retirado da Fila" (com histórico)

### 6.9 Histórico de Movimentações
- Registra **todas** as movimentações do paciente desde a entrada até o encerramento
- Campos obrigatórios: data/hora, usuário responsável, tipo de movimentação, justificativa
- Campo opcional: anexo de justificativa
- Acesso restrito a usuários autorizados
- Impacto em outros registros também deve ser registrado (rastreabilidade completa)

---

## 7. Módulo Transporte

### 7.1 Recepção de Pacientes do TFD
O sistema TFD envia automaticamente ao módulo de transporte:
- Dados do paciente: nome, sexo, nacionalidade, CPF, CNS
- Necessidade de veículo exclusivo e acompanhantes
- Dados da viagem: origem, destino, data e horário de chegada no destino

### 7.2 Cadastro de Locais (Pontos de Origem/Destino)
Campos: nome do estabelecimento, endereço, bairro, cidade, estado, CEP, complemento e referência.

### 7.3 Cadastro de Frota
Campos: tipo (próprio ou terceiro), placa, fabricante (marca), modelo, cor predominante, total de assentos, categoria mínima de CNH, ano de fabricação, RENAVAM e chassi.

### 7.4 Cadastro de Motoristas
Campos: nome, nome social, CNS, número da CNH, categoria da CNH, validade da CNH, sexo, data de nascimento, nacionalidade e município de nascimento.

### 7.5 Passageiro Avulso (sem integração com TFD)
Campos: dados do paciente (nome, sexo, nacionalidade, CPF, CNS), necessidade de veículo exclusivo, acompanhantes, trajeto de ida (origem, destino, saída e chegada) e trajeto de volta (origem, destino, saída e chegada).

---

## 8. Módulo Faturamento

> O TR menciona faturamento como parte do escopo, com integração ao TFD e transporte. Os requisitos detalhados de faturamento devem ser desenvolvidos com base nas horas de adaptação contratadas com o município.

---

## 9. Horas de Adaptação (Customização)

- Desenvolvimento de funcionalidades não presentes originalmente no sistema
- Custo calculado por esforço técnico, apresentado em proposta prévia
- Prazos acordados formalmente entre as partes
- Escopo aprovado pelo município antes do início
- Funcionalidades customizadas têm garantia de funcionamento compatível com o restante do sistema
- Se contratado pacote de horas, saldo é descontado por solicitação e informado periodicamente

---

## 10. Suporte Técnico

- Atendimento remoto (telefone, e-mail, acesso remoto, mensagem instantânea): **ilimitado**
- Horário de atendimento: segunda a sexta, **07h às 17h** (exceto feriados nacionais)
- Atendimento presencial quando necessário, em até **24 horas** para casos de alta prioridade
- Visitas presenciais semanais à sede do município (mínimo 1x/semana)
- Visitas apenas em dias úteis, duração mínima de **8 horas**
- Datas e horários definidos pelo município (sem sábados, domingos ou feriados)
- Todos os custos de deslocamento, hospedagem e alimentação por conta da contratada
- Manutenção legal e corretiva contínua durante a vigência do contrato

---

## 11. Implantação e Capacitação

### 11.1 Implantação
- Instalação, parametrização, adaptação e ajustes no servidor e em todos os computadores dos setores de saúde indicados pelo município
- Prazo: **5 dias úteis** após o recebimento da ordem de fornecimento

### 11.2 Capacitação — Etapa 1 (Teórica)
- Material em PDF elaborado pela contratada
- Conteúdo: principais funcionalidades do sistema

### 11.3 Capacitação — Etapa 2 (Prática)
- Uso direto do sistema com um técnico da contratada
- Carga horária mínima: **20 horas/semana**
- Extensiva a todos os usuários do sistema
- Realizada no horário de expediente do município
- Local: dependências do município (equipamentos fornecidos pelo município)
- Custos de deslocamento, estadia e alimentação do técnico: por conta da contratada
- Técnico deve comparecer uniformizado para identificação
- Manuais em PDF das principais rotinas disponibilizados para os usuários

---

## 12. Critérios de Avaliação (Prova de Conceito)

- A licitante vencedora deve disponibilizar **ambiente web próprio com base de demonstração**
- Infraestrutura de computadores e periféricos: responsabilidade da licitante
- A comissão avaliará funcionalidades **além dos padrões mínimos do Ministério da Saúde**
- Aprovação exige atendimento de no mínimo **95% das funcionalidades** de cada módulo
- Prazo para recurso após a apresentação: **2 dias úteis**
- Julgamento do recurso: até **5 dias úteis**
- Em caso de reprovação, a próxima licitante classificada é convocada

---

## 13. Qualificação Técnica Exigida (para licitação)

| Documento | Responsável |
|-----------|-------------|
| Atestado de Capacidade Técnica em licenciamento de software web para saúde pública | Empresa |
| Certificado de aptidão vinculado ao Ministério da Saúde | Empresa |
| Certificado de LGPD | Responsável pela gestão do sistema |
| Certificado em serviços de nuvem e segurança da informação | Empresa |
| Certificado de especialização em gestão de saúde | Responsável pela consultoria |
| Diploma superior em TI (engenharia/ciências da computação, SI ou correlato) | Responsável pela instalação |
| Certificado de especialização em segurança da informação | Responsável pela política de segurança |
| Diploma de Mestrado em Enfermagem | Responsável pela consultoria e assessoria |
| Comprovação de experiência em atenção básica | Responsável pela análise de relatórios |

---

## 14. Condições Contratuais

| Item | Detalhe |
|------|---------|
| Itens do contrato | Item 1.1: 4 meses de implantação / Item 1.2: 12 meses de licença + suporte |
| Critério de julgamento | Menor preço por lote |
| Prazo de entrega | 5 dias úteis após ordem de fornecimento |
| Prazo de pagamento | Até 30 dias após entrega da NF aprovada |
| Retenções | IRRF conforme Decreto Municipal 1.849/2023 e IN RFB 1.234/2012 |
| Subcontratação | Proibida sem consentimento expresso do município |
| Garantia | Conforme Lei 8.078/1990 (Código de Defesa do Consumidor) |
| Dotação orçamentária | Ficha 00677 — Fonte SUS Gov. Fed. (Bl. Man. ASPS) |
| Gestor do contrato | Danilo Lopes Santana |
| Fiscal do contrato | Lucas Vitor Gonçalves |

---

*Documento gerado a partir do Termo de Referência da Prefeitura Municipal de Papagaios/MG.*
