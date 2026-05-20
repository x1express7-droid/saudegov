import { PrismaClient, type UserRole } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

const SEED_PASSWORD = 'senha123'
const BCRYPT_ROUNDS = 10

const MODULES_TFD = { saude: { tfd: true } }

/** IDs fixos para upsert idempotente de entidades sem unique de negócio */
const SUPERADMIN_ID = '00000000-0000-4000-8000-000000000099'

const IDS = {
  campograndems: {
    secretaria: '11111111-1111-4111-8111-111111110001',
    departamento: '11111111-1111-4111-8111-111111110002',
    setor: '11111111-1111-4111-8111-111111110003',
    moduloSetor: '11111111-1111-4111-8111-111111110004',
    paciente: '11111111-1111-4111-8111-111111110005',
    unidade: '11111111-1111-4111-8111-111111110006',
  },
  altamirapa: {
    secretaria: '22222222-2222-4222-8222-222222220001',
    departamento: '22222222-2222-4222-8222-222222220002',
    setor: '22222222-2222-4222-8222-222222220003',
    paciente: '22222222-2222-4222-8222-222222220004',
    unidade: '22222222-2222-4222-8222-222222220005',
  },
} as const

async function hashPassword(): Promise<string> {
  return hash(SEED_PASSWORD, BCRYPT_ROUNDS)
}

async function upsertUser(params: {
  tenantId: string
  email: string
  role: UserRole
  name: string
  passwordHash: string
  permissions?: Record<string, boolean>
}) {
  return prisma.user.upsert({
    where: {
      tenant_id_email: {
        tenant_id: params.tenantId,
        email: params.email,
      },
    },
    update: {
      name: params.name,
      role: params.role,
      password_hash: params.passwordHash,
      active: true,
      permissions: params.permissions ?? {},
    },
    create: {
      tenant_id: params.tenantId,
      email: params.email,
      role: params.role,
      name: params.name,
      password_hash: params.passwordHash,
      active: true,
      permissions: params.permissions ?? {},
    },
  })
}

const SPRINT_03_PLATFORM_FEATURES = [
  {
    sistema: 'plataforma',
    modulo: 'auth',
    funcionalidade: 'tenant_resolver',
    descricao: 'Resolução de município pelo domínio (consulta ao banco a cada requisição)',
    painel_dev: false,
    painel_servidor: true,
    sprint: '0.3',
  },
  {
    sistema: 'plataforma',
    modulo: 'auth',
    funcionalidade: 'login',
    descricao: 'Autenticação com e-mail e senha via NextAuth v5',
    painel_dev: true,
    painel_servidor: true,
    sprint: '0.3',
  },
  {
    sistema: 'plataforma',
    modulo: 'auth',
    funcionalidade: 'recuperar_senha',
    descricao: 'Fluxo de recuperação de senha com token SHA-256, expira em 1h',
    painel_dev: false,
    painel_servidor: true,
    sprint: '0.3',
  },
  {
    sistema: 'plataforma',
    modulo: 'auth',
    funcionalidade: 'multi_tenant_middleware',
    descricao: 'Middleware de isolamento por tenant com injeção de contexto',
    painel_dev: true,
    painel_servidor: true,
    sprint: '0.3',
  },
  {
    sistema: 'plataforma',
    modulo: 'auth',
    funcionalidade: 'autorizacao_roles',
    descricao:
      'Verificação de papel mínimo (SUPERADMIN > ADMIN > GESTOR > SERVIDOR)',
    painel_dev: false,
    painel_servidor: true,
    sprint: '0.3',
  },
  {
    sistema: 'plataforma',
    modulo: 'auth',
    funcionalidade: 'autorizacao_permissoes',
    descricao:
      'Verificação de permissões granulares por chave saude.{modulo}.{acao}',
    painel_dev: false,
    painel_servidor: true,
    sprint: '0.3',
  },
] as const

