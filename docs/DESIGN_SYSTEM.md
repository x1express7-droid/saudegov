# DESIGN_SYSTEM.md
# saudegov — Design System

> **Instruções para o agente do Cursor:** Consulte este arquivo antes de criar
> qualquer componente visual, tela ou layout. Nunca use cores, tamanhos ou
> espaçamentos hardcoded — use sempre os tokens definidos aqui. Nunca crie um
> componente que já existe em `packages/ui`. Consulte a seção de componentes
> antes de criar um novo.

---

## 1. Princípios Visuais

1. **Clareza operacional:** servidores públicos trabalham sob pressão — cada tela
   deve comunicar o estado atual sem ambiguidade. Status sempre visível.

2. **Hierarquia de informação:** o que é mais importante aparece primeiro e maior.
   Protocolos e status de urgência são sempre destacados.

3. **Densidade adequada:** listas de processos precisam de densidade. Formulários
   precisam de respiração. Cada contexto tem sua densidade ideal.

4. **Feedback imediato:** toda ação tem resposta visual — loading, sucesso ou erro.
   Nunca deixar o servidor sem saber se a ação funcionou.

5. **Tema por município:** cores primárias variam por município via CSS custom
   properties. O design system define as variáveis — o tenant define os valores.

---

## 2. Tokens de Cor

### 2.1 Variáveis CSS (definidas por tenant)

```css
/* Sobrepostas pelo tema do município via layout.tsx */
:root {
  --color-primary:        #1a5fa8;  /* cor principal do município */
  --color-primary-hover:  #155090;
  --color-primary-light:  #e8f0fb;
  --color-header-bg:      #1a5fa8;
  --color-header-text:    #ffffff;
}
```

### 2.2 Cores fixas da plataforma (não personalizáveis)

```css
/* Neutros */
--color-bg:             #f8fafc;
--color-surface:        #ffffff;
--color-border:         #e2e8f0;
--color-border-strong:  #cbd5e1;
--color-text:           #0f172a;
--color-text-muted:     #64748b;
--color-text-subtle:    #94a3b8;

/* Semânticas — fixas para consistência operacional */
--color-success:        #16a34a;
--color-success-light:  #dcfce7;
--color-warning:        #d97706;
--color-warning-light:  #fef3c7;
--color-error:          #dc2626;
--color-error-light:    #fee2e2;
--color-info:           #0284c7;
--color-info-light:     #e0f2fe;
```

---

## 3. Tokens de Status TFD

Cada status do fluxo TFD tem cor e label fixos. Nunca usar cores diferentes.

```typescript
// packages/ui/src/components/status-badge.tsx

export const TFD_STATUS_CONFIG = {
  RASCUNHO:      { label: 'Rascunho',          color: 'gray'   },
  ENVIADO:       { label: 'Enviado',            color: 'blue'   },
  EM_ANALISE:    { label: 'Em Análise',         color: 'indigo' },
  PENDENTE:      { label: 'Pendente',           color: 'yellow' },
  APROVADO:      { label: 'Aprovado',           color: 'green'  },
  NEGADO:        { label: 'Negado',             color: 'red'    },
  AGENDADO:      { label: 'Agendado',           color: 'teal'   },
  EM_VIAGEM:     { label: 'Em Viagem',          color: 'cyan'   },
  AGUARDANDO_PC: { label: 'Aguardando PC',      color: 'orange' },
  PC_EM_ANALISE: { label: 'PC em Análise',      color: 'purple' },
  CONCLUIDO:     { label: 'Concluído',          color: 'green'  },
  CANCELADO:     { label: 'Cancelado',          color: 'red'    },
} as const
```

### Tokens de Urgência TFD

```typescript
export const TFD_URGENCIA_CONFIG = {
  BAIXA:          { label: 'Baixa',         color: 'gray',   icon: '●' },
  INTERMEDIARIA:  { label: 'Intermediária', color: 'yellow', icon: '●' },
  GRAVE:          { label: 'Grave',         color: 'orange', icon: '▲' },
  MUITO_URGENTE:  { label: 'Muito Urgente', color: 'red',    icon: '⚠' },
} as const
// MUITO_URGENTE: badge pisca levemente (animação CSS pulse)
```

---

## 4. Tipografia

