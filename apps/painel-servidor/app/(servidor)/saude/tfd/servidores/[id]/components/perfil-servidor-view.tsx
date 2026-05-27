'use client'

import { atualizarDadosServidor } from '@saude/mod-saude-tfd/actions/servidor'
import type { PerfilServidorOutput } from '@saude/mod-saude-tfd/client'
import { TFD_GRANULAR_PERMISSION_DEFINITIONS } from '@saude/mod-saude-tfd/permissions'
import {
  Badge,
  Button,
  Card,
  CardHeader,
  DataTable,
  Input,
  Spinner,
  cn,
  formFieldsGridClassName,
  formFieldsStackClassName,
  type ColumnDef,
} from '@saude/ui'
import { useRouter } from 'next/navigation'
import { useMemo, useState, useTransition } from 'react'

const ROLE_LABEL: Record<string, string> = {
  SUPERADMIN: 'Superadmin',
  ADMIN: 'Administrador',
  GESTOR: 'Gestor',
  SERVIDOR: 'Servidor',
}

const dateTimeFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

function formatDateTime(iso: string): string {
  try {
    return dateTimeFormatter.format(new Date(iso))
  } catch {
    return iso
  }
}

function formatDate(iso: string): string {
  try {
    return new Date(`${iso}T12:00:00`).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'UTC',
    })
  } catch {
    return iso
  }
}

function cnhStatusBadge(motorista: NonNullable<PerfilServidorOutput['motorista']>) {
  if (motorista.cnhVencida) {
    return <Badge variant="red">VENCIDA</Badge>
  }
  if (motorista.cnhVencendoEmBreve) {
    return <Badge variant="yellow">VENCENDO</Badge>
  }
  return <Badge variant="green">VÁLIDA</Badge>
}

export interface PerfilServidorViewProps {
  perfil: PerfilServidorOutput
  podeEditarDados: boolean
  podeVerHistorico: boolean
}

