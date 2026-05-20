'use client'

import type { SaudeMunicSession } from '@saude/core-auth'
import type { ColumnDef } from '@saude/ui'
import {
  Alert,
  Badge,
  Button,
  PageHeader,
  Card,
  CardFooter,
  CardHeader,
  DataTable,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogTrigger,
  EmptyState,
  FileUpload,
  Input,
  PermissionGate,
  ProtocoloBadge,
  Select,
  Spinner,
  StatusBadge,
  TFD_STATUS_CONFIG,
  Textarea,
  TramitacaoTimeline,
  UrgenciaBadge,
  TFD_URGENCIA_CONFIG,
} from '@saude/ui'
import type { TfdStatus, TfdUrgencia, TramitacaoItem } from '@saude/ui'
import { FileQuestion } from 'lucide-react'
import { useState, type ReactNode } from 'react'

const BADGE_VARIANTS = [
  'gray',
  'blue',
  'green',
  'red',
  'yellow',
  'orange',
  'purple',
  'teal',
  'cyan',
  'indigo',
] as const

const mockSessionWithPermission: SaudeMunicSession = {
  user: {
    id: '00000000-0000-0000-0000-000000000001',
    tenantId: '00000000-0000-0000-0000-000000000010',
    role: 'SERVIDOR',
    name: 'Maria Servidor (mock)',
    email: 'maria.servidor@exemplo.gov.br',
    permissions: {
      'saude.tfd.decidir_solicitacao': true,
    },
  },
  expires: new Date(Date.now() + 86_400_000).toISOString(),
}

const mockSessionWithoutPermission: SaudeMunicSession = {
  ...mockSessionWithPermission,
  user: {
    ...mockSessionWithPermission.user,
    permissions: {},
  },
}

const tramitacoesExemplo: TramitacaoItem[] = [
  {
    id: '1',
    tipo: 'ABERTURA',
    descricao: 'Solicitação registrada no setor.',
    autor: { nome: 'João Silva' },
    criadoAt: new Date('2026-03-01T09:00:00'),
  },
  {
    id: '2',
    tipo: 'ENVIO',
    descricao: 'Enviado para análise da regulação.',
    autor: { nome: 'Maria Oliveira' },
    criadoAt: new Date('2026-03-02T14:30:00'),
  },
  {
    id: '3',
    tipo: 'ANÁLISE',
    descricao: 'Em análise pelo gestor do TFD.',
    autor: { nome: 'Carlos Gestor' },
    criadoAt: new Date('2026-03-03T10:15:00'),
  },
]

type SolicitacaoRow = {
  id: string
  protocolo: string
  paciente: string
  urgencia?: string
  highlightWarning?: boolean
  status: TfdStatus
}

const solicitacoesExemplo: SolicitacaoRow[] = [
  {
    id: '1',
    protocolo: '2026-SAUDE-TFD-000001',
    paciente: 'Ana Costa',
    urgencia: 'MUITO_URGENTE',
    status: 'EM_ANALISE',
  },
  {
    id: '2',
    protocolo: '2026-SAUDE-TFD-000002',
    paciente: 'Pedro Lima',
    highlightWarning: true,
    status: 'AGUARDANDO_PC',
  },
  {
    id: '3',
    protocolo: '2026-SAUDE-TFD-000003',
    paciente: 'Lucia Ferreira',
    urgencia: 'BAIXA',
    status: 'APROVADO',
  },
]

const solicitacaoColumns: ColumnDef<SolicitacaoRow>[] = [
  {
    id: 'protocolo',
    header: 'Protocolo',
    cell: ({ row }) => <ProtocoloBadge protocolo={row.original.protocolo} />,
  },
  {
    id: 'paciente',
    header: 'Paciente',
    accessorKey: 'paciente',
  },
  {
    id: 'urgencia',
    header: 'Urgência',
    cell: ({ row }) =>
      row.original.urgencia ? (
        <UrgenciaBadge urgencia={row.original.urgencia as TfdUrgencia} size="sm" />
      ) : (
        <span className="text-[var(--color-text-subtle)]">—</span>
      ),
  },
  {
    id: 'status',
    header: 'Status',
    cell: ({ row }) => <StatusBadge status={row.original.status} size="sm" />,
  },
]

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-[var(--space-10)]">
      <h2 className="mb-[var(--space-4)] border-b border-[var(--color-border)] pb-[var(--space-2)] text-[length:var(--text-lg)] font-semibold text-[var(--color-text)]">
        {title}
      </h2>
      {children}
    </section>
  )
}

