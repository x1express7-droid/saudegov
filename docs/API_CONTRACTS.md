# API_CONTRACTS.md
# saudegov — Contratos de API e Server Actions

> **Instruções para o agente do Cursor:** Consulte este arquivo antes de implementar
> qualquer Server Action, API Route, formulário ou componente que consuma dados.
> Os contratos aqui são a fonte de verdade para entrada e saída de dados. Nunca
> implemente uma action com assinatura diferente da documentada aqui. Nunca altere
> um contrato existente sem atualizar este documento.

---

## 1. Padrões Globais

### 1.1 Formato de Resposta

```typescript
// Sucesso
{ success: true, data: T }

// Erro
{ success: false, error: string, fieldErrors?: Record<string, string[]> }
```

### 1.2 Paginação

```typescript
interface PaginacaoInput {
  page?: number     // padrão: 1
  perPage?: number  // padrão: 20, máximo: 100
}

interface PaginatedResult<T> {
  items: T[]
  total: number
  page: number
  perPage: number
  totalPages: number
}
```

### 1.3 Campos que NUNCA aparecem em listagens
- `cid_principal` e `diagnostico`
- `password_hash`
- CPF completo (apenas mascarado: `***.456.***-**`)

---

## 2. Core — Autenticação

### 2.1 Login
```typescript
// Gerenciado pelo NextAuth — POST /api/auth/callback/credentials
Input: { email: string; password: string }
// Resultado: sessão JWT ou redirect /login?error=CredentialsSignin
```

### 2.2 Recuperar Senha
```typescript
// Server Action: solicitarRecuperacaoSenha
Input: { email: string }
Output: ActionResponse<void>
// Sempre retorna sucesso — não confirma se e-mail existe
```

### 2.3 Redefinir Senha
```typescript
// Server Action: redefinirSenha
Input: { token: string; novaSenha: string; confirmacao: string }
Output: ActionResponse<void>
// Erro 422 se token expirado ou já usado
```

---

## 3. Core — Tenant (Painel Dev — SUPERADMIN)

### 3.1 Listar Municípios
```typescript
// Server Action: getMunicipios
Input: PaginacaoInput & { ativo?: boolean; busca?: string }
Output: ActionResponse<PaginatedResult<{
  id: string; slug: string; name: string
  domain: string; domain_custom: string | null
  modules: Record<string, Record<string, boolean>>
  active: boolean; totalUsuarios: number; criadoEm: string
}>>
```

### 3.2 Criar Município
```typescript
// Server Action: criarMunicipio
Input: {
  name: string; slug: string; cnpj: string
  tipoDominio: 'SUBDOMINIO' | 'CUSTOM'
  domainCustom?: string        // obrigatório se CUSTOM
  theme: { primaryColor: string; municipalityName: string; logoUrl?: string }
  settings: { timezone: string; notificationEmail: string }
  modulosAtivos: { saude?: { tfd?: boolean } }
  adminEmail: string; adminName: string
}
Output: ActionResponse<{
  tenantId: string; domain: string
  adminTempPassword: string    // exibido uma única vez
}>
// Cria subdomínio via API Cloudflare automaticamente
```

### 3.3 Ativar/Desativar Módulo
```typescript
// Server Action: alternarModulo
Input: { tenantId: string; sistema: string; modulo: string; ativo: boolean }
Output: ActionResponse<void>
// Atualiza módulos do tenant no banco
```

### 3.4 Suspender Município
```typescript
// Server Action: suspenderMunicipio
Input: { tenantId: string; motivo: string }
Output: ActionResponse<void>
// active → false; resolver passa a retornar null para o domínio
```

