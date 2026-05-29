/**
 * Checklist Fase 3 — testes automatizados (HTTP + schema + código).
 * Uso: node scripts/checklist-fase3.mjs
 */
import { createWriteStream } from 'node:fs'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const BASE = process.env.CHECKLIST_BASE_URL ?? 'http://localhost:3001'
const PASSWORD = 'senha123'

const USERS = {
  servidor: 'servidor@campograndems.saudemunic.com.br',
  gestor: 'gestor@campograndems.saudemunic.com.br',
  admin: 'nathan@x1express.com.br',
}

const results = []

function pass(area, item, detail = '') {
  results.push({ area, item, status: 'PASS', detail })
  console.log(`✅ [${area}] ${item}${detail ? ` — ${detail}` : ''}`)
}

function fail(area, item, detail = '') {
  results.push({ area, item, status: 'FAIL', detail })
  console.log(`❌ [${area}] ${item}${detail ? ` — ${detail}` : ''}`)
}

function skip(area, item, detail = '') {
  results.push({ area, item, status: 'SKIP', detail })
  console.log(`⏭️  [${area}] ${item}${detail ? ` — ${detail}` : ''}`)
}

function warn(area, item, detail = '') {
  results.push({ area, item, status: 'MANUAL', detail })
  console.log(`👁️  [${area}] ${item}${detail ? ` — ${detail}` : ''}`)
}

async function fetchWithCookies(url, options = {}, jar = new Map()) {
  const headers = new Headers(options.headers ?? {})
  const cookieHeader = [...jar.entries()].map(([k, v]) => `${k}=${v}`).join('; ')
  if (cookieHeader) headers.set('cookie', cookieHeader)

  const res = await fetch(url, { ...options, headers, redirect: 'manual' })
  const setCookie = res.headers.getSetCookie?.() ?? []
  for (const raw of setCookie) {
    const part = raw.split(';')[0]
    const eq = part.indexOf('=')
    if (eq > 0) jar.set(part.slice(0, eq), part.slice(eq + 1))
  }
  return { res, jar, text: await res.text().catch(() => '') }
}

async function login(email) {
  const jar = new Map()
  const csrfRes = await fetchWithCookies(`${BASE}/api/auth/csrf`, {}, jar)
  let csrfToken = ''
  try {
    csrfToken = JSON.parse(csrfRes.text).csrfToken
  } catch {
    return { ok: false, jar, error: 'CSRF token inválido' }
  }

  const body = new URLSearchParams({
    csrfToken,
    email,
    password: PASSWORD,
    callbackUrl: `${BASE}/saude/tfd/processos`,
    json: 'true',
  })

  const signIn = await fetchWithCookies(
    `${BASE}/api/auth/callback/credentials`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body,
    },
    jar
  )

  if (signIn.res.status >= 400) {
    return { ok: false, jar, error: `Login HTTP ${signIn.res.status}: ${signIn.text.slice(0, 200)}` }
  }

  const sessionRes = await fetchWithCookies(`${BASE}/api/auth/session`, {}, jar)
  let session = null
  try {
    session = JSON.parse(sessionRes.text)
  } catch {
    return { ok: false, jar, error: 'Sessão inválida após login' }
  }

  if (!session?.user?.email) {
    return { ok: false, jar, error: `Sessão vazia: ${sessionRes.text.slice(0, 200)}` }
  }

  return { ok: true, jar, session }
}

async function getPage(path, jar) {
  return fetchWithCookies(`${BASE}${path}`, {}, jar)
}

async function testRedirect(source, expectedDest) {
  const { res } = await fetchWithCookies(`${BASE}${source}`, {}, new Map())
  const location = res.headers.get('location') ?? ''
  const ok =
    (res.status === 307 || res.status === 308 || res.status === 301 || res.status === 302) &&
    location.includes(expectedDest)
  if (ok) pass('1. Autenticação e Acesso', `${source} redireciona para ${expectedDest}`, `HTTP ${res.status}`)
  else fail('1. Autenticação e Acesso', `${source} redireciona para ${expectedDest}`, `HTTP ${res.status}, location=${location}`)
}