```css
/* Font stack — sem Google Fonts externos (LGPD + performance) */
--font-sans: 'Inter', system-ui, -apple-system, sans-serif;
--font-mono: 'JetBrains Mono', 'Fira Code', monospace;

/* Protocolos sempre em monospace — fácil leitura e cópia */
.protocolo { font-family: var(--font-mono); letter-spacing: 0.05em; }

/* Tamanhos */
--text-xs:   0.75rem;   /* 12px — labels de tabela */
--text-sm:   0.875rem;  /* 14px — corpo de tabela, campos */
--text-base: 1rem;      /* 16px — corpo padrão */
--text-lg:   1.125rem;  /* 18px — títulos de seção */
--text-xl:   1.25rem;   /* 20px — títulos de página */
--text-2xl:  1.5rem;    /* 24px — títulos de card */
```

---

## 5. Espaçamento e Layout

```css
/* Grid de espaçamento (múltiplos de 4px) */
--space-1:  0.25rem;   /* 4px  */
--space-2:  0.5rem;    /* 8px  */
--space-3:  0.75rem;   /* 12px */
--space-4:  1rem;      /* 16px */
--space-5:  1.25rem;   /* 20px */
--space-6:  1.5rem;    /* 24px */
--space-8:  2rem;      /* 32px */
--space-10: 2.5rem;    /* 40px */
--space-12: 3rem;      /* 48px */

/* Border radius */
--radius-sm: 0.25rem;  /* 4px  — badges, chips */
--radius:    0.5rem;   /* 8px  — cards, inputs */
--radius-lg: 0.75rem;  /* 12px — modais, drawers */
--radius-xl: 1rem;     /* 16px — cards grandes */
```

---

## 6. Layout dos Painéis

### 6.1 Painel Servidor — Estrutura

```
┌─────────────────────────────────────────────────┐
│  HEADER (altura: 64px)                          │
│  [Logo município] [Nome sistema] [User + Notif] │
├──────────┬──────────────────────────────────────┤
│          │                                      │
│ SIDEBAR  │  CONTENT AREA                        │
│ (240px)  │  (flex-1, padding: 24px)             │
│          │                                      │
│ Menu     │  [PageHeader]                        │
│ módulos  │  [Conteúdo da página]                │
│ ativos   │                                      │
│          │                                      │
└──────────┴──────────────────────────────────────┘
```

### 6.2 Painel Dev — Estrutura

Mesma estrutura, sem personalização de tema por município.
Cores fixas da plataforma — nunca herda tema do tenant.

### 6.3 PageHeader Component

```typescript
// packages/ui/src/components/page-header.tsx

interface PageHeaderProps {
  titulo: string
  subtitulo?: string
  breadcrumbs?: Array<{ label: string; href?: string }>
  acoes?: React.ReactNode  // botões de ação da página
}

// Uso padrão em todas as páginas:
<PageHeader
  titulo="Solicitações TFD"
  subtitulo="Fila de processos do setor"
  breadcrumbs={[{ label: 'Saúde', href: '/saude' }, { label: 'TFD' }]}
  acoes={<Button href="/saude/tfd/nova">Nova Solicitação</Button>}
/>
```

---

## 7. Componentes do Core UI (`packages/ui`)

### 7.1 Componentes Base (Radix UI + Tailwind)

```
Button        → variantes: primary, secondary, ghost, danger, outline
Input         → com label, erro, hint text, máscara opcional
Select        → com busca para listas longas (especialidades, prestadores)
Textarea      → com contador de caracteres (para fundamentação obrigatória)
Checkbox      → com label e hint
DatePicker    → com locale pt-BR, bloqueio de datas inválidas
FileUpload    → drag & drop + click, validação de tipo/tamanho, progress
Card          → com header, body, footer opcionais
Badge         → tamanhos: sm, md | variantes de cor semântica
Dialog        → modal com overlay, fechar com Esc
Drawer        → lateral, para formulários extensos
Tabs          → para separar seções em páginas complexas
Tooltip       → para ícones de ação sem label visível
Spinner       → loading inline
EmptyState    → para listas vazias com ícone e CTA
Alert         → info, success, warning, error com ícone
```

### 7.2 Componentes Específicos do Domínio