### 3.5 Exportar Dados do Município
```typescript
// Server Action: exportarDadosMunicipio (apps/painel-dev/lib/actions/exportar-dados-municipio.ts)
// Papel: SUPERADMIN (requireSuperAdmin) — sem permissão granular de tenant
// Paridade: painel_dev = true, painel_servidor = false
// tenantId vem do input validado (operação sobre tenant alheio), não da sessão
Input: {
  tenantId: string          // UUID do município alvo
  formato: 'json' | 'csv'
  modulos?: string[]        // chaves saude.* (tfd, regul, …); omitido = todos os ativos do tenant
  dataInicio?: string       // AAAA-MM-DD — filtra created_at onde aplicável
  dataFim?: string
}
Output: ActionResponse<{
  downloadUrl: string
  expiresAt: string         // ISO — link pré-assinado (24h)
  totalRegistros: number
}>
// Camada 1: tenant existe e active = true (getPrismaAdmin)
// Camada 2: requireSuperAdmin()
// Camada 3: exportacaoMunicipioSchema (apps/painel-dev/lib/validators/exportacao-municipio.schema.ts)
// Coleta: coletarDadosMunicipioExport via getPrismaForTenant(tenantId) + tenant_id explícito em cada query
// Módulo tfd: solicitações, viagens, prestações, saldos, pacientes (CPF/CNS mascarados)
// Demais módulos ativos: entrada em modulosSemDados até implementação futura
// ❌ Nunca: cid_principal, diagnostico, laudo, fundamentacao clínica
// JSON: metadados + dados + rodape (formatRodapeExport)
// CSV: colunas Modulo, Entidade, Referência, Status, Data, Detalhe + rodapé §1.12
// Audit EXPORT: entidade plataforma_exportacao_municipio
//   payloadDepois: { tenantId, tenantNome, modulos, formato, dataInicio, dataFim, totalRegistros, expiresAt }
// platform_features: sistema plataforma, funcionalidade exportar_dados_municipio
// Download: GET /api/storage/export-download/[exportId]?fmt=json|csv (Painel Dev)
```

---

## 4. Core — Configuração do Município (ADMIN)

### 4.1 Criar Setor
```typescript
// Server Action: criarSetor
Input: { nome: string; sigla?: string; departamentoId: string; emailSetor?: string; responsavelId?: string }
Output: ActionResponse<{ id: string }>
```

### 4.2 Definir Setor Responsável por Módulo
```typescript
// Server Action: definirSetorResponsavelModulo
Input: { modulo: string; setorId: string }  // modulo: 'saude.tfd'
Output: ActionResponse<void>
```

### 4.3 Criar Servidor
```typescript
// Server Action: criarServidor
Input: {
  name: string; email: string; cpf: string; matricula?: string
  setorId: string; cargo?: string; role: 'GESTOR' | 'SERVIDOR'
}
Output: ActionResponse<{ userId: string; tempPassword: string }>
```

### 4.4 Atualizar Permissões
```typescript
// Server Action: atualizarPermissoes
Input: { userId: string; permissions: Record<string, boolean> }
Output: ActionResponse<void>
// Invalida sessão ativa do usuário
// Registra audit_log com payload_antes e payload_depois
```

---

## 5. Módulo TFD — Configuração (ADMIN/GESTOR)

### 5.1 Especialidades e Procedimentos
```typescript
// criarEspecialidade: Input: { nome: string } → Output: ActionResponse<{ id: string }>
// atualizarEspecialidade: Input: { id: string; nome?: string; ativa?: boolean } → ActionResponse<void>
// criarProcedimento: Input: { especialidadeId: string; nome: string; codigoSigtap?: string } → ActionResponse<{ id: string }>
```

### 5.2 Prestadores
```typescript
// Server Action: criarPrestador
Input: {
  nome: string; cnpj?: string; cnes?: string
  cidade: string; estado: string  // UF 2 chars
  telefone?: string; especialidades: string[]  // array de IDs
}
Output: ActionResponse<{ id: string }>
```

### 5.3 Veículos
```typescript
// Server Action: criarVeiculo
Input: { placa: string; modelo: string; capacidadePassageiros: number }
Output: ActionResponse<{ id: string }>
// Erro 409 se placa duplicada no município
```

### 5.4 Motoristas
```typescript
// Server Action: criarMotorista
Input: { userId: string; cnh: string; cnhCategoria: string; cnhValidade: string }
Output: ActionResponse<{ id: string }>
// Alerta se cnhValidade ≤ 30 dias
```

