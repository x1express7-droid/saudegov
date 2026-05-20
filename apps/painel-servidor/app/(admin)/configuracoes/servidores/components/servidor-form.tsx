'use client'

import { criarServidor, atualizarServidor } from '../../../../../lib/actions/servidores'
import type { SetorSelectOption } from '../../../../../lib/types/responsaveis.types'
import type { ServidorDetail, ServidorRole } from '../../../../../lib/types/servidores.types'
import { Button, Input, Select, Spinner } from '@saude/ui'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { SetoresCheckboxGroup } from './setores-checkbox-group'
import { TempPasswordBanner } from './temp-password-banner'

interface ServidorFormProps {
  mode: 'create' | 'edit'
  setoresOpcoes: SetorSelectOption[]
  servidor?: ServidorDetail
}

const ROLE_OPTIONS = [
  { value: 'GESTOR', label: 'Gestor' },
  { value: 'SERVIDOR', label: 'Servidor' },
] as const

function formatCpfDisplay(cpf: string): string {
  if (cpf.length !== 11) {
    return cpf
  }
  return `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-${cpf.slice(9)}`
}

export function ServidorForm({ mode, setoresOpcoes, servidor }: ServidorFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})

  const [name, setName] = useState(servidor?.name ?? '')
  const [email, setEmail] = useState(servidor?.email ?? '')
  const [cpf, setCpf] = useState(servidor ? formatCpfDisplay(servidor.cpf) : '')
  const [matricula, setMatricula] = useState(servidor?.matricula ?? '')
  const [cargo, setCargo] = useState(servidor?.setores[0]?.cargo ?? '')
  const [role, setRole] = useState<ServidorRole>(servidor?.role ?? 'SERVIDOR')
  const [setorIds, setSetorIds] = useState<string[]>(
    servidor?.setores.map((s) => s.setorId) ?? []
  )

  const [tempPasswordResult, setTempPasswordResult] = useState<{
    nome: string
    password: string
  } | null>(null)

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    setFieldErrors({})

    startTransition(async () => {
      if (mode === 'create') {
        const res = await criarServidor({
          name,
          email,
          cpf,
          matricula: matricula || undefined,
          cargo: cargo || undefined,
          role,
          setorIds,
        })

        if (!res.success) {
          setError(res.error)
          if (res.fieldErrors) {
            setFieldErrors(res.fieldErrors as Record<string, string[]>)
          }
          return
        }

        setTempPasswordResult({
          nome: name.trim(),
          password: res.data.tempPassword,
        })
        router.refresh()
        return
      }

      if (!servidor) {
        return
      }

      const res = await atualizarServidor({
        id: servidor.id,
        name,
        email,
        matricula: matricula || null,
        cargo: cargo || null,
        role,
        setorIds,
      })

      if (!res.success) {
        setError(res.error)
        if (res.fieldErrors) {
          setFieldErrors(res.fieldErrors as Record<string, string[]>)
        }
        return
      }

      router.push('/configuracoes/servidores')
      router.refresh()
    })
  }

  if (mode === 'edit' && servidor && !servidor.active) {
    return (
      <p className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
        Este servidor está inativo e não pode ser editado.
      </p>
    )
  }

  if (tempPasswordResult) {
    return (
      <div className="flex max-w-2xl flex-col gap-[var(--space-6)]">
        <TempPasswordBanner
          servidorNome={tempPasswordResult.nome}
          tempPassword={tempPasswordResult.password}
          onDismiss={() => router.push('/configuracoes/servidores')}
        />
        <Button asChild variant="primary">
          <Link href="/configuracoes/servidores">Ir para listagem</Link>
        </Button>
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex max-w-2xl flex-col gap-[var(--space-4)]"
    >
      {error ? (
        <p role="alert" className="text-[length:var(--text-sm)] text-[var(--color-error)]">
          {error}
        </p>
      ) : null}

      <Input
        label="Nome completo"
        value={name}
        onChange={(e) => setName(e.target.value)}
        error={fieldErrors.name?.[0]}
        required
        disabled={isPending}
      />

      <Input
        label="E-mail"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={fieldErrors.email?.[0]}
        required
        disabled={isPending}
      />

      {mode === 'create' ? (
        <Input
          label="CPF"
          value={cpf}
          onChange={(e) => setCpf(e.target.value)}
          placeholder="000.000.000-00"
          error={fieldErrors.cpf?.[0]}
          required
          disabled={isPending}
        />
      ) : (
        <Input
          label="CPF"
          value={formatCpfDisplay(servidor?.cpf ?? '')}
          disabled
          hint="O CPF não pode ser alterado após o cadastro."
        />
      )}

      <Input
        label="Matrícula"
        value={matricula}
        onChange={(e) => setMatricula(e.target.value)}
        error={fieldErrors.matricula?.[0]}
        disabled={isPending}
      />

      <Input
        label="Cargo"
        value={cargo}
        onChange={(e) => setCargo(e.target.value)}
        hint="Aplicado aos vínculos com os setores selecionados."
        error={fieldErrors.cargo?.[0]}
        disabled={isPending}
      />

      <Select
        label="Papel"
        options={[...ROLE_OPTIONS]}
        value={role}
        onValueChange={(v) => setRole(v as ServidorRole)}
        error={fieldErrors.role?.[0]}
        required
        disabled={isPending}
      />

      <SetoresCheckboxGroup
        options={setoresOpcoes}
        selectedIds={setorIds}
        onChange={setSetorIds}
        error={fieldErrors.setorIds?.[0]}
        disabled={isPending}
      />

      <div className="flex flex-wrap gap-[var(--space-3)] pt-[var(--space-2)]">
        <Button type="submit" variant="primary" disabled={isPending}>
          {isPending ? (
            <>
              <Spinner className="size-4" />
              Salvando...
            </>
          ) : mode === 'create' ? (
            'Cadastrar servidor'
          ) : (
            'Salvar alterações'
          )}
        </Button>
        <Button asChild variant="secondary" disabled={isPending}>
          <Link href="/configuracoes/servidores">Cancelar</Link>
        </Button>
      </div>
    </form>
  )
}