async function seedPlatformFeaturesSprint03(): Promise<number> {
  for (const feature of SPRINT_03_PLATFORM_FEATURES) {
    await prisma.platformFeature.upsert({
      where: {
        sistema_modulo_funcionalidade: {
          sistema: feature.sistema,
          modulo: feature.modulo,
          funcionalidade: feature.funcionalidade,
        },
      },
      update: {
        descricao: feature.descricao,
        painel_dev: feature.painel_dev,
        painel_servidor: feature.painel_servidor,
        sprint: feature.sprint,
        status: 'ativo',
      },
      create: {
        sistema: feature.sistema,
        modulo: feature.modulo,
        funcionalidade: feature.funcionalidade,
        descricao: feature.descricao,
        painel_dev: feature.painel_dev,
        painel_servidor: feature.painel_servidor,
        sprint: feature.sprint,
        status: 'ativo',
      },
    })
  }
  return SPRINT_03_PLATFORM_FEATURES.length
}

async function seedOrganograma(
  tenantId: string,
  ids: (typeof IDS)['campograndems'] | (typeof IDS)['altamirapa'],
  options: { withModuloTfd: boolean; pacienteCpf: string; pacienteCns: string }
) {
  const secretaria = await prisma.secretaria.upsert({
    where: { id: ids.secretaria },
    update: { nome: 'Secretaria Municipal de Saúde', ativa: true },
    create: {
      id: ids.secretaria,
      tenant_id: tenantId,
      nome: 'Secretaria Municipal de Saúde',
      sigla: 'SMS',
      ativa: true,
    },
  })

  const departamento = await prisma.departamento.upsert({
    where: { id: ids.departamento },
    update: { nome: 'Departamento de Atenção Especializada', ativo: true },
    create: {
      id: ids.departamento,
      tenant_id: tenantId,
      secretaria_id: secretaria.id,
      nome: 'Departamento de Atenção Especializada',
      sigla: 'DAE',
      ativo: true,
    },
  })

  const setor = await prisma.setor.upsert({
    where: { id: ids.setor },
    update: { nome: 'Setor de TFD', ativo: true },
    create: {
      id: ids.setor,
      tenant_id: tenantId,
      departamento_id: departamento.id,
      nome: 'Setor de TFD',
      sigla: 'TFD',
      ativo: true,
    },
  })

  if (options.withModuloTfd && 'moduloSetor' in ids) {
    await prisma.moduloSetorResponsavel.upsert({
      where: {
        tenant_id_modulo_setor_id: {
          tenant_id: tenantId,
          modulo: 'saude.tfd',
          setor_id: setor.id,
        },
      },
      update: { ativo: true },
      create: {
        id: ids.moduloSetor,
        tenant_id: tenantId,
        modulo: 'saude.tfd',
        setor_id: setor.id,
        ativo: true,
      },
    })
  }

  await prisma.paciente.upsert({
    where: {
      tenant_id_cpf: {
        tenant_id: tenantId,
        cpf: options.pacienteCpf,
      },
    },
    update: { nome: 'Paciente Seed', ativo: true },
    create: {
      id: ids.paciente,
      tenant_id: tenantId,
      nome: 'Paciente Seed',
      cpf: options.pacienteCpf,
      cns: options.pacienteCns,
      ativo: true,
    },
  })

  await prisma.unidade.upsert({
    where: { id: ids.unidade },
    update: { nome: 'UBS Central Seed', ativa: true },
    create: {
      id: ids.unidade,
      tenant_id: tenantId,
      nome: 'UBS Central Seed',
      tipo: 'UBS',
      ativa: true,
    },
  })

  return { secretaria, departamento, setor }
}