### 5.5 Saldos
```typescript
// Server Action: criarSaldo
// Papel: GESTOR + saude.tfd.gerenciar_saldo
Input: {
  descricao: string
  fonte: 'FEDERAL_FNS' | 'ESTADUAL' | 'MUNICIPAL_PROPRIO' | 'EMENDA_PARLAMENTAR'
  valorTotal: number  // positivo
  competenciaInicio: string; competenciaFim: string  // ISO 8601 date
}
Output: ActionResponse<{ id: string }>
// Registra movimentacao_saldo tipo CREDITO

// Server Action: desativarSaldoTfd
// Papel: GESTOR + saude.tfd.gerenciar_saldo
Input: { saldoId: string }
Output: ActionResponse<void>
// saldo.ativo → false; extrato e movimentações preservados
// Não dispara SALDO_BAIXO (saldo inativo não gera alerta)

// Server Action: estornarMovimentacaoSaldoTfd (Sprint 2.3 — §1.8)
// Papel: GESTOR + saude.tfd.gerenciar_saldo
Input: {
  movimentacaoId: string
  justificativa: string  // mínimo 20 caracteres (§1.13)
}
Output: ActionResponse<{ movimentacaoId: string }>
// Cria novo registro movimentacoes_saldo tipo ESTORNO (imutável — sem UPDATE no original)
// movimentacao_origem_id → lançamento estornado
// Tipos estornáveis: CONSUMO, CREDITO, LIBERACAO (não RESERVA nem ESTORNO)
// Erro 422 se movimentação inexistente, já estornada ou tipo não estornável
// Audit CREATE + revalidatePath saldos/dashboard; notificação saldo baixo se aplicável
```

---

## 6. Módulo TFD — Fluxo Principal

### 6.1 Vínculo de Paciente (CADSUS)
```typescript
// Server Action: buscarPacientePorCns
// Papel: SERVIDOR + saude.tfd.abrir_solicitacao
Input: { cns: string }
Output: ActionResponse<{
  nome: string; dataNascimento: string; municipioNascimento: string
  cpfMascarado: string  // confirmação visual
  jaCadastrado: boolean; pacienteId?: string
}>
// Registra READ em audit_logs

// Server Action: vincularPaciente
Input: {
  cns: string; cpf: string  // para confirmar correspondência
  telefone?: string; cep?: string; logradouro?: string; municipio?: string; uf?: string
}
Output: ActionResponse<{ pacienteId: string }>
// Erro 409 se CNS já vinculado a outro CPF no município
// Grava em saude_base.pacientes
```

### 6.2 Abrir Solicitação (Rascunho)
```typescript
// Server Action: abrirSolicitacaoTfd
// Papel: SERVIDOR + saude.tfd.abrir_solicitacao
Input: {
  pacienteId: string; especialidadeId: string
  procedimentos: string[]  // mínimo 1
  prestadorId: string
  tipoAtendimento: 'CONSULTA' | 'RETORNO' | 'EXAME' | 'CIRURGIA'
  solicitacaoOrigemId?: string  // obrigatório se RETORNO
  urgencia: 'BAIXA' | 'INTERMEDIARIA' | 'GRAVE' | 'MUITO_URGENTE'
  laudoAnexoId: string  // UUID confirmado no storage
  acompanhanteNecessario: boolean
  acompanhante?: {
    nome: string; cpf: string  // ≠ CPF paciente
    relacao: 'CONJUGE' | 'FILHO_A' | 'PAI_MAE' | 'RESPONSAVEL_LEGAL' | 'CUIDADOR' | 'OUTRO'
    telefone?: string
  }
}
Output: ActionResponse<{ solicitacaoId: string; protocolo: string }>
// Erro 422 se RETORNO sem solicitacao_origem_id
// Erro 422 se CPF acompanhante = CPF paciente
// Erro 422 se laudo não confirmado no storage
// Status: RASCUNHO
```

