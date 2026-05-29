/**
 * Testes autenticados expandidos — páginas + upload action smoke test
 */
const BASE = 'http://localhost:3001'
const PASSWORD = 'senha123'

async function fetchJar(url, opts = {}, jar = new Map()) {
  const headers = new Headers(opts.headers ?? {})
  const cookie = [...jar.entries()].map(([k, v]) => `${k}=${v}`).join('; ')
  if (cookie) headers.set('cookie', cookie)
  const res = await fetch(url, { ...opts, headers, redirect: 'manual' })
  for (const raw of res.headers.getSetCookie?.() ?? []) {
    const p = raw.split(';')[0]
    const i = p.indexOf('=')
    if (i > 0) jar.set(p.slice(0, i), p.slice(i + 1))
  }
  return { res, jar, text: await res.text().catch(() => '') }
}

async function login(email) {
  const jar = new Map()
  const csrf = JSON.parse((await fetchJar(`${BASE}/api/auth/csrf`, {}, jar)).text).csrfToken
  await fetchJar(
    `${BASE}/api/auth/callback/credentials`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ csrfToken: csrf, email, password: PASSWORD, json: 'true' }),
    },
    jar
  )
  return jar
}

async function followGet(path, jar) {
  let url = `${BASE}${path}`
  for (let i = 0; i < 5; i++) {
    const { res, text } = await fetchJar(url, {}, jar)
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get('location')
      if (!loc) break
      url = loc.startsWith('http') ? loc : `${BASE}${loc}`
      continue
    }
    return { status: res.status, text, ok: res.status === 200 && !text.includes('Internal Server Error') }
  }
  return { status: 0, text: '', ok: false }
}

const checks = []

function report(area, item, ok, detail) {
  checks.push({ area, item, ok, detail })
  console.log(`${ok ? '✅' : '❌'} [${area}] ${item}${detail ? ' — ' + detail : ''}`)
}

async function main() {
  const gestor = await login('gestor@campograndems.saudemunic.com.br')
  const servidor = await login('servidor@campograndems.saudemunic.com.br')
  const admin = await login('nathan@x1express.com.br')

  const gestorPages = [
    '/saude/tfd/nova',
    '/saude/tfd/dashboard',
    '/saude/tfd/processos',
    '/saude/tfd/solicitacoes',
  ]

  for (const p of gestorPages) {
    const r = await followGet(p, gestor)
    report('HTTP gestor', p, r.ok, `HTTP ${r.status}`)
  }

  const adminConfig = await followGet('/configuracoes', admin)
  report('1. Auth', 'Admin /configuracoes (follow redirects)', adminConfig.ok, `HTTP ${adminConfig.status}`)

  const nova = await followGet('/saude/tfd/nova?pacienteId=db4da1e-249e-44d4-b85a-b3579967b4e1', servidor)
  report('2. Nova solicitação', 'Página /nova carrega', nova.ok, `HTTP ${nova.status}`)
  if (nova.text.includes('Tipo de atendimento')) report('2. Nova solicitação', 'Campo Tipo de atendimento presente', true)
  else report('2. Nova solicitação', 'Campo Tipo de atendimento presente', false)
  if (nova.text.includes('Dados clínicos') || nova.text.includes('Subjetivo')) report('2. Nova solicitação', 'Seção SOAP presente', true)
  else report('2. Nova solicitação', 'Seção SOAP presente', false)
  if (nova.text.includes('Laudo médico')) report('2. Nova solicitação', 'Seção Laudo presente', true)
  else report('2. Nova solicitação', 'Seção Laudo presente', false)

  const lista = await followGet('/saude/tfd', gestor)
  report('3. Listagem', '/saude/tfd carrega', lista.ok, `HTTP ${lista.status}`)
  if (lista.text.includes('Posição') || lista.text.includes('Posi')) report('3. Listagem', 'Coluna Posição no HTML', true)
  else report('3. Listagem', 'Coluna Posição no HTML', false, 'SSR pode renderizar client-side')

  const fails = checks.filter((c) => !c.ok)
  console.log(`\nTotal: ${checks.length}, Falhas: ${fails.length}`)
  if (fails.length) process.exit(1)
}

main().catch((e) => { console.error(e); process.exit(1) })