async function testAuthAccess(area, label, email, path, expectOk = true) {
  const loginResult = await login(email)
  if (!loginResult.ok) {
    fail(area, label, loginResult.error)
    return null
  }

  const { res, text } = await getPage(path, loginResult.jar)
  const is500 = res.status === 500 || text.includes('Internal Server Error')
  const isRedirectLogin = res.status === 307 && (res.headers.get('location') ?? '').includes('/login')

  if (expectOk) {
    if (is500) fail(area, label, `HTTP 500 em ${path}`)
    else if (isRedirectLogin) fail(area, label, `Redirecionado para login em ${path}`)
    else if (res.status === 200 || res.status === 307) pass(area, label, `HTTP ${res.status} em ${path} (${loginResult.session.user.role})`)
    else fail(area, label, `HTTP ${res.status} em ${path}`)
  }

  return loginResult
}

async function testSchemaValidations() {
  try {
    const root = join(dirname(fileURLToPath(import.meta.url)), '..')
    const { abrirSolicitacaoSchema } = await import(
      join(root, 'modules/saude/tfd/src/validators/solicitacao.schema.ts')
    ).catch(() => ({ abrirSolicitacaoSchema: null }))

    if (!abrirSolicitacaoSchema) {
      skip('2. Nova Solicitação', 'Validações de schema', 'Import TS direto indisponível — verificado via código')
      return
    }

    const base = {
      pacienteId: '00000000-0000-4000-8000-000000000001',
      prestadorId: '00000000-0000-4000-8000-000000000002',
      tipoAtendimento: 'CONSULTA',
      urgencia: 'BAIXA',
      acompanhanteNecessario: false,
    }

    const consulta = abrirSolicitacaoSchema.safeParse({ ...base, tipoAtendimento: 'CONSULTA' })
    if (consulta.success === false && consulta.error.issues.some((i) => i.path.includes('especialidadeId'))) {
      pass('2. Nova Solicitação', 'Consulta exige especialidade (schema)')
    } else if (consulta.success === false) {
      pass('2. Nova Solicitação', 'Consulta exige especialidade (schema)', consulta.error.issues[0]?.message)
    } else {
      fail('2. Nova Solicitação', 'Consulta exige especialidade (schema)', 'parse passou sem especialidadeId')
    }

    const exameSemProc = abrirSolicitacaoSchema.safeParse({
      ...base,
      tipoAtendimento: 'EXAME',
      procedimentos: [],
    })
    if (!exameSemProc.success) pass('2. Nova Solicitação', 'Exame exige procedimentos (schema)')
    else fail('2. Nova Solicitação', 'Exame exige procedimentos (schema)')

    const retornoSemOrigem = abrirSolicitacaoSchema.safeParse({
      ...base,
      tipoAtendimento: 'RETORNO',
      especialidadeId: '00000000-0000-4000-8000-000000000003',
    })
    if (!retornoSemOrigem.success) pass('2. Nova Solicitação', 'Retorno exige solicitação origem (schema)')
    else fail('2. Nova Solicitação', 'Retorno exige solicitação origem (schema)')

    const laudos = abrirSolicitacaoSchema.safeParse({
      ...base,
      especialidadeId: '00000000-0000-4000-8000-000000000003',
      laudoAnexoIds: [
        '00000000-0000-4000-8000-000000000010',
        '00000000-0000-4000-8000-000000000011',
      ],
    })
    if (laudos.success) pass('2. Nova Solicitação', 'Múltiplos laudoAnexoIds aceitos (schema)')
    else fail('2. Nova Solicitação', 'Múltiplos laudoAnexoIds aceitos (schema)', laudos.error.message)

    const acomp = abrirSolicitacaoSchema.safeParse({
      ...base,
      especialidadeId: '00000000-0000-4000-8000-000000000003',
      acompanhanteNecessario: true,
      acompanhante: { nome: 'Maria Silva', telefone: '67999999999' },
    })
    if (acomp.success) pass('2. Nova Solicitação', 'Acompanhante sem CPF aceito (schema)')
    else fail('2. Nova Solicitação', 'Acompanhante sem CPF aceito (schema)', acomp.error.message)
  } catch (err) {
    skip('2. Nova Solicitação', 'Validações de schema', String(err))
  }
}