### 6.3 Enviar Solicitação
```typescript
// Server Action: enviarSolicitacaoTfd
// Papel: SERVIDOR + saude.tfd.abrir_solicitacao
Input: { solicitacaoId: string }
Output: ActionResponse<void>
// RASCUNHO → ENVIADO
// Notifica gestor + servidores do setor
// Notificação extra imediata se urgencia = MUITO_URGENTE
```

### 6.4 Iniciar Análise
```typescript
// Server Action: iniciarAnaliseTfd
// Papel: SERVIDOR + saude.tfd.analisar_laudo
Input: { solicitacaoId: string }
Output: ActionResponse<void>
// ENVIADO → EM_ANALISE
// Registra READ_SENSITIVE no audit_log
```

### 6.5 Solicitar Complemento
```typescript
// Server Action: solicitarComplementoTfd
// Papel: SERVIDOR + saude.tfd.solicitar_complemento
Input: { solicitacaoId: string; mensagem: string }  // mensagem: mínimo 20 chars
Output: ActionResponse<void>
// EM_ANALISE → PENDENTE
// Notifica servidor solicitante
```

### 6.6 Decidir Solicitação
```typescript
// Server Action: decidirSolicitacaoTfd
// Papel: GESTOR + saude.tfd.decidir_solicitacao
Input: {
  solicitacaoId: string
  decisao: 'APROVADO' | 'NEGADO'
  fundamentacao: string  // mínimo 20 chars
  saldoId?: string       // obrigatório se APROVADO
  valorEstimado?: number // obrigatório se APROVADO — positivo
  // Sprint 2.3 — vedações Portaria 55/1999 (§1.5), persistidas na solicitação:
  distanciaKm?: number           // calculada (settings + prestador) ou informada pelo gestor
  tratamentoExperimental?: boolean
  regiaoMetropolitana?: boolean
  pacienteHospitalizadoDestino?: boolean
  confirmacaoVedacoes?: boolean  // obrigatório true se qualquer flag subjetiva marcada
}
Output: ActionResponse<void>
// Se APROVADO:
//   avaliarVedacoesTfd — bloqueio PAB / distância < 50 km; alertas com confirmação
//   Erro 422 se vedação bloqueante ou confirmação ausente
//   Persiste distancia_km, flags e vedacoes_confirmadas_por_id / _at
//   Verifica saldo atomicamente (SELECT FOR UPDATE)
//   Erro 422 se insuficiente
//   Cria reserva_saldo + movimentacao RESERVA
//   EM_ANALISE → APROVADO
//   Se transição para alerta (< 20% disponível): notificação in-app SALDO_BAIXO → gestores ver_dashboard
// Se NEGADO: EM_ANALISE → NEGADO
// Notifica servidor com fundamentação
```

### 6.7 Criar Agendamento
```typescript
// Server Action: criarAgendamentoTfd
// Papel: SERVIDOR + saude.tfd.agendar_viagem
Input: {
  solicitacaoId: string
  dataViagem: string  // ISO 8601 — mínimo 72h no futuro
  horaSaida?: string  // 'HH:MM'
  veiculoId: string; motoristaId: string
  acompanhanteId?: string  // obrigatório se solicitacao.acompanhante_necessario
  observacoes?: string
}
Output: ActionResponse<{ viagemId: string }>
// Erro 422 se data_viagem < NOW() + 72h
// Erro 422 se motorista com CNH vencida na data
// APROVADO → AGENDADO
// Agenda job notificação 48h antes
```

### 6.8 Registrar Retorno
```typescript
// Server Action: registrarRetornoTfd
// Papel: SERVIDOR + saude.tfd.registrar_retorno
Input: { viagemId: string }
Output: ActionResponse<void>
// viagem → REALIZADA | solicitacao → AGUARDANDO_PC
// Cria prestacao_conta com prazo = data_viagem + 10 dias
// Agenda alerta 48h antes do prazo
```

