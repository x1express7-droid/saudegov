# SKILL_EXPORT_DATA.md
# Como Implementar Exportação de Dados — saudegov

## Quando usar
Ao implementar qualquer funcionalidade de exportação — relatórios PDF,
CSV de listagens ou exportação completa por município.

---

## Passo 1 — Verificar regras antes de implementar

```
docs/SECURITY.md seção 9    → o que pode e não pode ser exportado
docs/BUSINESS_RULES.md 1.12 → relatórios obrigatórios do TFD
docs/AUTH_PERMISSIONS.md    → papel mínimo para exportar
```

---

## Passo 2 — Regras invioláveis de exportação

```
✅ Sempre incluir: protocolo, status, datas, valores, tramitações
✅ CPF sempre mascarado por padrão (***.456.***-**)
✅ Registrar EXPORT em audit_logs com escopo e filtros usados
✅ Rate limit: máximo 3 exportações por hora por usuário

❌ Nunca incluir por padrão: CID, diagnóstico, senhas, tokens
❌ Nunca exportar dados de outro tenant (tenant_id no where)
❌ Nunca gerar URL de download sem expiração (máximo 24h)
```

---

## Passo 3 — Template de Server Action de exportação

```typescript
'use server'

export async function exportarRelatorioTfd(
  rawInput: unknown
): Promise<ActionResponse<{ downloadUrl: string; totalRegistros: number }>> {

  await assertModuleActive('saude', 'tfd')
  const session = await requireTenantRole('GESTOR')
  await requirePermission(session, TFD_PERMISSIONS.EXPORTAR_RELATORIO)

  const parsed = exportarRelatorioSchema.safeParse(rawInput)
  if (!parsed.success) return { success: false, error: 'Dados inválidos.' }

  const db = await getPrismaForTenant(session.user.tenantId!)

  // Buscar dados — SEMPRE com tenant_id explícito
  const dados = await db.saudeTfdSolicitacao.findMany({
    where: {
      tenant_id: session.user.tenantId!,
      ...(parsed.data.dataInicio && {
        created_at: { gte: new Date(parsed.data.dataInicio) }
      }),
    },
    select: {
      processo: { select: { protocolo: true, status: true } },
      especialidade: { select: { nome: true } },
      urgencia: true,
      tipo_atendimento: true,
      created_at: true,
      // ❌ NUNCA: cid_principal, diagnostico
    },
  })

  // Gerar arquivo (CSV ou PDF)
  const arquivo = await gerarCSV(dados)

  // Upload temporário ao storage
  const storagePath = `${session.user.tenantId}/exports/${Date.now()}.csv`
  await uploadArquivoTemporario(storagePath, arquivo)

  // URL com expiração de 24h
  const downloadUrl = await gerarUrlAssinada(storagePath, { expiresIn: '24h' })

  // Registrar EXPORT em audit_logs (obrigatório)
  await createAuditLog({
    tenantId: session.user.tenantId!,
    userId: session.user.id,
    acao: 'EXPORT',
    entidade: 'saude_tfd_relatorio',
    payloadDepois: {
      filtros: parsed.data,
      totalRegistros: dados.length,
      formato: 'csv',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  })

  return { success: true, data: { downloadUrl, totalRegistros: dados.length } }
}
```

---

## Passo 4 — Rodapé obrigatório em PDFs

```typescript
// Todo relatório PDF deve incluir no rodapé:
const rodape = `Relatório gerado por ${session.user.name} em ${formatData(new Date())} — saudegov`
```

---

## Passo 5 — Exportação completa por município (Painel Dev)

```typescript
// Apenas SUPERADMIN — via Painel Dev
// Exporta TODOS os dados do município filtrados por tenant_id

export async function exportarDadosMunicipio(tenantId: string) {
  // Verificar SUPERADMIN antes de qualquer coisa
  const session = await requireTenantRole('SUPERADMIN')

  const db = await getPrismaForTenant(tenantId)

  // Exportar por módulo — cada query com tenant_id explícito
  const pacientes = await db.saudeBasePaciente.findMany({
    where: { tenant_id: tenantId },
    select: {
      // CPF mascarado — dados identificáveis requerem autorização explícita
      nome: true,
      cns: true,
      // cpf: false — não incluir por padrão
    }
  })

  // Registrar exportação
  await createAuditLog({
    tenantId,
    userId: session.user.id,
    acao: 'EXPORT',
    entidade: 'tenant_completo',
    payloadDepois: { solicitadoPor: session.user.email, timestamp: new Date() },
  })
}
```

---

## Checklist de Exportação

- [ ] `tenant_id` explícito em todas as queries de exportação?
- [ ] CID e diagnóstico excluídos por padrão?
- [ ] CPF mascarado nas exportações padrão?
- [ ] `EXPORT` registrado em `audit_logs` com filtros e escopo?
- [ ] URL de download com expiração máxima de 24h?
- [ ] Rate limit respeitado (3 exports/hora)?
- [ ] Rodapé com nome do solicitante e data nos PDFs?
- [ ] Papel mínimo GESTOR + permissão `exportar_relatorio`?
