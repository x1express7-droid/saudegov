'use client'

import { atualizarPacienteCompletoTfd } from '@saude/mod-saude-tfd/actions/paciente'
import type {
  AtualizarPacienteCompletoInput,
  TfdFilaMovimentacaoHistoricoItem,
  TfdPacientePerfilCadastro,
  TfdPacienteAgendamentoResumoItem,
  TfdPacienteProcessoListItem,
} from '@saude/mod-saude-tfd/client'
import type { SaudeMunicSession } from '@saude/core-auth/types/session'
import { TFD_PERMISSIONS } from '@saude/mod-saude-tfd/permissions'
import {
  Badge,
  Button,
  Card,
  CardHeader,
  DataTable,
  ProtocoloBadge,
  StatusBadge,
  formFieldsGridClassName,
  formFieldsStackClassName,
  Input,
  Select,
  formatDateOnlyBr,
  formatDateTimeBr,
  type ColumnDef,
  type TfdStatus,
} from '@saude/ui'
import { PermissionGate } from '@saude/ui/permission-gate'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState, useTransition } from 'react'

export type FilaHistoricoPerfilRow = TfdFilaMovimentacaoHistoricoItem & {
  protocolo: string
  solicitacaoId: string
}

const TABS = [
  { id: 'cadastro', label: 'Dados cadastrais' },
  { id: 'processos', label: 'Processos TFD' },
  { id: 'agendamentos', label: 'Agendamentos' },
  { id: 'fila', label: 'Fila' },
] as const

type TabId = (typeof TABS)[number]['id']

const RACA_COR_OPTIONS = [
  { value: '', label: 'Não informado' },
  { value: 'BRANCA', label: 'Branca' },
  { value: 'PRETA', label: 'Preta' },
  { value: 'PARDA', label: 'Parda' },
  { value: 'AMARELA', label: 'Amarela' },
  { value: 'INDIGENA', label: 'Indígena' },
  { value: 'NAO_INFORMADO', label: 'Não informado (campo)' },
]

const TIPO_MOVIMENTACAO_LABEL: Record<string, string> = {
  ENTRADA: 'Entrada na fila',
  SAIDA: 'Saída da fila',
  AVANCO: 'Avanço',
  RECUO: 'Recuo',
  PRIORIDADE: 'Prioridade',
}

const SEXO_LABEL: Record<string, string> = {
  MASCULINO: 'Masculino',
  FEMININO: 'Feminino',
  NAO_INFORMADO: 'Não informado',
}

function isTfdStatus(value: string): value is TfdStatus {
  const statuses: Record<string, true> = {
    RASCUNHO: true,
    ENVIADO: true,
    EM_ANALISE: true,
    PENDENTE: true,
    APROVADO: true,
    NEGADO: true,
    AGENDADO: true,
    EM_VIAGEM: true,
    AGUARDANDO_PC: true,
    PC_EM_ANALISE: true,
    CONCLUIDO: true,
    CANCELADO: true,
  }
  return value in statuses
}

function formatDate(iso: string | null): string {
  return formatDateOnlyBr(iso)
}

function formatDateTime(iso: string): string {
  return formatDateTimeBr(iso, iso)
}

function formatPrestador(row: TfdPacienteProcessoListItem): string {
  const partes = [row.prestadorNome, row.prestadorCidade, row.prestadorEstado].filter(Boolean)
  return partes.length > 0 ? partes.join(' — ') : '—'
}

export interface PerfilPacienteViewProps {
  session: SaudeMunicSession
  cadastro: TfdPacientePerfilCadastro
  processos: TfdPacienteProcessoListItem[]
  processosTotal: number
  agendamentos: TfdPacienteAgendamentoResumoItem[]
  agendamentosTotal: number
  historicoFila: FilaHistoricoPerfilRow[]
}