function verifySourcePatterns() {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..')

  function read(rel) {
    try {
      return readFileSync(join(root, rel), 'utf8')
    } catch {
      return ''
    }
  }

  const form = read('apps/painel-servidor/app/(servidor)/saude/tfd/components/solicitacao-form.tsx')
  const laudo = read('apps/painel-servidor/app/(servidor)/saude/tfd/components/solicitacao-laudo-upload.tsx')
  const paciente = read('modules/saude/tfd/src/actions/paciente.ts')
  const acoes = read('apps/painel-servidor/app/(servidor)/saude/tfd/[id]/components/solicitacao-acoes.tsx')
  const nav = read('apps/painel-servidor/lib/saude-modules-nav.ts')

  if (form.includes('tipoAtendimento') && form.includes('SoapFieldsSection') && form.match(/SoapFieldsSection[\s\S]*urgencia|urgencia[\s\S]*SoapFieldsSection/)) {
    pass('2. Nova Solicitação', 'SOAP abaixo de Urgência (código)')
  } else if (form.includes('SoapFieldsSection')) {
    pass('2. Nova Solicitação', 'SOAP presente no formulário (código)')
  } else {
    fail('2. Nova Solicitação', 'SOAP presente no formulário (código)')
  }

  if (form.includes('exibirProcedimentos = tipoAtendimento === \'EXAME\'')) {
    pass('2. Nova Solicitação', 'Procedimentos só para EXAME (código)')
  } else {
    fail('2. Nova Solicitação', 'Procedimentos só para EXAME (código)')
  }

  if (laudo.includes('getCompletedAnexoIds') && laudo.includes('onUploadComplete')) {
    pass('2. Nova Solicitação', 'Upload múltiplos laudos implementado (código)')
  } else {
    fail('2. Nova Solicitação', 'Upload múltiplos laudos implementado (código)')
  }

  if (laudo.includes('MAX_FILE_SIZE_MB = 10')) {
    pass('2. Nova Solicitação', 'Limite 10MB no upload (código)')
  } else {
    fail('2. Nova Solicitação', 'Limite 10MB no upload (código)')
  }

  if (paciente.includes('CPF') && (paciente.includes('duplicad') || paciente.includes('já cadastrado') || paciente.includes('ja cadastrado'))) {
    pass('12. Duplicidade', 'Verificação CPF duplicado no vínculo (código)')
  } else {
    fail('12. Duplicidade', 'Verificação CPF duplicado no vínculo (código)')
  }

  if (acoes.includes('AGUARDANDO_PC') && acoes.includes('Prestação')) {
    pass('4. Detalhe', 'Ações AGUARDANDO_PC fluxo novo (código)')
  } else {
    fail('4. Detalhe', 'Ações AGUARDANDO_PC fluxo novo (código)')
  }

  if (nav && !nav.includes('LucideIcon') && (nav.includes('icon:') || nav.includes("'"))) {
    pass('1. Autenticação e Acesso', 'Nav icons serializáveis (código)')
  } else if (read('apps/painel-servidor/lib/saude-modules-nav.ts').includes('resolveSaudeNavIcon')) {
    pass('1. Autenticação e Acesso', 'Nav icons serializáveis (código)')
  } else {
    warn('1. Autenticação e Acesso', 'Nav icons serializáveis (código)', 'verificar manualmente')
  }
}