### 6.9 Registrar Despesa
```typescript
// Server Action: registrarDespesa
// Papel: SERVIDOR + saude.tfd.registrar_despesa
Input: {
  viagemId: string
  tipo: 'TRANSPORTE' | 'ALIMENTACAO' | 'HOSPEDAGEM' | 'OUTRO'
  descricao?: string; valor: number  // positivo
  comprovanteAnexoId?: string  // obrigatório se valor >= 50
  responsavelPagamento: 'MUNICIPIO' | 'PACIENTE_REEMBOLSO'
}
Output: ActionResponse<{ itemId: string }>
// Erro 422 se valor >= 50 sem comprovante
```

### 6.10 Enviar Prestação de Contas
```typescript
// Server Action: enviarPrestacaoContas
// Papel: SERVIDOR + saude.tfd.enviar_prestacao
Input: { prestacaoId: string }
Output: ActionResponse<{ valorTotal: number }>
// Erro 422 se nenhum item lançado
// Erro 422 se item com valor >= 50 sem comprovante
// prestacao → ENVIADA | Notifica gestor financeiro
```

### 6.11 Registrar Visualização de Comprovante
```typescript
// Server Action: registrarVisualizacaoComprovante
// Papel: GESTOR + saude.tfd.aprovar_prestacao
Input: { prestacaoId: string; comprovanteAnexoId: string }
Output: ActionResponse<void>
// Adiciona ao array comprovantes_vistos
// Registra READ_SENSITIVE em audit_logs
```

### 6.12 Decidir Prestação de Contas
```typescript
// Server Action: decidirPrestacaoContas
// Papel: GESTOR + saude.tfd.aprovar_prestacao
Input: { prestacaoId: string; aprovado: boolean; observacoesGestor?: string }
Output: ActionResponse<void>
// Erro 422 se aprovado = true e nem todos comprovantes visualizados
// Erro 422 se aprovado = false e observacoesGestor vazio
// Se APROVADO:
//   prestacao → APROVADA | reserva → CONSUMIDA
//   Registra movimentacao CONSUMO (+ LIBERACAO se valor real < estimado)
//   solicitacao + processo → CONCLUIDO
//   Se transição para alerta (< 20% disponível): notificação in-app SALDO_BAIXO → gestores ver_dashboard
// Se REJEITADO:
//   prestacao → REJEITADA | solicitacao → AGUARDANDO_PC
//   Notifica servidor para corrigir
```

### 6.13 Cancelar Solicitação
```typescript
// Server Action: cancelarSolicitacaoTfd
// Papel: GESTOR + saude.tfd.cancelar_processo
Input: {
  solicitacaoId: string
  motivoPreset?: 'PRAZO_ESGOTADO' | 'OUTRO'  // default OUTRO
  motivo: string  // mínimo 20 chars (ou texto canônico se PRAZO_ESGOTADO e motivo curto)
}
Output: ActionResponse<void>
// Erro 422 se status >= AGENDADO
// Sprint 2.3: se status PENDENTE, exige complemento há ≥ 60 dias para cancelar com PRAZO_ESGOTADO
// resolveMotivoCancelamentoTexto() → motivo gravado
// Se reserva ATIVA → LIBERADA + movimentacao LIBERACAO
// Notifica servidor responsável
```

---

### 6.14 Job — Transição automática EM_VIAGEM (Sprint 2.3)

Invocado por cron (`GET /api/cron/tfd-transicao-em-viagem`, `Authorization: Bearer CRON_SECRET`).

```typescript
// Função: processarTransicaoEmViagemTfd (modules/saude/tfd/src/jobs/)
Output: {
  processadas: number      // viagens elegíveis pela data (timezone do tenant)
  transicionadas: number   // solicitações AGENDADO → EM_VIAGEM
  ignoradas: number        // viagem marcada; solicitação já EM_VIAGEM (outra viagem)
  erros: Array<{ viagemId: string; mensagem: string }>
}
// Para cada viagem AGENDADA com data_viagem <= hoje (timezone do tenant):
//   Grava viagem.em_viagem_transicionado_at (idempotência)
//   solicitacao AGENDADO → EM_VIAGEM (se ainda não estiver EM_VIAGEM)
//   Tramitação OBSERVACAO_INTERNA + audit log
// Sem notificação nesta sprint (§1.10)
```

### 6.15 Contexto de vedações para decisão (Sprint 2.3)

