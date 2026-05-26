import { resolveLocalExportPath, validarUrlAssinadaExport } from '@saude/core-documents'
import { createReadStream } from 'fs'
import { access } from 'fs/promises'
import { Readable } from 'stream'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

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
  context: { params: Promise<{ exportId: string }> }
): Promise<NextResponse> {
  if (getStorageProvider() !== 'local') {
    return NextResponse.json(
      { error: 'Download de exportação disponível apenas com armazenamento local.' },
      { status: 501 }
    )
  }

  const { exportId } = await context.params

  if (!UUID_REGEX.test(exportId)) {
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

  const assinaturaValida = validarUrlAssinadaExport({
    tenantId,
    exportId,
    expiresAtUnix,
    signature,
  })

  if (!assinaturaValida) {
    return jsonForbidden('Link inválido ou expirado.')
  }

  const fmtParam = url.searchParams.get('fmt')
  const formato =
    fmtParam === 'csv' ? 'csv' : fmtParam === 'json' ? 'json' : 'pdf'

  try {
    const absolutePath = resolveLocalExportPath(tenantId, exportId, formato)

    try {
      await access(absolutePath)
    } catch {
      return jsonNotFound()
    }

    const nodeStream = createReadStream(absolutePath)
    const webStream = Readable.toWeb(nodeStream) as ReadableStream<Uint8Array>

    const contentType =
      formato === 'csv'
        ? 'text/csv; charset=utf-8'
        : formato === 'json'
          ? 'application/json; charset=utf-8'
          : 'application/pdf'
    const filename =
      formato === 'csv'
        ? `exportacao-${exportId}.csv`
        : formato === 'json'
          ? `exportacao-${exportId}.json`
          : `relatorio-tfd-${exportId}.pdf`

    return new NextResponse(webStream, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'private, no-store',
      },
    })
  } catch {
    return NextResponse.json(
      { error: 'Não foi possível obter o relatório.' },
      { status: 500 }
    )
  }
}