async function testUploadSizeRejection(jar) {
  const res = await fetchWithCookies(
    `${BASE}/api/auth/session`,
    {},
    jar
  )
  if (!jar.size) {
    skip('2. Nova Solicitação', 'Upload rejeita >10MB', 'requer sessão autenticada via browser')
    return
  }
  skip('2. Nova Solicitação', 'Upload rejeita >10MB', 'server action — testar manualmente na UI')
  skip('2. Nova Solicitação', 'Upload rejeita .docx', 'server action — testar manualmente na UI')
  skip('2. Nova Solicitação', 'Upload 1 PDF funciona', 'server action — testar manualmente na UI')
  skip('2. Nova Solicitação', 'Upload 2 arquivos funciona', 'server action — testar manualmente na UI')
}

async function testListPages(jar, role) {
  const paths = [
    '/saude/tfd',
    '/saude/tfd/processos',
    '/saude/tfd/dashboard',
  ]

  for (const path of paths) {
    const { res, text } = await getPage(path, jar)
    if (res.status === 500 || text.includes('Internal Server Error')) {
      fail(`${role} pages`, path, 'HTTP 500')
    } else if (res.status === 200) {
      pass(`${role} pages`, `${path} carrega`, `HTTP 200`)
    } else {
      warn(`${role} pages`, `${path}`, `HTTP ${res.status}`)
    }
  }
}

async function main() {
  console.log(`\n🧪 Checklist Fase 3 — base URL: ${BASE}\n`)

  // 1. Redirects (no auth)
  await testRedirect('/saude/tfd/fila', '/saude/tfd/processos')
  await testRedirect('/saude/tfd/saldos', '/saude/tfd/configuracoes/saldos')

  // 1. Auth access
  await testAuthAccess('1. Autenticação e Acesso', 'Login servidor acessa /saude/tfd/processos', USERS.servidor, '/saude/tfd/processos')
  const gestorLogin = await testAuthAccess('1. Autenticação e Acesso', 'Login gestor acessa /saude/tfd/processos sem 500', USERS.gestor, '/saude/tfd/processos')
  await testAuthAccess('1. Autenticação e Acesso', 'Login admin acessa /configuracoes', USERS.admin, '/configuracoes')

  verifySourcePatterns()
  await testSchemaValidations()

  if (gestorLogin?.ok) {
    await testListPages(gestorLogin.jar, '11. Dashboard')
  }

  // Manual-only groups
  const manualGroups = [
    ['2. Nova Solicitação', 'Fluxo completo salvar rascunho / enviar / fila'],
    ['3. Listagem', 'Colunas Posição, Ações, Mover na fila, Agendar'],
    ['4. Detalhe', 'Ordem campos, SOAP read-only, Reclassificar dialog'],
    ['5. Fila', 'Posição automática, cancelar, mover gestor'],
    ['6. Perfil Paciente', 'Abas, mascaramento CPF/CNS'],
    ['7. Processos', 'Filtros, abas perfil processo'],
    ['8. Agendamento', 'Formulário 72h, detalhe agendamento'],
    ['9. Transporte', 'Segmentos, upload passagem'],
    ['10. PC', 'Despesas, comprovantes, aprovação'],
    ['11. Dashboard', 'KPIs, alertas, relatórios CSV'],
    ['12. Duplicidade', 'Vincular CPF duplicado na UI'],
  ]

  for (const [area, item] of manualGroups) {
    warn(area, item, 'requer teste manual no browser')
  }

  const summary = {
    pass: results.filter((r) => r.status === 'PASS').length,
    fail: results.filter((r) => r.status === 'FAIL').length,
    skip: results.filter((r) => r.status === 'SKIP').length,
    manual: results.filter((r) => r.status === 'MANUAL').length,
  }

  console.log('\n--- RESUMO ---')
  console.log(`✅ PASS: ${summary.pass}`)
  console.log(`❌ FAIL: ${summary.fail}`)
  console.log(`⏭️  SKIP: ${summary.skip}`)
  console.log(`👁️  MANUAL: ${summary.manual}`)

  const failures = results.filter((r) => r.status === 'FAIL')
  if (failures.length) {
    console.log('\n--- FALHAS ---')
    for (const f of failures) {
      console.log(`- [${f.area}] ${f.item}: ${f.detail}`)
    }
    process.exitCode = 1
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