```typescript
// Query: getContextoDecisaoTfd(solicitacaoId)
// Papel: GESTOR + saude.tfd.decidir_solicitacao
// Solicitação em EM_ANALISE
Output: ContextoDecisaoTfd | null
// { possuiProcedimentoPab, distanciaKmCalculada, origemMunicipioConfigurada, prestadorCidade, prestadorEstado }
```

---

## 7. Módulo TFD — Queries de Leitura

### 7.1 Listar Solicitações
```typescript
// Server Action: getSolicitacoesTfd
// Papel: SERVIDOR (seu setor) | GESTOR/ADMIN (todas)
Input: PaginacaoInput & {
  status?: string; urgencia?: string; especialidadeId?: string
  busca?: string; dataInicio?: string; dataFim?: string
}
Output: ActionResponse<PaginatedResult<{
  id: string; protocolo: string; status: string; urgencia: string
  especialidade: string
  prestador: { nome: string; cidade: string; estado: string }
  paciente: { nome: string }  // sem CPF/CNS
  tipoAtendimento: string; criadoEm: string
  // ❌ NUNCA: cid_principal, diagnostico
}>>
```

### 7.2 Detalhe da Solicitação
```typescript
// Server Action: getSolicitacaoTfd
// Papel: SERVIDOR + saude.tfd.analisar_laudo para campos clínicos
Input: { solicitacaoId: string }
Output: ActionResponse<{
  // Dados básicos (todos os papéis)
  id: string; protocolo: string; status: string; urgencia: string
  especialidade: { id: string; nome: string }
  procedimentos: Array<{ id: string; nome: string }>
  prestador: { nome: string; cidade: string; estado: string }
  paciente: { id: string; nome: string; cpfMascarado: string; cns: string; dataNascimento: string }
  acompanhante: { nome: string; cpfMascarado: string; relacao: string } | null
  tramitacoes: Array<{ tipo: string; descricao: string; usuarioNome: string | null; criadoEm: string }>
  viagens: Array<{ id: string; sequencia: number; dataViagem: string; status: string; veiculo: { placa: string; modelo: string }; motorista: { nome: string } }>
  // Campos sensíveis — apenas com analisar_laudo:
  cidPrincipal: string | null
  diagnostico: string | null
  laudoUrl: string | null  // URL pré-assinada 15min
  // Financeiro — apenas com gerenciar_saldo ou aprovar_prestacao:
  fundamentacaoDecisao: string | null
  reservaValorEstimado: number | null
}>
// Registra READ_SENSITIVE se campos clínicos acessados
```

### 7.3 Dashboard TFD
```typescript
// Server Action: getDashboardTfd
// Papel: GESTOR + saude.tfd.ver_dashboard
Input: void
Output: ActionResponse<{
  totalSolicitacoes: number
  porStatus: Record<string, number>
  porUrgencia: Record<string, number>
  tempoMedioAprovacaoDias: number
  prestacoesPendentes: number
  viagensProximos7Dias: number
  saldos: Array<{
    id: string; descricao: string; fonte: string
    valorTotal: number; valorReservado: number
    valorUtilizado: number; valorDisponivel: number
    percentualDisponivel: number
    alertaBaixo: boolean  // disponível < 20% do total
  }>
}>
```

### 7.3.1 Dashboard — bloco Financeiro (Sprint 2.2)

```typescript
// Query: getDashboardFinanceiroTfd
// Papel: GESTOR + saude.tfd.ver_dashboard
// Rota UI: /saude/tfd/dashboard (componente tfd-dashboard-financeiro)
Input: void
Output: {
  totalDisponivelConsolidado: number
  quantidadeSaldosAtivos: number
  saldosEmAlerta: Array<{
    id: string; descricao: string; fonte: string
    valorTotal: number; valorReservado: number; valorUtilizado: number
    valorDisponivel: number; percentualDisponivel: number; alertaBaixo: boolean
  }>
  extratoResumido: Array<{
    id: string; criadoEm: string; tipo: string; descricao: string
    valor: number; saldoId: string; saldoDescricao: string
  }>  // últimas 5 movimentações (todos os saldos ativos)
}
// Cálculo via calcSaldoDisponivel() — ver dashboard-saldos-shared.ts
```

