import { getPrismaForTenant } from '@saude/core-db'
import {
  resolveLocalAnexoPath,
  validarUrlAssinada,
} from '@saude/core-documents'
import { writeFile } from 'fs/promises'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function getStorageProvider(): string {
  return process.env.STORAGE_PROVIDER?.trim().toLowerCase() ?? 'local'
}

function genericError(status: number): NextResponse {
  return NextResponse.json(
    { error: 'Não foi possível concluir o upload.' },
    { status }
  )
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ anexoId: string }> }
): Promise<NextResponse> {
  if (getStorageProvider() !== 'local') {
    return NextResponse.json(
      { error: 'Upload direto disponível apenas com armazenamento local.' },
      { status: 501 }
    )
  }

  const { anexoId } = await context.params

  if (!UUID_REGEX.test(anexoId)) {
    return genericError(400)
  }

  const url = new URL(request.url)
  const tenantId = url.searchParams.get('tenant')
  const expParam = url.searchParams.get('exp')
  const signature = url.searchParams.get('sig')

  if (!tenantId || !expParam || !signature) {
    return genericError(400)
  }

  if (!z.string().uuid().safeParse(tenantId).success) {
    return genericError(400)
  }

  const expiresAtUnix = Number.parseInt(expParam, 10)
  if (!Number.isFinite(expiresAtUnix)) {
    return genericError(400)
  }

  const valido = validarUrlAssinada({
    purpose: 'upload',
    tenantId,
    anexoId,
    expiresAtUnix,
    signature,
  })

  if (!valido) {
    return genericError(403)
  }

  try {
    const db = await getPrismaForTenant(tenantId)
    const anexo = await db.anexo.findFirst({
      where: { id: anexoId, tenant_id: tenantId },
      select: { storage_path: true },
    })

    if (!anexo) {
      return genericError(404)
    }

    const body = Buffer.from(await request.arrayBuffer())
    const absolutePath = resolveLocalAnexoPath(anexo.storage_path)
    await writeFile(absolutePath, body)

    return new NextResponse(null, { status: 200 })
  } catch {
    return genericError(500)
  }
}