```typescript
// StatusBadge — renderiza status TFD com cor e label corretos
<StatusBadge status="EM_ANALISE" />

// UrgenciaBadge — renderiza urgência com cor e ícone
<UrgenciaBadge urgencia="MUITO_URGENTE" />  // badge pisca

// ProtocoloBadge — exibe protocolo em fonte mono com botão de copiar
<ProtocoloBadge protocolo="2025-SAUDE-TFD-000042" />

// TramitacaoTimeline — histórico de movimentações do processo
<TramitacaoTimeline tramitacoes={tramitacoes} />

// PermissionGate — renderização condicional por permissão
<PermissionGate session={session} permission="saude.tfd.decidir_solicitacao">
  <BotoesDecisao />
</PermissionGate>

// FileUpload — upload de laudos e comprovantes
<FileUpload
  onUpload={handleUpload}
  accept={['application/pdf', 'image/jpeg', 'image/png']}
  maxSizeMB={10}
  label="Laudo médico"
/>
```

### 7.3 DataTable (TanStack Table)

```typescript
// packages/ui/src/components/data-table.tsx

interface DataTableProps<T> {
  data: T[]
  columns: ColumnDef<T>[]
  pagination: { page: number; perPage: number; total: number }
  onPaginationChange: (page: number) => void
  loading?: boolean
  emptyMessage?: string
  onRowClick?: (row: T) => void
}
```

**Regras da DataTable:**
- Paginação sempre visível quando total > perPage
- Coluna de protocolo sempre usa `ProtocoloBadge`
- Coluna de status sempre usa `StatusBadge`
- Coluna de urgência sempre usa `UrgenciaBadge`
- Linhas com urgência `MUITO_URGENTE`: borda esquerda vermelha
- Linhas com prazo de PC vencendo em 48h: fundo amarelo claro
- Linhas com `highlightWarning: true` no objeto da linha: fundo `var(--color-warning-light)` (ex.: saldo com alerta abaixo de 20%)
- Click em linha abre detalhe — nunca abrir em nova aba por padrão

### 7.4 Formatação e listas — Saldos TFD (Sprint 1.2)

**Utilitários por app** (`saldos-ui.ts` / `tfd-saldos-ui.ts` — não centralizar em `packages/ui`):

| Função / mapa | Uso |
|---|---|
| `formatBrl(value)` | Valores monetários: `R$ 50.000,00` via `Intl.NumberFormat('pt-BR', …)` |
| `formatCompetenciaBr(inicio, fim)` | Período `dd/mm/aaaa — dd/mm/aaaa` a partir de ISO `AAAA-MM-DD` |
| `formatDateTimeBr(iso)` | Data/hora no extrato em pt-BR |
| `FONTE_LABELS` | Fonte de recurso em português na tabela |
| `MOVIMENTACAO_LABELS` | Tipo de movimentação (CREDITO → Crédito, RESERVA → Reserva, etc.) |

**EmptyState contextual:** quando a listagem está vazia (`items.length === 0`), renderizar `EmptyState` com título e descrição específicos do domínio — não usar apenas o `DataTable` vazio (descrição genérica “cadastre um novo registro”).

**Alertas de saldo baixo:** combinar três camadas — `highlightWarning` na linha, badge “Saldo baixo” na coluna descrição e `Alert variant="warning"` no topo da página quando existir saldo ativo com `alertaBaixo`.

**Extrato (Dialog):** resumo em grid (Total, Reservado, Utilizado, Disponível); conteúdo rolável com `max-h-[min(70vh,36rem)] overflow-y-auto`.

---

## 8. Formulários — Padrões

### 8.1 Layout de formulário

```
Formulários de até 6 campos  → 1 coluna, max-width: 640px
Formulários de 6-12 campos   → 2 colunas em telas ≥ 768px
Formulários de 12+ campos    → dividir em seções com títulos
```

### 8.2 Validação visual

```
Estado inicial  → sem destaque
Com foco        → borda primary + ring
Inválido        → borda vermelha + ícone ⚠ + mensagem de erro abaixo
Válido          → borda verde suave (apenas após submit)
Desabilitado    → fundo cinza + cursor not-allowed
```

### 8.3 Botões de ação em formulários