### 7.4 Extrato de Saldo
```typescript
// Server Action: getExtratoSaldo
// Papel: GESTOR + saude.tfd.gerenciar_saldo
Input: PaginacaoInput & { saldoId: string; dataInicio?: string; dataFim?: string }
Output: ActionResponse<PaginatedResult<{
  tipo: string; valor: number; descricao: string
  protocolo: string | null; usuarioNome: string; criadoEm: string
}>>
// Visualização paginada na UI — sem registro em audit_logs
// Server Action: buscarExtratoSaldoTfd — encapsula getExtratoSaldo (sem audit EXPORT)

// Server Action: exportarExtratoSaldoTfdCsv
// Papel: GESTOR + saude.tfd.gerenciar_saldo
Input: { saldoId: string; dataInicio?: string; dataFim?: string }
Output: ActionResponse<{ downloadUrl: string; expiresAt: string; totalRegistros: number }>
// getExtratoSaldoCompleto — todas as movimentações no período (sem paginação)
// Audit EXPORT apenas nesta action (entidade saude_tfd_extrato_saldo, formato csv)
// Rate limit: 3 exportações/hora por tenant
```

### 7.5 Relatório por prestador
```typescript
// Server Action: gerarRelatorioPrestadorTfd
// Papel: GESTOR + saude.tfd.exportar_relatorio
Input: { dataInicio: string; dataFim: string; prestadorId?: string }  // AAAA-MM-DD
Output: ActionResponse<{ downloadUrl: string; expiresAt: string; totalRegistros: number }>
// Agregação por prestador: volume, valores reservado/consumido — sem CID/diagnóstico
// Audit EXPORT: entidade saude_tfd_relatorio_prestador
```

### 7.6 Relatório por motorista
```typescript
// Server Action: gerarRelatorioMotoristaTfd
// Papel: GESTOR + saude.tfd.exportar_relatorio
Input: { dataInicio: string; dataFim: string; motoristaId?: string }
Output: ActionResponse<{ downloadUrl: string; expiresAt: string; totalRegistros: number }>
// Viagens no período com despesas do município — sem dados clínicos do paciente
// Audit EXPORT: entidade saude_tfd_relatorio_motorista
```

### 7.7 Relatório de produção mensal
```typescript
// Server Action: gerarRelatorioProducaoMensalTfd
// Papel: GESTOR + saude.tfd.exportar_relatorio
Input: { mes: number; ano: number }
Output: ActionResponse<{ downloadUrl: string; expiresAt: string; totalRegistros: number }>
// Contagem e valores por APROVADO, NEGADO, CONCLUIDO, CANCELADO no mês
// Audit EXPORT: entidade saude_tfd_relatorio_producao_mensal
```

### 7.8 Exportação CSV — listagens TFD

Todas as exportações abaixo: **GESTOR** + `saude.tfd.exportar_relatorio`, rate limit 3/hora por tenant, rodapé §1.12 via `formatRodapeExport`, máximo 50.000 linhas. Leituras paginadas (`getSolicitacoesTfd`, etc.) **não** registram audit EXPORT.

