import { getPrismaForTenant } from '@saude/core-db'
import { resolveLocalAnexoPath, validarUrlAssinada } from '@saude/core-documents'
import { createReadStream } from 'fs'
import { access } from 'fs/promises'
import { Readable } from 'stream'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const ALLOWED_CONTENT_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
])

function getStorageProvider(): string {
  return process.env.STORAGE_PROVIDER?.trim().toLowerCase() ?? 'local'
}

function jsonForbidden(error: string): NextResponse {
  return NextResponse.json({ error }, { status: 403 })
}

function jsonNotFound(): NextResponse {
  return NextResponse.json({ error: 'Arquivo não encontrado.' }, { status: 404 })
}

export async function GET(
  request: Request,
  context: { params: Promise<{ anexoId: string }> }
): Promise<NextResponse> {
  if (getStorageProvider() !== 'local') {
    return NextResponse.json(
      { error: 'Download direto disponível apenas com armazenamento local.' },
      { status: 501 }
    )
  }

  const { anexoId } = await context.params

  if (!UUID_REGEX.test(anexoId)) {
    return jsonNotFound()
  }

  const url = new URL(request.url)
  const tenantId = url.searchParams.get('tenant')
  const expParam = url.searchParams.get('exp')
  const signature = url.searchParams.get('sig')

  if (!tenantId || !expParam || !signature) {
    return jsonForbidden('Link inválido ou expirado.')
  }

  if (!z.string().uuid().safeParse(tenantId).success) {
    return jsonForbidden('Link inválido ou expirado.')
  }

  const expiresAtUnix = Number.parseInt(expParam, 10)
  if (!Number.isFinite(expiresAtUnix)) {
    return jsonForbidden('Link inválido ou expirado.')
  }

  if (expiresAtUnix * 1000 < Date.now()) {
    return jsonForbidden('Link expirado.')
  }

  const assinaturaValida = validarUrlAssinada({
    purpose: 'download',
    tenantId,
    anexoId,
    expiresAtUnix,
    signature,
  })

  if (!assinaturaValida) {
    return jsonForbidden('Link inválido ou expirado.')
  }

  try {
    const db = await getPrismaForTenant(tenantId)
    const anexo = await db.anexo.findFirst({
      where: {
        id: anexoId,
        tenant_id: tenantId,
      },
      select: {
        storage_path: true,
        mime_type: true,
        confirmado: true,
      },
    })

    if (!anexo?.confirmado) {
      return jsonNotFound()
    }

    if (!ALLOWED_CONTENT_TYPES.has(anexo.mime_type)) {
      return jsonNotFound()
    }

    const absolutePath = resolveLocalAnexoPath(anexo.storage_path)

    try {
      await access(absolutePath)
    } catch {
      return jsonNotFound()
    }

    const nodeStream = createReadStream(absolutePath)
    const webStream = Readable.toWeb(nodeStream) as ReadableStream<Uint8Array>

    return new NextResponse(webStream, {
      status: 200,
      headers: {
        'Content-Type': anexo.mime_type,
        'Cache-Control': 'private, no-store',
      },
    })
  } catch {
    return NextResponse.json(
      { error: 'Não foi possível obter o arquivo.' },
      { status: 500 }
    )
  }
}