```
[Cancelar]  [Salvar como Rascunho]  [Enviar Solicitação]

Ordem: ação destrutiva à esquerda, ação principal à direita
Ação principal: sempre Button variant="primary"
Cancelar: sempre Button variant="ghost"
```

### 8.4 Feedback de submissão

```typescript
// Loading durante envio: desabilitar botão + Spinner inline
// Nunca usar alert() do browser — usar Alert component
// Erro de validação: focar no primeiro campo inválido automaticamente
// Sucesso: toast notification + revalidação automática da lista
```

---

## 9. Telas Obrigatórias do Módulo TFD

### 9.1 Lista de Solicitações (principal)

```
┌─ PageHeader ─────────────────────────────────────────┐
│ Solicitações TFD          [Filtros] [Nova Solicitação]│
└──────────────────────────────────────────────────────┘
┌─ Barra de filtros ────────────────────────────────────┐
│ Status: [dropdown]  Urgência: [dropdown]  [Buscar protocolo...]│
└──────────────────────────────────────────────────────┘
┌─ DataTable ───────────────────────────────────────────┐
│ Protocolo     Paciente     Especialidade  Urgência  Status    Data  │
│ 2025-TFD-042  João S.      Cardiologia   ⚠ M.Urg   EM_ANALISE 01/03│
│ (borda vermelha esquerda — MUITO_URGENTE)                           │
└──────────────────────────────────────────────────────┘
[Paginação]
```

### 9.2 Detalhe da Solicitação

```
┌─ Header com Protocolo + StatusBadge + UrgenciaBadge ─┐
├─ Grid 2 colunas ─────────────────────────────────────┤
│ Col 1: Dados do processo                             │
│   Paciente, Especialidade, Prestador                 │
│   Tipo de atendimento, Procedimentos                 │
│   Acompanhante (se houver)                           │
│                                                      │
│ [Se tem permissão analisar_laudo]:                   │
│   CID, Diagnóstico, [Visualizar Laudo]               │
│                                                      │
│ Col 2: Ações disponíveis (condicionais por status)   │
│   + Informações financeiras (se GESTOR)              │
├─ TramitacaoTimeline ─────────────────────────────────┤
│ Histórico completo de movimentações                  │
├─ Viagens e Despesas (se houver) ─────────────────────┤
└──────────────────────────────────────────────────────┘
```

### 9.3 Dashboard TFD (GESTOR)

```
┌─ KPI Cards (4 colunas) ──────────────────────────────┐
│ Total Mês    Pendentes   Saldo Disponível  Tempo Médio│
├─ Grid 2 colunas ─────────────────────────────────────┤
│ Gráfico barras: por status    │ Alertas operacionais  │
│                               │ • X processos urgentes│
│                               │ • Saldo baixo 18%     │
│                               │ • Y PCs vencendo      │
├─ Últimas solicitações ───────────────────────────────┤
│ [DataTable resumida — 10 últimas]                    │
└──────────────────────────────────────────────────────┘
```

---

## 10. Acessibilidade

- Todo formulário tem `label` associado a cada campo (`htmlFor`)
- Imagens decorativas com `alt=""`
- Imagens informativas com `alt` descritivo
- Botões sem texto visível têm `aria-label`
- Status de loading comunicado via `aria-busy` e `aria-live`
- Navegação por teclado funcional em todos os componentes Radix UI
- Contraste mínimo WCAG AA para texto sobre fundo
- Tamanho mínimo de área clicável: 44x44px

---

## 11. Responsividade

A plataforma é primariamente desktop (servidores públicos em computadores).
Mobile é suporte secundário — layout adapta mas não é otimizado para uso
exclusivamente mobile.

```
≥ 1280px  → layout completo com sidebar expandida
≥ 1024px  → sidebar colapsada (apenas ícones)
≥ 768px   → sidebar em drawer (hamburguer)
< 768px   → layout mobile — sidebar drawer, tabelas com scroll horizontal
```

---

## 12. Documentos Relacionados

- `CODING_STANDARDS.md` — como implementar componentes
- `MONOREPO.md` — onde ficam os componentes (`packages/ui`)
- `BUSINESS_RULES.md` — regras que definem quais ações aparecem em cada status
- `AUTH_PERMISSIONS.md` — PermissionGate para renderização condicional