async function main() {
  console.log('🌱 Iniciando seed de desenvolvimento...')

  const passwordHash = await hashPassword()

  const campograndems = await prisma.tenant.upsert({
    where: { slug: 'campograndems' },
    update: {
      modules: MODULES_TFD,
      active: true,
    },
    create: {
      slug: 'campograndems',
      name: 'Prefeitura Municipal de Campo Grande',
      domain: 'campograndems.saudemunic.com.br',
      modules: MODULES_TFD,
      theme: {
        primaryColor: '#1a5fa8',
        municipalityName: 'Prefeitura Municipal de Campo Grande',
      },
      settings: {
        timezone: 'America/Campo_Grande',
        cadsus_enabled: false,
      },
      active: true,
    },
  })

  const altamirapa = await prisma.tenant.upsert({
    where: { slug: 'altamirapa' },
    update: {
      modules: MODULES_TFD,
      active: true,
    },
    create: {
      slug: 'altamirapa',
      name: 'Prefeitura Municipal de Altamira',
      domain: 'altamirapa.saudemunic.com.br',
      modules: MODULES_TFD,
      theme: {
        primaryColor: '#2d6a4f',
        municipalityName: 'Prefeitura Municipal de Altamira',
      },
      settings: {
        timezone: 'America/Belem',
        cadsus_enabled: false,
      },
      active: true,
    },
  })

  await prisma.user.upsert({
    where: { id: SUPERADMIN_ID },
    update: {
      email: 'superadmin@saudemunic.com.br',
      role: 'SUPERADMIN',
      name: 'Super Admin',
      password_hash: passwordHash,
      active: true,
      tenant_id: null,
    },
    create: {
      id: SUPERADMIN_ID,
      tenant_id: null,
      email: 'superadmin@saudemunic.com.br',
      role: 'SUPERADMIN',
      name: 'Super Admin',
      password_hash: passwordHash,
      active: true,
      permissions: {},
    },
  })

  await upsertUser({
    tenantId: campograndems.id,
    email: 'admin@campograndems.saudemunic.com.br',
    role: 'ADMIN',
    name: 'Admin Campo Grande',
    passwordHash,
  })

  await upsertUser({
    tenantId: campograndems.id,
    email: 'gestor@campograndems.saudemunic.com.br',
    role: 'GESTOR',
    name: 'Gestor Campo Grande',
    passwordHash,
  })

  await upsertUser({
    tenantId: campograndems.id,
    email: 'servidor@campograndems.saudemunic.com.br',
    role: 'SERVIDOR',
    name: 'Servidor Campo Grande',
    passwordHash,
  })

  await upsertUser({
    tenantId: altamirapa.id,
    email: 'admin@altamirapa.saudemunic.com.br',
    role: 'ADMIN',
    name: 'Admin Altamira',
    passwordHash,
  })

  await upsertUser({
    tenantId: altamirapa.id,
    email: 'servidor@altamirapa.saudemunic.com.br',
    role: 'SERVIDOR',
    name: 'Servidor Altamira',
    passwordHash,
  })

  await seedOrganograma(campograndems.id, IDS.campograndems, {
    withModuloTfd: true,
    pacienteCpf: '52998224725',
    pacienteCns: '898001160660003',
  })
  await seedOrganograma(altamirapa.id, IDS.altamirapa, {
    withModuloTfd: false,
    pacienteCpf: '39053344705',
    pacienteCns: '898001160660004',
  })

  const platformFeaturesCount = await seedPlatformFeaturesSprint03()
  console.log(
    `\n📌 platform_features (Sprint 0.3): ${platformFeaturesCount} entradas inseridas/atualizadas (upsert idempotente).`
  )

  console.log('✅ Seed concluído.')
  console.log('\n📋 Credenciais de desenvolvimento (senha: senha123):')
  console.log('SUPERADMIN: superadmin@saudemunic.com.br')
  console.log('Campo Grande — ADMIN:   admin@campograndems.saudemunic.com.br')
  console.log('Campo Grande — GESTOR:  gestor@campograndems.saudemunic.com.br')
  console.log('Campo Grande — SERVIDOR: servidor@campograndems.saudemunic.com.br')
  console.log('Altamira — ADMIN:   admin@altamirapa.saudemunic.com.br')
  console.log('Altamira — SERVIDOR: servidor@altamirapa.saudemunic.com.br')
  console.log('\n🏙️  Tenants:')
  console.log(`  campograndems — ${campograndems.id}`)
  console.log(`  altamirapa    — ${altamirapa.id}`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
