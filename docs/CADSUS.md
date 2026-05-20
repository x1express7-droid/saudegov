# CADSUS.md
# saudegov — Integração CADSUS

> **Instruções para o agente do Cursor:** Consulte este arquivo antes de implementar
> qualquer funcionalidade que envolva busca ou cadastro de pacientes. O CADSUS é
> a fonte de dados oficial do SUS — nunca criar paciente sem tentativa de consulta.
> Todo dado vindo do CADSUS deve ser gravado no banco local. A integração real
> é ativada por município no Painel Dev — use sempre o stub para desenvolvimento.

---

## 1. O que é o CADSUS

O **CADSUS** (Cadastro Nacional de Usuários do SUS) é o sistema federal do
Ministério da Saúde que centraliza os dados de cadastro dos usuários do SUS.
Gerenciado pela RNDS (Rede Nacional de Dados em Saúde).

**Por que integrar:**
- Evita duplicação de cadastros de pacientes
- Preenche automaticamente dados do paciente pelo CNS
- Garante que o paciente seja identificado corretamente no SUS
- Reduz erros de digitação no cadastro manual

**Beneficia todos os módulos:** TFD, Regulação, UBS, Farmácia — qualquer
módulo que precisar identificar pacientes usa este mesmo serviço.

---

## 2. Estratégia em Fases

### Fase 1 — Stub (atual, MVP)
- Retorna dados mockados para desenvolvimento
- Comportamento idêntico ao real para o código
- Permite desenvolvimento e testes sem credenciais reais
- Configurado como padrão em todos os ambientes

### Fase 2 — Integração Real (RNDS)
- Autenticação via certificado digital A1/A3 do município
- Endpoint RNDS: `https://ehr.saude.gov.br/api/fhir/r4/Patient`
- Cada município tem suas próprias credenciais configuradas no Painel Dev
- A ativação não requer mudança de código — apenas configuração no banco

---

## 3. Configuração por Município

A integração CADSUS é configurada individualmente por município no Painel Dev:

```json
// tenant.settings (JSONB)
{
  "cadsus_enabled": false,          // false = usa stub
  "cadsus_certificado_path": null,  // caminho do certificado no storage
  "cadsus_cnes": null,              // CNES do estabelecimento autorizador
  "cadsus_token": null              // token de acesso (quando aplicável)
}
```

O código verifica `tenant.settings.cadsus_enabled` para decidir entre
stub e integração real — sem mudança de código por município.

---

## 4. Interface da Integração

```typescript
// packages/core-documents/src/cadsus/types.ts

export interface CadsusResult {
  encontrado: boolean
  nome?: string
  dataNascimento?: string       // ISO 8601 date
  nomeMae?: string
  municipioNascimento?: string
  sexo?: 'MASCULINO' | 'FEMININO' | 'NAO_INFORMADO'
  // CPF nunca retornado pelo CADSUS — vem do sistema
}

export interface CadsusService {
  buscarPorCns(cns: string): Promise<CadsusResult>
}
```

---

## 5. Stub de Desenvolvimento

```typescript
// packages/core-documents/src/cadsus/stub.ts

export class CadsusStub implements CadsusService {
  async buscarPorCns(cns: string): Promise<CadsusResult> {
    // Simula latência realista
    await new Promise(resolve => setTimeout(resolve, 300))

    // CNS inválido → não encontrado
    if (!this.validarCns(cns)) {
      return { encontrado: false }
    }

    // Retorna dados mockados baseados nos últimos 3 dígitos do CNS
    const seed = parseInt(cns.slice(-3))
    const nomes = ['Maria Silva Santos', 'João Batista Lima', 'Ana Paula Souza',
                   'Pedro Henrique Costa', 'Francisca Alves Ribeiro']

    return {
      encontrado: true,
      nome: nomes[seed % nomes.length],
      dataNascimento: `19${60 + (seed % 40)}-${String((seed % 12) + 1).padStart(2, '0')}-15`,
      nomeMae: 'Dados CADSUS Stub',
      municipioNascimento: 'Campo Grande',
      sexo: seed % 2 === 0 ? 'FEMININO' : 'MASCULINO',
    }
  }

  private validarCns(cns: string): boolean {
    // Validação do algoritmo do CNS
    if (!/^\d{15}$/.test(cns)) return false
    // ... algoritmo de verificação do dígito
    return true
  }
}
```

---

## 6. Cliente Real (RNDS)

```typescript
// packages/core-documents/src/cadsus/rnds-client.ts
// Implementado na Fase 2 — estrutura preparada agora

export class CadsusRnds implements CadsusService {
  constructor(
    private readonly cnes: string,
    private readonly token: string
  ) {}

  async buscarPorCns(cns: string): Promise<CadsusResult> {
    const response = await fetch(
      `https://ehr.saude.gov.br/api/fhir/r4/Patient?identifier=http://rnds.saude.gov.br/fhir/r4/NamingSystem/cns|${cns}`,
      {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'X-Authorization-Server': `Bearer ${this.token}`,
          'Content-Type': 'application/fhir+json',
        },
      }
    )

    if (!response.ok) return { encontrado: false }

    const bundle = await response.json()
    if (!bundle.entry?.length) return { encontrado: false }

    const patient = bundle.entry[0].resource
    return this.mapFhirToResult(patient)
  }

  private mapFhirToResult(patient: Record<string, unknown>): CadsusResult {
    // Mapeamento FHIR R4 → CadsusResult
    // Implementação completa na Fase 2
    return { encontrado: true }
  }
}
```

---

## 7. Factory — Escolha Automática

```typescript
// packages/core-documents/src/cadsus/index.ts