export function PerfilPacienteView({
  session,
  cadastro,
  processos,
  processosTotal,
  agendamentos,
  agendamentosTotal,
  historicoFila,
}: PerfilPacienteViewProps) {
  const router = useRouter()
  const [tab, setTab] = useState<TabId>('cadastro')
  const [editando, setEditando] = useState(false)
  const [nomeSocial, setNomeSocial] = useState(cadastro.nomeSocial ?? '')
  const [email, setEmail] = useState(cadastro.email ?? '')
  const [telefoneCelular, setTelefoneCelular] = useState(cadastro.telefoneCelular ?? '')
  const [telefone, setTelefone] = useState(cadastro.telefone ?? '')
  const [telefoneAlternativo, setTelefoneAlternativo] = useState(cadastro.telefoneAlternativo ?? '')
  const [racaCor, setRacaCor] = useState(cadastro.racaCor ?? '')
  const [nacionalidade, setNacionalidade] = useState(cadastro.nacionalidade ?? '')
  const [identidadeGenero, setIdentidadeGenero] = useState(cadastro.identidadeGenero ?? '')
  const [responsavelLegalNome, setResponsavelLegalNome] = useState(
    cadastro.responsavelLegalNome ?? ''
  )
  const [responsavelLegalCpf, setResponsavelLegalCpf] = useState('')
  const [serverError, setServerError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function resetForm() {
    setNomeSocial(cadastro.nomeSocial ?? '')
    setEmail(cadastro.email ?? '')
    setTelefoneCelular(cadastro.telefoneCelular ?? '')
    setTelefone(cadastro.telefone ?? '')
    setTelefoneAlternativo(cadastro.telefoneAlternativo ?? '')
    setRacaCor(cadastro.racaCor ?? '')
    setNacionalidade(cadastro.nacionalidade ?? '')
    setIdentidadeGenero(cadastro.identidadeGenero ?? '')
    setResponsavelLegalNome(cadastro.responsavelLegalNome ?? '')
    setResponsavelLegalCpf('')
    setServerError(null)
  }

  function handleSalvarCadastro() {
    setServerError(null)
    startTransition(async () => {
      const payload: AtualizarPacienteCompletoInput = {
        pacienteId: cadastro.id,
      }

      const nomeSocialTrim = nomeSocial.trim()
      const emailTrim = email.trim()
      const telefoneCelularTrim = telefoneCelular.trim()
      const telefoneTrim = telefone.trim()
      const telefoneAlternativoTrim = telefoneAlternativo.trim()
      const nacionalidadeTrim = nacionalidade.trim()
      const identidadeGeneroTrim = identidadeGenero.trim()
      const responsavelNomeTrim = responsavelLegalNome.trim()
      const responsavelCpfDigits = responsavelLegalCpf.replace(/\D/g, '')

      if (nomeSocialTrim) payload.nomeSocial = nomeSocialTrim
      if (emailTrim) payload.email = emailTrim
      if (telefoneCelularTrim) payload.telefoneCelular = telefoneCelularTrim
      if (telefoneTrim) payload.telefone = telefoneTrim
      if (telefoneAlternativoTrim) payload.telefoneAlternativo = telefoneAlternativoTrim
      const racasValidas = [
        'BRANCA',
        'PRETA',
        'PARDA',
        'AMARELA',
        'INDIGENA',
        'NAO_INFORMADO',
      ] as const
      if (racaCor && racasValidas.includes(racaCor as (typeof racasValidas)[number])) {
        payload.racaCor = racaCor as AtualizarPacienteCompletoInput['racaCor']
      }
      if (nacionalidadeTrim) payload.nacionalidade = nacionalidadeTrim
      if (identidadeGeneroTrim) payload.identidadeGenero = identidadeGeneroTrim
      if (responsavelNomeTrim) payload.responsavelLegalNome = responsavelNomeTrim
      if (responsavelCpfDigits) payload.responsavelLegalCpf = responsavelCpfDigits

      const result = await atualizarPacienteCompletoTfd(payload)

      if (!result.success) {
        setServerError(result.error ?? 'Não foi possível salvar os dados.')
        return
      }

      setEditando(false)
      setResponsavelLegalCpf('')
      router.refresh()
    })
  }

  const processosColumns = useMemo<ColumnDef<TfdPacienteProcessoListItem>[]>(
    () => [
      {
        id: 'protocolo',
        header: 'Protocolo',
        cell: ({ row }) => (
          <Link
            href={`/saude/tfd/${row.original.solicitacaoId}`}
            className="inline-flex"
            onClick={(event) => event.stopPropagation()}
          >
            <ProtocoloBadge protocolo={row.original.protocolo} />
          </Link>
        ),
      },
      {
        id: 'status',
        header: 'Status',
        cell: ({ row }) =>
          isTfdStatus(row.original.statusSolicitacao) ? (
            <StatusBadge status={row.original.statusSolicitacao} />
          ) : (
            <span className="text-[var(--color-text-muted)]">{row.original.statusSolicitacao}</span>
          ),
      },
      {
        id: 'especialidade',
        header: 'Especialidade',
        cell: ({ row }) => (
          <span className="text-[var(--color-text)]">
            {row.original.especialidadeNome ?? '—'}
          </span>
        ),
      },
      {
        id: 'prestador',
        header: 'Prestador',
        cell: ({ row }) => (
          <span className="text-[var(--color-text-muted)]">{formatPrestador(row.original)}</span>
        ),
      },
      {
        id: 'fila',
        header: 'Posição na fila',
        cell: ({ row }) =>
          row.original.posicaoFila != null ? (
            <Badge variant="blue" size="sm">
              #{row.original.posicaoFila}
            </Badge>
          ) : (
            <span className="text-[var(--color-text-muted)]">—</span>
          ),
      },
      {
        id: 'criadoEm',
        header: 'Abertura',
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-[var(--color-text-muted)]">
            {formatDateTime(row.original.criadoEm)}
          </span>
        ),
      },
      {
        id: 'atualizadoEm',
        header: 'Atualização',
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-[var(--color-text-muted)]">
            {formatDateTime(row.original.atualizadoEm)}
          </span>
        ),
      },
    ],
    []
  )

  const agendamentosColumns = useMemo<ColumnDef<TfdPacienteAgendamentoResumoItem>[]>(
    () => [
      {
        id: 'protocolo',
        header: 'Protocolo',
        cell: ({ row }) => <ProtocoloBadge protocolo={row.original.protocolo} />,
      },
      {
        id: 'dataViagem',
        header: 'Data',
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-[var(--color-text)]">
            {formatDate(row.original.dataViagem)}
          </span>
        ),
      },
      {
        id: 'status',
        header: 'Status',
        cell: ({ row }) => (
          <span className="text-[var(--color-text-muted)]">{row.original.statusViagem}</span>
        ),
      },
      {
        id: 'prestador',
        header: 'Prestador',
        cell: ({ row }) => (
          <span className="text-[var(--color-text-muted)]">
            {row.original.prestadorNome ?? '—'}
          </span>
        ),
      },
      {
        id: 'acao',
        header: '',
        cell: ({ row }) => (
          <Link
            href={`/saude/tfd/${row.original.solicitacaoId}`}
            className="text-[length:var(--text-sm)] font-medium text-[var(--color-primary)] hover:underline"
          >
            Ver solicitação
          </Link>
        ),
      },
    ],
    []
  )

  const filaColumns = useMemo<ColumnDef<FilaHistoricoPerfilRow>[]>(
    () => [
      {
        id: 'protocolo',
        header: 'Protocolo',
        cell: ({ row }) => <ProtocoloBadge protocolo={row.original.protocolo} />,
      },
      {
        id: 'criadoEm',
        header: 'Data',
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-[var(--color-text-muted)]">
            {formatDateTime(row.original.criadoEm)}
          </span>
        ),
      },
      {
        id: 'tipo',
        header: 'Tipo',
        cell: ({ row }) => (
          <span className="text-[var(--color-text)]">
            {TIPO_MOVIMENTACAO_LABEL[row.original.tipoMovimentacao] ??
              row.original.tipoMovimentacao}
          </span>
        ),
      },
      {
        id: 'posicaoAnterior',
        header: 'Posição anterior',
        cell: ({ row }) => (
          <span className="font-mono text-[var(--color-text-muted)]">
            {row.original.posicaoAnterior != null ? `#${row.original.posicaoAnterior}` : '—'}
          </span>
        ),
      },
      {
        id: 'posicaoNova',
        header: 'Posição nova',
        cell: ({ row }) => (
          <span className="font-mono text-[var(--color-text)]">
            {row.original.posicaoNova != null ? `#${row.original.posicaoNova}` : '—'}
          </span>
        ),
      },
      {
        id: 'usuario',
        header: 'Usuário',
        cell: ({ row }) => (
          <span className="text-[var(--color-text)]">{row.original.usuarioNome}</span>
        ),
      },
      {
        id: 'justificativa',
        header: 'Justificativa',
        cell: ({ row }) => (
          <span className="max-w-xs text-[var(--color-text-muted)]">
            {row.original.justificativa ?? '—'}
          </span>
        ),
      },
    ],
    []
  )

  return (
    <div className="flex flex-col gap-[var(--space-6)]">
      <div
        className="flex flex-wrap gap-[var(--space-1)] border-b border-[var(--color-border)]"
        role="tablist"
        aria-label="Seções do perfil do paciente"
      >
        {TABS.map((item) => {
          const selected = tab === item.id
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={selected}
              className={[
                'rounded-t-[var(--radius)] px-[var(--space-4)] py-[var(--space-2)] text-[length:var(--text-sm)] font-medium transition-colors',
                selected
                  ? 'border border-b-0 border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-primary)]'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]',
              ].join(' ')}
              onClick={() => setTab(item.id)}
            >
              {item.label}
            </button>
          )
        })}
      </div>

      {tab === 'cadastro' ? (
        <Card
          header={<CardHeader>Dados cadastrais</CardHeader>}
          bodyClassName={formFieldsStackClassName()}
        >
          {!editando ? (
            <dl className={formFieldsGridClassName()}>
              <div>
                <dt className="text-[length:var(--text-xs)] font-medium text-[var(--color-text-muted)]">
                  Nome
                </dt>
                <dd className="mt-1 text-[var(--color-text)]">{cadastro.nome}</dd>
              </div>
              <div>
                <dt className="text-[length:var(--text-xs)] font-medium text-[var(--color-text-muted)]">
                  Nome social
                </dt>
                <dd className="mt-1 text-[var(--color-text)]">{cadastro.nomeSocial ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-[length:var(--text-xs)] font-medium text-[var(--color-text-muted)]">
                  CPF
                </dt>
                <dd className="mt-1 font-mono text-[var(--color-text)]">
                  {cadastro.cpfMascarado ?? '—'}
                </dd>
              </div>
              <div>
                <dt className="text-[length:var(--text-xs)] font-medium text-[var(--color-text-muted)]">
                  CNS
                </dt>
                <dd className="mt-1 font-mono text-[var(--color-text)]">
                  {cadastro.cnsMascarado ?? '—'}
                </dd>
              </div>
              <div>
                <dt className="text-[length:var(--text-xs)] font-medium text-[var(--color-text-muted)]">
                  Data de nascimento
                </dt>
                <dd className="mt-1 text-[var(--color-text)]">
                  {formatDate(cadastro.dataNascimento)}
                </dd>
              </div>
              <div>
                <dt className="text-[length:var(--text-xs)] font-medium text-[var(--color-text-muted)]">
                  Sexo
                </dt>
                <dd className="mt-1 text-[var(--color-text)]">
                  {cadastro.sexo ? (SEXO_LABEL[cadastro.sexo] ?? cadastro.sexo) : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-[length:var(--text-xs)] font-medium text-[var(--color-text-muted)]">
                  E-mail
                </dt>
                <dd className="mt-1 text-[var(--color-text)]">{cadastro.email ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-[length:var(--text-xs)] font-medium text-[var(--color-text-muted)]">
                  Telefone celular
                </dt>
                <dd className="mt-1 text-[var(--color-text)]">{cadastro.telefoneCelular ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-[length:var(--text-xs)] font-medium text-[var(--color-text-muted)]">
                  Telefone
                </dt>
                <dd className="mt-1 text-[var(--color-text)]">{cadastro.telefone ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-[length:var(--text-xs)] font-medium text-[var(--color-text-muted)]">
                  Telefone alternativo
                </dt>
                <dd className="mt-1 text-[var(--color-text)]">
                  {cadastro.telefoneAlternativo ?? '—'}
                </dd>
              </div>
              <div>
                <dt className="text-[length:var(--text-xs)] font-medium text-[var(--color-text-muted)]">
                  Raça/cor
                </dt>
                <dd className="mt-1 text-[var(--color-text)]">{cadastro.racaCor ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-[length:var(--text-xs)] font-medium text-[var(--color-text-muted)]">
                  Nacionalidade
                </dt>
                <dd className="mt-1 text-[var(--color-text)]">{cadastro.nacionalidade ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-[length:var(--text-xs)] font-medium text-[var(--color-text-muted)]">
                  Identidade de gênero
                </dt>
                <dd className="mt-1 text-[var(--color-text)]">
                  {cadastro.identidadeGenero ?? '—'}
                </dd>
              </div>
              <div>
                <dt className="text-[length:var(--text-xs)] font-medium text-[var(--color-text-muted)]">
                  Responsável legal
                </dt>
                <dd className="mt-1 text-[var(--color-text)]">
                  {cadastro.responsavelLegalNome ?? '—'}
                </dd>
              </div>
              <div>
                <dt className="text-[length:var(--text-xs)] font-medium text-[var(--color-text-muted)]">
                  CPF do responsável
                </dt>
                <dd className="mt-1 font-mono text-[var(--color-text)]">
                  {cadastro.responsavelLegalCpfMascarado ?? '—'}
                </dd>
              </div>
              <div>
                <dt className="text-[length:var(--text-xs)] font-medium text-[var(--color-text-muted)]">
                  Município / UF
                </dt>
                <dd className="mt-1 text-[var(--color-text)]">
                  {[cadastro.municipio, cadastro.uf].filter(Boolean).join(' / ') || '—'}
                </dd>
              </div>
              <div>
                <dt className="text-[length:var(--text-xs)] font-medium text-[var(--color-text-muted)]">
                  Situação
                </dt>
                <dd className="mt-1">
                  <Badge variant={cadastro.ativo ? 'green' : 'gray'} size="sm">
                    {cadastro.ativo ? 'Ativo' : 'Inativo'}
                  </Badge>
                </dd>
              </div>
            </dl>
          ) : (
            <div className={formFieldsGridClassName()}>
              <Input id="perfil-nome" label="Nome" value={cadastro.nome} disabled />
              <Input
                id="perfil-nome-social"
                label="Nome social"
                value={nomeSocial}
                onChange={(event) => setNomeSocial(event.target.value)}
                disabled={isPending}
              />
              <Input
                id="perfil-email"
                label="E-mail"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={isPending}
              />
              <Input
                id="perfil-celular"
                label="Telefone celular"
                value={telefoneCelular}
                onChange={(event) => setTelefoneCelular(event.target.value)}
                disabled={isPending}
              />
              <Input
                id="perfil-telefone"
                label="Telefone"
                value={telefone}
                onChange={(event) => setTelefone(event.target.value)}
                disabled={isPending}
              />
              <Input
                id="perfil-telefone-alt"
                label="Telefone alternativo"
                value={telefoneAlternativo}
                onChange={(event) => setTelefoneAlternativo(event.target.value)}
                disabled={isPending}
              />
              <Select
                id="perfil-raca"
                label="Raça/cor"
                options={RACA_COR_OPTIONS}
                value={racaCor}
                onValueChange={setRacaCor}
                disabled={isPending}
              />
              <Input
                id="perfil-nacionalidade"
                label="Nacionalidade"
                value={nacionalidade}
                onChange={(event) => setNacionalidade(event.target.value)}
                disabled={isPending}
              />
              <Input
                id="perfil-identidade-genero"
                label="Identidade de gênero"
                value={identidadeGenero}
                onChange={(event) => setIdentidadeGenero(event.target.value)}
                disabled={isPending}
              />
              <Input
                id="perfil-responsavel"
                label="Responsável legal"
                value={responsavelLegalNome}
                onChange={(event) => setResponsavelLegalNome(event.target.value)}
                disabled={isPending}
                className="sm:col-span-2"
              />
              <Input
                id="perfil-responsavel-cpf"
                label="CPF do responsável (informe apenas para alterar)"
                value={responsavelLegalCpf}
                onChange={(event) =>
                  setResponsavelLegalCpf(event.target.value.replace(/\D/g, '').slice(0, 11))
                }
                disabled={isPending}
                inputMode="numeric"
                hint={
                  cadastro.responsavelLegalCpfMascarado
                    ? `Atual: ${cadastro.responsavelLegalCpfMascarado}`
                    : undefined
                }
              />
            </div>
          )}

          {serverError ? (
            <p role="alert" className="text-[length:var(--text-sm)] text-[var(--color-error)]">
              {serverError}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-[var(--space-2)]">
            {!editando ? (
              <PermissionGate session={session} permission={TFD_PERMISSIONS.ABRIR_SOLICITACAO}>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    resetForm()
                    setEditando(true)
                  }}
                >
                  Editar dados
                </Button>
              </PermissionGate>
            ) : (
              <>
                <Button
                  type="button"
                  variant="primary"
                  onClick={handleSalvarCadastro}
                  loading={isPending}
                >
                  Salvar
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    resetForm()
                    setEditando(false)
                  }}
                  disabled={isPending}
                >
                  Cancelar
                </Button>
              </>
            )}
          </div>
        </Card>
      ) : null}

      {tab === 'processos' ? (
        <div className="flex flex-col gap-[var(--space-2)]">
          <p className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
            {processosTotal === 1
              ? '1 processo TFD vinculado a este paciente.'
              : `${processosTotal} processos TFD vinculados a este paciente.`}
          </p>
          <DataTable
            data={processos}
            columns={processosColumns}
            pagination={{
              page: 1,
              perPage: Math.max(processos.length, 1),
              total: processosTotal,
            }}
            onPaginationChange={() => {}}
            emptyMessage="Nenhum processo TFD"
            emptyDescription="Este paciente ainda não possui solicitações TFD registradas."
          />
        </div>
      ) : null}

      {tab === 'agendamentos' ? (
        <div className="flex flex-col gap-[var(--space-2)]">
          <p className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
            {agendamentosTotal === 1
              ? '1 agendamento (viagem) registrado.'
              : `${agendamentosTotal} agendamentos (viagens) registrados.`}
          </p>
          <DataTable
            data={agendamentos}
            columns={agendamentosColumns}
            pagination={{
              page: 1,
              perPage: Math.max(agendamentos.length, 1),
              total: agendamentosTotal,
            }}
            onPaginationChange={() => {}}
            emptyMessage="Nenhum agendamento"
            emptyDescription="Não há viagens TFD agendadas para este paciente."
          />
        </div>
      ) : null}

      {tab === 'fila' ? (
        <div className="flex flex-col gap-[var(--space-2)]">
          <p className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
            Histórico de movimentações na fila de regulação (todas as solicitações do paciente).
          </p>
          <DataTable
            data={historicoFila}
            columns={filaColumns}
            pagination={{
              page: 1,
              perPage: Math.max(historicoFila.length, 1),
              total: historicoFila.length,
            }}
            onPaginationChange={() => {}}
            emptyMessage="Nenhuma movimentação na fila"
            emptyDescription="Ainda não há registros de entrada, saída ou reposicionamento na fila."
          />
        </div>
      ) : null}
    </div>
  )
}