```typescript
// Server Action: exportarSolicitacoesTfdCsv
// getSolicitacoesCompleto — sem paginação
Input: { status?: TfdStatusSolicitacao; urgencia?: TfdUrgencia; protocolo?: string }
Output: ActionResponse<{ downloadUrl: string; expiresAt: string; totalRegistros: number }>
// Colunas: protocolo, status, urgência, especialidade, prestador, tipo de atendimento, datas (criado/decidido/cancelado/atualizado)
// ❌ sem CID, diagnóstico, nome ou CPF do paciente
// Audit EXPORT: entidade saude_tfd_listagem_solicitacoes

// Server Action: exportarAgendamentosTfdCsv
// getAgendamentosCompleto
Input: { dataInicio?: string; dataFim?: string; motoristaId?: string; veiculoId?: string }
// Colunas: protocolo, data da viagem, motorista, veículo, destino (cidade/UF do prestador), status
// ❌ sem dados clínicos ou identificação do paciente além do protocolo
// Audit EXPORT: entidade saude_tfd_listagem_agendamentos

// Server Action: exportarPrestacoesTfdCsv
// getPrestacoesCompleto
Input: { status?: TfdPrestacaoStatus }
// Colunas: protocolo, status da prestação, valor total, data de envio, data de aprovação
// Audit EXPORT: entidade saude_tfd_listagem_prestacoes

// Server Action: exportarSaldosTfdCsv
// getSaldosCompleto
Input: { incluirInativos?: boolean }
// Colunas: fonte, competência, valor total, reservado, consumido, disponível, status (ativo/inativo)
// Audit EXPORT: entidade saude_tfd_listagem_saldos
```

Schemas: `modules/saude/tfd/src/validators/exportacao.schema.ts` (`LISTAGEM_EXPORT_MAX_LINHAS = 50_000`).

---

## 8. Core — Upload de Arquivos

### 8.1 Solicitar URL de Upload
```typescript
// Server Action: solicitarUrlUpload
// Papel: SERVIDOR (mínimo)
Input: {
  processoId?: string; nomeArquivo: string
  mimeType: 'application/pdf' | 'image/jpeg' | 'image/png'
  tamanhoBytes: number  // máximo 10MB = 10.485.760 bytes
}
Output: ActionResponse<{
  uploadUrl: string  // URL pré-assinada S3/R2 válida 15min
  anexoId: string    // UUID do registro (status: pendente)
}>
// Erro 422 se tipo não permitido ou tamanho > 10MB
```

### 8.2 Confirmar Upload
```typescript
// Server Action: confirmarUpload
Input: { anexoId: string }
Output: ActionResponse<{ downloadUrl: string }>
// Verifica arquivo no storage | anexo.confirmado → true
// downloadUrl válida 1h
```

---

## 9. Notificações

**Eventos TFD registrados em `packages/core-notifications`** (canal in-app na Fase 1–2; e-mail na Sprint 2.4):

| Evento | Disparo (resumo) | Destinatários |
|--------|------------------|---------------|
| `SALDO_BAIXO` | Transição para disponível &lt; 20% após RESERVA (aprovação) ou CONSUMO (PC aprovada) | Gestores do setor TFD com `saude.tfd.ver_dashboard` |
| Demais eventos §1.14 | Ver `BUSINESS_RULES.md` | Conforme tabela §1.14 |

Contexto `SALDO_BAIXO`: `nomeSaldo`, `percentualDisponivel` (sem valores monetários). Deduplicação: não reenvia se o saldo já estava em alerta antes da operação.

```typescript
// Server Action: getMinhasNotificacoes
Input: PaginacaoInput & { apenasNaoLidas?: boolean }
Output: ActionResponse<PaginatedResult<{
  id: string; titulo: string; corpo: string
  lida: boolean; protocolo: string | null; criadoEm: string
}>>

// Server Action: marcarNotificacaoLida
Input: { notificacaoId: string } | { todas: true }
Output: ActionResponse<{ totalMarcadas: number }>
```

---

## 10. Checklist de Contrato

- [ ] Input e Output documentados neste arquivo?
- [ ] Input usa Zod schema de `validators/`?
- [ ] Output segue padrão `ActionResponse<T>`?
- [ ] Campos sensíveis (CID, CPF) excluídos das listagens?
- [ ] Papel mínimo e permissão especificados?
- [ ] Erros possíveis (422, 409, 404) descritos?
- [ ] Efeitos colaterais (notificações, cache, audit) listados?

---

## 11. Documentos Relacionados

- `CODING_STANDARDS.md` — como implementar as actions
- `BUSINESS_RULES.md` — regras que definem os erros 422
- `AUTH_PERMISSIONS.md` — papel mínimo por operação
- `DATABASE_SCHEMA.md` — tipos e enums disponíveis
- `SECURITY.md` — dados que nunca aparecem em responses
