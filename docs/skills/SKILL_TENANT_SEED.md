# SKILL_TENANT_SEED.md
# Como Criar Seed de Desenvolvimento — saudegov

## Quando usar
Ao configurar ambiente de desenvolvimento local ou ao adicionar
novos dados de teste para um módulo.

---

## Passo 1 — Localização do seed

```
packages/core-db/prisma/seed.ts
```

---

## Passo 2 — Estrutura obrigatória do seed

O seed cria dados mínimos para desenvolvimento e testes.
Sempre criar com **2 tenants diferentes** para validar o RLS.

```typescript
// packages/core-db/prisma/seed.ts

import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed de desenvolvimento...')

  // TENANT 1: Município principal de teste
  const tenant1 = await prisma.tenant.upsert({
    where: { slug: 'campo-grande-ms' },
    update: {},
    create: {
      slug: 'campo-grande-ms',
      name: 'Prefeitura de Campo Grande',
      domain: 'campograndems.saudemunic.local',
      modules: { saude: { tfd: true } },
      theme: {
        primaryColor: '#1a5fa8',
        municipalityName: 'Prefeitura de Campo Grande',
      },
      settings: {
        timezone: 'America/Campo_Grande',
        cadsus_enabled: false,
        notificationEmail: 'saude@campogrande.ms.gov.br',
      },
      active: true,
    },
  })

  // TENANT 2: Segundo município para validar isolamento RLS
  const tenant2 = await prisma.tenant.upsert({
    where: { slug: 'altamira-pa' },
    update: {},
    create: {
      slug: 'altamira-pa',
      name: 'Prefeitura de Altamira',
      domain: 'altamirapa.saudemunic.local',
      modules: { saude: { tfd: true } },
      theme: {
        primaryColor: '#2d6a4f',
        municipalityName: 'Prefeitura de Altamira',
      },
      settings: { timezone: 'America/Belem', cadsus_enabled: false },
      active: true,
    },
  })

  // SUPERADMIN
  await prisma.user.upsert({
    where: { email: 'admin@saudemunic.com.br' },
    update: {},
    create: {
      tenant_id: null,
      role: 'SUPERADMIN',
      name: 'Super Admin',
      email: 'admin@saudemunic.com.br',
      password_hash: await hash('Admin@123', 12),
      active: true,
      permissions: {},
    },
  })

  // Usuários do TENANT 1
  const adminT1 = await prisma.user.upsert({
    where: { email: 'admin@campogrande.ms.gov.br' },
    update: {},
    create: {
      tenant_id: tenant1.id,
      role: 'ADMIN',
      name: 'Admin Campo Grande',
      email: 'admin@campogrande.ms.gov.br',
      password_hash: await hash('Admin@123', 12),
      active: true,
      permissions: {},
    },
  })

  await prisma.user.upsert({
    where: { email: 'gestor.tfd@campogrande.ms.gov.br' },
    update: {},
    create: {
      tenant_id: tenant1.id,
      role: 'GESTOR',
      name: 'Gestor TFD',
      email: 'gestor.tfd@campogrande.ms.gov.br',
      password_hash: await hash('Admin@123', 12),
      active: true,
      permissions: {
        'saude.tfd.decidir_solicitacao': true,
        'saude.tfd.aprovar_prestacao': true,
        'saude.tfd.gerenciar_saldo': true,
        'saude.tfd.gerenciar_frota': true,
        'saude.tfd.cancelar_processo': true,
        'saude.tfd.ver_dashboard': true,
        'saude.tfd.exportar_relatorio': true,
      },
    },
  })

  await prisma.user.upsert({
    where: { email: 'atendente@campogrande.ms.gov.br' },
    update: {},
    create: {
      tenant_id: tenant1.id,
      role: 'SERVIDOR',
      name: 'Atendente TFD',
      email: 'atendente@campogrande.ms.gov.br',
      password_hash: await hash('Admin@123', 12),
      active: true,
      permissions: {
        'saude.tfd.abrir_solicitacao': true,
        'saude.tfd.analisar_laudo': true,
        'saude.tfd.agendar_viagem': true,
        'saude.tfd.registrar_retorno': true,
        'saude.tfd.registrar_despesa': true,
        'saude.tfd.enviar_prestacao': true,
      },
    },
  })

  console.log('✅ Seed concluído.')
  console.log('\n📋 Credenciais de desenvolvimento:')
  console.log('SUPERADMIN: admin@saudemunic.com.br / Admin@123')
  console.log('ADMIN:      admin@campogrande.ms.gov.br / Admin@123')
  console.log('GESTOR:     gestor.tfd@campogrande.ms.gov.br / Admin@123')
  console.log('SERVIDOR:   atendente@campogrande.ms.gov.br / Admin@123')
  console.log('\n🏙️  Tenants criados:')
  console.log(`Tenant 1: ${tenant1.id} — Campo Grande/MS`)
  console.log(`Tenant 2: ${tenant2.id} — Altamira/PA`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
```

---

## Passo 3 — Adicionar dados do módulo TFD ao seed

```typescript
// Adicionar após criação dos usuários

// Configuração TFD — Tenant 1
await prisma.saudeTfdEspecialidade.upsert({
  where: { /* unique constraint */ },
  update: {},
  create: {
    tenant_id: tenant1.id,
    nome: 'Cardiologia',
    ativa: true,
  },
})

await prisma.saudeTfdSaldo.create({
  data: {
    tenant_id: tenant1.id,
    descricao: 'Saldo TFD - Jan/2025',
    fonte: 'FEDERAL_FNS',
    valor_total: 50000.00,
    competencia_inicio: new Date('2025-01-01'),
    competencia_fim: new Date('2025-12-31'),
    ativo: true,
  },
})
```

---

## Passo 4 — Executar o seed

```bash
cd packages/core-db
npx prisma db seed

# Ou via script global
npm run db:seed
```

---

## Passo 5 — Validar RLS com 2 tenants

Após o seed, validar que os dados estão isolados:

```sql
-- Configurar tenant 1
SELECT set_config('app.current_tenant_id', '{id_tenant_1}', FALSE);

-- Deve retornar apenas dados do tenant 1
SELECT id, nome FROM saude_base.pacientes;
SELECT id, status FROM saude_tfd.solicitacoes;

-- Configurar tenant 2
SELECT set_config('app.current_tenant_id', '{id_tenant_2}', FALSE);

-- Deve retornar VAZIO (sem dados do tenant 1)
SELECT id, nome FROM saude_base.pacientes;
-- resultado: 0 rows — RLS funcionando ✅
```

---

## Checklist

- [ ] 2 tenants criados para validar RLS?
- [ ] SUPERADMIN sem `tenant_id` (null)?
- [ ] Usuários com diferentes papéis para testar permissões?
- [ ] Permissões granulares configuradas nos usuários GESTOR e SERVIDOR?
- [ ] Dados de configuração TFD (especialidades, saldo) criados?
- [ ] RLS validado com query direta no banco?
- [ ] Credenciais documentadas no output do seed?