export function PerfilServidorView({
  perfil,
  podeEditarDados,
  podeVerHistorico,
}: PerfilServidorViewProps) {
  const router = useRouter()
  const [nome, setNome] = useState(perfil.nome)
  const [telefone, setTelefone] = useState(perfil.telefone ?? '')
  const [matricula, setMatricula] = useState(perfil.matricula ?? '')
  const [serverError, setServerError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isPending, startTransition] = useTransition()

  const historicoColumns = useMemo<
    ColumnDef<PerfilServidorOutput['ultimasAcoes'][number]>[]
  >(
    () => [
      {
        id: 'createdAt',
        header: 'Data',
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-[var(--color-text-muted)]">
            {formatDateTime(row.original.createdAt)}
          </span>
        ),
      },
      {
        id: 'acao',
        header: 'Ação',
        cell: ({ row }) => (
          <span className="font-medium text-[var(--color-text)]">{row.original.acao}</span>
        ),
      },
      {
        id: 'entidade',
        header: 'Entidade',
        cell: ({ row }) => (
          <span className="text-[var(--color-text-muted)]">{row.original.entidade}</span>
        ),
      },
    ],
    []
  )

  function handleSalvarDados() {
    setServerError(null)
    setSuccess(false)

    startTransition(async () => {
      const result = await atualizarDadosServidor({
        userId: perfil.id,
        nome: nome.trim(),
        telefone: telefone.trim() || undefined,
        matricula: matricula.trim() || undefined,
      })

      if (!result.success) {
        setServerError(result.error ?? 'Não foi possível salvar os dados.')
        return
      }

      setSuccess(true)
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col gap-[var(--space-6)]">
      <Card header={<CardHeader>Dados pessoais</CardHeader>} bodyClassName={formFieldsStackClassName()}>
        <div className={formFieldsGridClassName()}>
          <Input
            id="servidor-nome"
            label="Nome"
            value={nome}
            onChange={(event) => setNome(event.target.value)}
            disabled={!podeEditarDados || isPending}
            required
          />
          <Input
            id="servidor-telefone"
            label="Telefone"
            value={telefone}
            onChange={(event) => setTelefone(event.target.value)}
            disabled={!podeEditarDados || isPending}
          />
          <Input
            id="servidor-matricula"
            label="Matrícula"
            value={matricula}
            onChange={(event) => setMatricula(event.target.value)}
            disabled={!podeEditarDados || isPending}
          />
          <Input id="servidor-email" label="E-mail" value={perfil.email} disabled readOnly />
          <Input
            id="servidor-cpf"
            label="CPF"
            value={perfil.cpfMascarado ?? '—'}
            disabled
            readOnly
          />
        </div>

        {serverError ? (
          <p role="alert" className="text-[length:var(--text-sm)] text-[var(--color-error)]">
            {serverError}
          </p>
        ) : null}

        {success ? (
          <p className="text-[length:var(--text-sm)] text-[var(--color-success)]">
            Dados atualizados com sucesso.
          </p>
        ) : null}

        {podeEditarDados ? (
          <Button
            type="button"
            variant="primary"
            onClick={handleSalvarDados}
            disabled={isPending || nome.trim().length < 3}
            className="self-start"
          >
            {isPending ? (
              <>
                <Spinner className="size-4" />
                Salvando…
              </>
            ) : (
              'Salvar dados'
            )}
          </Button>
        ) : null}
      </Card>

      <Card header={<CardHeader>Papel e permissões TFD</CardHeader>}>
        <p className="mb-[var(--space-4)] text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
          Papel atual:{' '}
          <strong className="text-[var(--color-text)]">
            {ROLE_LABEL[perfil.role] ?? perfil.role}
          </strong>
          {!perfil.ativo ? (
            <Badge variant="gray" className="ml-[var(--space-2)]">
              Inativo
            </Badge>
          ) : null}
        </p>
        <p className="mb-[var(--space-3)] text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
          Permissões granulares do módulo TFD (somente leitura nesta tela). A edição é feita em
          Configurações → Servidores → Permissões.
        </p>
        <ul className="flex flex-col gap-[var(--space-2)]">
          {TFD_GRANULAR_PERMISSION_DEFINITIONS.map((item) => {
            const ativo = perfil.permissions[item.key] === true
            return (
              <li key={item.key}>
                <label
                  className={cn(
                    'flex cursor-not-allowed items-start gap-[var(--space-3)] rounded-[var(--radius)] border border-[var(--color-border)] px-[var(--space-3)] py-[var(--space-3)] opacity-80',
                    ativo && 'border-[var(--color-primary)] bg-[var(--color-primary-light)]'
                  )}
                >
                  <input
                    type="checkbox"
                    className="mt-0.5 size-4 shrink-0 accent-[var(--color-primary)]"
                    checked={ativo}
                    readOnly
                    disabled
                  />
                  <span className="flex min-w-0 flex-1 flex-col gap-[var(--space-1)]">
                    <span className="text-[length:var(--text-sm)] font-medium text-[var(--color-text)]">
                      {item.label}
                    </span>
                    <span className="text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
                      {item.descricao} · mín. {item.minRole === 'GESTOR' ? 'Gestor' : 'Servidor'}
                    </span>
                  </span>
                </label>
              </li>
            )
          })}
        </ul>
      </Card>

      <Card header={<CardHeader>Setores de atuação</CardHeader>}>
        {perfil.setores.length > 0 ? (
          <ul className="divide-y divide-[var(--color-border)]">
            {perfil.setores.map((setor) => (
              <li
                key={setor.id}
                className="flex flex-wrap items-center justify-between gap-[var(--space-2)] py-[var(--space-3)] first:pt-0 last:pb-0"
              >
                <div>
                  <p className="font-medium text-[var(--color-text)]">{setor.setorNome}</p>
                  <p className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
                    {setor.cargo?.trim() || 'Sem cargo informado'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-[var(--space-2)]">
                  {setor.principal ? (
                    <Badge variant="blue" size="sm">
                      Principal
                    </Badge>
                  ) : null}
                  <Badge variant={setor.ativo ? 'green' : 'gray'} size="sm">
                    {setor.ativo ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
            Nenhum setor vinculado.
          </p>
        )}
      </Card>

      {perfil.motorista ? (
        <Card header={<CardHeader>Motorista — CNH</CardHeader>}>
          <dl className="grid gap-[var(--space-4)] sm:grid-cols-2">
            <div>
              <dt className="text-[length:var(--text-xs)] font-medium text-[var(--color-text-muted)]">
                CNH
              </dt>
              <dd className="mt-1 font-mono text-[var(--color-text)]">{perfil.motorista.cnh}</dd>
            </div>
            <div>
              <dt className="text-[length:var(--text-xs)] font-medium text-[var(--color-text-muted)]">
                Categoria
              </dt>
              <dd className="mt-1 text-[var(--color-text)]">{perfil.motorista.cnhCategoria}</dd>
            </div>
            <div>
              <dt className="text-[length:var(--text-xs)] font-medium text-[var(--color-text-muted)]">
                Validade
              </dt>
              <dd className="mt-1 flex flex-wrap items-center gap-[var(--space-2)]">
                <span className="text-[var(--color-text)]">
                  {formatDate(perfil.motorista.cnhValidade)}
                </span>
                {cnhStatusBadge(perfil.motorista)}
              </dd>
            </div>
          </dl>
        </Card>
      ) : null}

      {podeVerHistorico ? (
        <Card header={<CardHeader>Histórico de ações</CardHeader>}>
          <p className="mb-[var(--space-4)] text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
            Últimas 20 ações registradas no audit log para este usuário.
          </p>
          <DataTable
            data={perfil.ultimasAcoes}
            columns={historicoColumns}
            pagination={{
              page: 1,
              perPage: Math.max(perfil.ultimasAcoes.length, 1),
              total: perfil.ultimasAcoes.length,
            }}
            onPaginationChange={() => {}}
            emptyMessage="Nenhuma ação registrada"
            emptyDescription="As ações do usuário no sistema aparecerão aqui."
          />
        </Card>
      ) : null}
    </div>
  )
}