function Subsection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mb-[var(--space-6)]">
      <h3 className="mb-[var(--space-3)] text-[length:var(--text-base)] font-medium text-[var(--color-text)]">
        {title}
      </h3>
      {children}
    </div>
  )
}

export function DesignSystemCatalog() {
  const [tablePage, setTablePage] = useState(1)
  const [uploadMessage, setUploadMessage] = useState<string | null>(null)
  const [selectValue, setSelectValue] = useState<string>('')

  return (
    <div className="flex flex-col gap-[var(--space-2)]">
      <Section title="PageHeader">
        <div className="rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] p-[var(--space-4)]">
          <PageHeader
            titulo="Solicitações TFD"
            subtitulo="Fila de processos do setor"
            breadcrumbs={[{ label: 'Saúde', href: '/saude' }, { label: 'TFD' }]}
            acoes={<Button variant="primary">Nova solicitação</Button>}
          />
        </div>
      </Section>

      <Section title="Componentes base">
        <Subsection title="Button">
          <div className="flex flex-wrap gap-[var(--space-3)]">
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="danger">Danger</Button>
            <Button variant="primary" disabled>
              Desabilitado
            </Button>
            <Button variant="primary" loading>
              Carregando
            </Button>
          </div>
        </Subsection>

        <Subsection title="Input">
          <div className="grid max-w-xl gap-[var(--space-4)]">
            <Input label="Nome completo" placeholder="Digite o nome" hint="Texto de ajuda opcional." />
            <Input
              label="E-mail"
              type="email"
              placeholder="email@exemplo.gov.br"
              error="E-mail inválido."
              defaultValue="email-invalido"
            />
            <Input label="Campo desabilitado" placeholder="Indisponível" disabled />
          </div>
        </Subsection>

        <Subsection title="Select">
          <div className="max-w-md">
            <Select
              label="Especialidade"
              placeholder="Selecione uma especialidade"
              value={selectValue}
              onValueChange={setSelectValue}
              options={[
                { value: 'cardio', label: 'Cardiologia' },
                { value: 'neuro', label: 'Neurologia' },
                { value: 'onco', label: 'Oncologia' },
              ]}
            />
          </div>
        </Subsection>

        <Subsection title="Textarea">
          <div className="max-w-xl">
            <Textarea
              label="Fundamentação"
              placeholder="Descreva a decisão..."
              showCount
              maxLength={500}
              hint="Máximo 500 caracteres."
            />
          </div>
        </Subsection>

        <Subsection title="Card">
          <div className="max-w-lg">
          <Card
            header={<CardHeader>Título do card</CardHeader>}
            footer={
              <CardFooter>
                <Button variant="ghost">Cancelar</Button>
                <Button variant="primary">Confirmar</Button>
              </CardFooter>
            }
          >
            <p className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
              Conteúdo do card com header e footer opcionais.
            </p>
          </Card>
          </div>
        </Subsection>

        <Subsection title="Badge">
          <div className="flex flex-wrap gap-[var(--space-2)]">
            {BADGE_VARIANTS.map((variant) => (
              <Badge key={variant} variant={variant}>
                {variant}
              </Badge>
            ))}
          </div>
        </Subsection>
      </Section>

      <Section title="Componentes operacionais">
        <Subsection title="StatusBadge">
          <div className="flex flex-wrap gap-[var(--space-2)]">
            {(Object.keys(TFD_STATUS_CONFIG) as TfdStatus[]).map((status) => (
              <StatusBadge key={status} status={status} />
            ))}
          </div>
        </Subsection>

        <Subsection title="UrgenciaBadge">
          <div className="flex flex-wrap gap-[var(--space-2)]">
            {(Object.keys(TFD_URGENCIA_CONFIG) as TfdUrgencia[]).map((urgencia) => (
              <UrgenciaBadge key={urgencia} urgencia={urgencia} />
            ))}
          </div>
        </Subsection>

        <Subsection title="ProtocoloBadge">
          <ProtocoloBadge protocolo="2026-SAUDE-TFD-000042" />
        </Subsection>
      </Section>

      <Section title="Componentes de feedback">
        <Subsection title="Alert">
          <div className="grid max-w-2xl gap-[var(--space-3)]">
            <Alert variant="info" titulo="Informação">
              Mensagem informativa para o servidor.
            </Alert>
            <Alert variant="success" titulo="Sucesso">
              Operação concluída com sucesso.
            </Alert>
            <Alert variant="warning" titulo="Atenção">
              Verifique os dados antes de continuar.
            </Alert>
            <Alert variant="error" titulo="Erro">
              Não foi possível concluir a operação.
            </Alert>
          </div>
        </Subsection>

        <Subsection title="Spinner">
          <div className="flex items-center gap-[var(--space-4)]">
            <Spinner className="text-[var(--color-primary)]" />
            <span className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
              Loading inline
            </span>
          </div>
        </Subsection>

        <Subsection title="EmptyState">
          <EmptyState
            icon={<FileQuestion className="size-6" />}
            titulo="Nenhuma solicitação encontrada"
            descricao="Não há registros para os filtros selecionados."
            cta={<Button variant="primary">Nova solicitação</Button>}
          />
        </Subsection>
      </Section>

      <Section title="Dialog">
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline">Abrir modal</Button>
          </DialogTrigger>
          <DialogContent titulo="Exemplo de diálogo" descricao="Feche com Esc ou pelo botão X.">
            <p className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
              Conteúdo do modal para ações que exigem confirmação do servidor.
            </p>
            <DialogFooter>
              <DialogTrigger asChild>
                <Button variant="ghost">Cancelar</Button>
              </DialogTrigger>
              <Button variant="primary">Confirmar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Section>

      <Section title="FileUpload">
        <div className="max-w-lg">
          <FileUpload
            label="Laudo médico"
            accept={['application/pdf', 'image/jpeg', 'image/png']}
            maxSizeMB={10}
            onUpload={(file) => {
              setUploadMessage(`Arquivo selecionado: ${file.name} (${Math.round(file.size / 1024)} KB)`)
            }}
          />
          {uploadMessage ? (
            <Alert variant="success" className="mt-[var(--space-3)]" titulo="Upload">
              {uploadMessage}
            </Alert>
          ) : null}
        </div>
      </Section>

      <Section title="PermissionGate">
        <div className="grid max-w-xl gap-[var(--space-4)]">
          <Card>
            <p className="mb-[var(--space-3)] text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
              Com permissão{' '}
              <code className="rounded-[var(--radius-sm)] bg-[var(--color-bg)] px-[var(--space-1)] text-[length:var(--text-xs)] text-[var(--color-text)]">
                saude.tfd.decidir_solicitacao
              </code>
            </p>
            <PermissionGate
              session={mockSessionWithPermission}
              permission="saude.tfd.decidir_solicitacao"
              fallback={
                <p className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">Sem permissão</p>
              }
            >
              <Button variant="primary">Decidir solicitação</Button>
            </PermissionGate>
          </Card>
          <Card>
            <p className="mb-[var(--space-3)] text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
              Sem permissão (fallback)
            </p>
            <PermissionGate
              session={mockSessionWithoutPermission}
              permission="saude.tfd.decidir_solicitacao"
              fallback={
                <Alert variant="warning">Você não tem permissão para esta ação.</Alert>
              }
            >
              <Button variant="primary">Decidir solicitação</Button>
            </PermissionGate>
          </Card>
        </div>
      </Section>

      <Section title="TramitacaoTimeline">
        <TramitacaoTimeline tramitacoes={tramitacoesExemplo} />
        <div className="mt-[var(--space-6)]">
          <p className="mb-[var(--space-2)] text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
            Lista vazia:
          </p>
          <TramitacaoTimeline tramitacoes={[]} />
        </div>
      </Section>

      <Section title="DataTable">
        <DataTable
          data={solicitacoesExemplo}
          columns={solicitacaoColumns}
          pagination={{ page: tablePage, perPage: 2, total: solicitacoesExemplo.length }}
          onPaginationChange={setTablePage}
          emptyMessage="Nenhuma solicitação na fila."
          onRowClick={(row) => {
            setUploadMessage(`Linha clicada: ${row.protocolo}`)
          }}
        />
        <div className="mt-[var(--space-6)]">
          <p className="mb-[var(--space-2)] text-[length:var(--text-sm)] font-medium text-[var(--color-text)]">
            Estado loading
          </p>
          <DataTable
            data={[]}
            columns={solicitacaoColumns}
            pagination={{ page: 1, perPage: 10, total: 0 }}
            onPaginationChange={() => undefined}
            loading
          />
        </div>
      </Section>
    </div>
  )
}
