import { processarTransicaoTransporte } from '@saude/mod-saude-tfd'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

function isAuthorized(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    return false
  }

  const authHeader = request.headers.get('authorization')
  return authHeader === `Bearer ${cronSecret}`
}

export async function GET(request: Request): Promise<NextResponse> {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  try {
    const resumo = await processarTransicaoTransporte()
    return NextResponse.json(resumo)
  } catch (error) {
    console.error('[cron/tfd-transicao-transporte] Erro:', {
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    })
    return NextResponse.json(
      { error: 'Não foi possível processar a transição dos transportes.' },
      { status: 500 }
    )
  }
}