import { CadsusStub } from './stub'
import { CadsusRnds } from './rnds-client'
import type { CadsusService } from './types'

export function getCadsusService(tenantSettings: Record<string, unknown>): CadsusService {
  const enabled = tenantSettings?.cadsus_enabled === true
  const token = tenantSettings?.cadsus_token as string | null
  const cnes = tenantSettings?.cadsus_cnes as string | null

  if (enabled && token && cnes) {
    return new CadsusRnds(cnes, token)
  }

  return new CadsusStub()
}
```

---

## 8. Uso na Server Action

```typescript
// modules/saude/tfd/src/actions/solicitacao.ts

import { getCadsusService } from '@saude/core-documents'
import { createAuditLog } from '@saude/core-documents'

export async function buscarPacientePorCns(rawInput: unknown) {
  await assertModuleActive('saude', 'tfd')
  const session = await requireTenantRole('SERVIDOR')
  await requirePermission(session, TFD_PERMISSIONS.ABRIR_SOLICITACAO)

  const parsed = z.object({ cns: z.string().length(15) }).safeParse(rawInput)
  if (!parsed.success) return { success: false, error: 'CNS inválido.' }

  const tenant = await getTenantContext()
  const db = await getPrismaForTenant(session.user.tenantId!)

  // Busca tenant.settings para escolher stub ou real
  const tenantData = await db.tenant.findUnique({
    where: { id: session.user.tenantId! },
    select: { settings: true }
  })

  const cadsus = getCadsusService(tenantData?.settings as Record<string, unknown>)
  const resultado = await cadsus.buscarPorCns(parsed.data.cns)

  // Registrar toda consulta ao CADSUS em audit_log
  await createAuditLog({
    tenantId: session.user.tenantId!,
    userId: session.user.id,
    acao: 'READ_SENSITIVE',
    entidade: 'cadsus_consulta',
    payloadDepois: {
      cns: `${parsed.data.cns.slice(0, 3)}****`,  // mascarado no log
      encontrado: resultado.encontrado,
      fonte: tenantData?.settings?.cadsus_enabled ? 'RNDS' : 'STUB',
    }
  })

  if (!resultado.encontrado) {
    return { success: false, error: 'Paciente não encontrado no CADSUS.' }
  }

  return {
    success: true,
    data: {
      nome: resultado.nome,
      dataNascimento: resultado.dataNascimento,
      municipioNascimento: resultado.municipioNascimento,
      sexo: resultado.sexo,
      // CPF sempre mascarado — confirmação visual pelo servidor
    }
  }
}
```

---

## 9. Gravação no Banco Local

Todo dado vindo do CADSUS é gravado em `saude_base.pacientes`.
O banco local é a fonte de verdade operacional — o CADSUS é auxiliar.

```typescript
// Ao vincular paciente, sempre gravar no banco local
await db.saudeBasePaciente.upsert({
  where: { tenant_id_cns: { tenant_id: tenantId, cns } },
  create: {
    tenant_id: tenantId,
    nome: resultado.nome!,
    cns,
    cpf,
    data_nascimento: resultado.dataNascimento ? new Date(resultado.dataNascimento) : null,
    nome_mae: resultado.nomeMae,
    municipio_nascimento: resultado.municipioNascimento,
    sexo: resultado.sexo ?? 'NAO_INFORMADO',
    cadsus_sincronizado_at: new Date(),
  },
  update: {
    // Atualiza campos que podem ter mudado desde o último cadastro
    cadsus_sincronizado_at: new Date(),
    cadsus_divergencia: false,
  }
})
```

**Regra de divergência:** se CPF informado pelo servidor não corresponde ao CNS
no CADSUS → `cadsus_divergencia = true` → bloqueia o vínculo com mensagem clara.

---

## 10. Validação de CNS

```typescript
// packages/validators/src/cns.ts

export function validarCNS(cns: string): boolean {
  if (!/^\d{15}$/.test(cns)) return false

  // Algoritmo de verificação do CNS (Ministério da Saúde)
  const pis = cns.slice(0, 11)
  let soma = 0
  for (let i = 0; i < 11; i++) {
    soma += parseInt(pis[i]) * (15 - i)
  }

  let dsc = 0
  let resultado = soma % 11

  if (resultado !== 0) {
    dsc = 11 - resultado
    if (dsc === 10) {
      soma += 2
      resultado = soma % 11
      dsc = resultado !== 0 ? 11 - resultado : 0
    }
  }

  const sequencia = `${10000 + dsc}${11 - (soma % 11)}`.slice(-4)
  const cnsComputado = `${pis}${sequencia}`.slice(0, 15)

  // CNS pode iniciar com 1, 2 (definitivos) ou 7, 8, 9 (provisórios)
  const primeiroDigito = parseInt(cns[0])
  if (![1, 2, 7, 8, 9].includes(primeiroDigito)) return false

  return cns === cnsComputado || cns.startsWith('7') || cns.startsWith('8') || cns.startsWith('9')
}
```

---

## 11. Documentos Relacionados

- `DATABASE_SCHEMA.md` — tabela `saude_base.pacientes` com campos CADSUS
- `BUSINESS_RULES.md` — regras de vínculo de paciente no TFD
- `SECURITY.md` — proteção de dados pessoais e audit logs
- `API_CONTRACTS.md` — contratos de `buscarPacientePorCns` e `vincularPaciente`
