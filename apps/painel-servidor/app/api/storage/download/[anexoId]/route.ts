import {
  hasPermission,
  requireTenantRole,
} from '@saude/core-auth'
import { getPrismaForTenant } from '@saude/core-db'
import {
  createAuditLog,
  gerarUrlDownloadAnexo,
  StorageNotFoundError,
  StorageValidationError,
} from '@saude/core-documents'
import { TFD_PERMISSIONS } from '@saude/mod-saude-tfd'
import { NextResponse } from 'next/server'

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const LAUDO_DOWNLOAD_EXPIRES_MINUTES = 15

function jsonError(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status })
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ anexoId: string }> }
): Promise<NextResponse> {
  const session = await requireTenantRole('SERVIDOR')

  if (!hasPermission(session, TFD_PERMISSIONS.ANALISAR_LAUDO)) {
    return jsonError('Sem permissão para visualizar o laudo.', 403)
  }

  const { anexoId } = await context.params

  if (!UUID_REGEX.test(anexoId)) {
    return jsonError('Anexo não encontrado.', 404)
  }

  const tenantId = session.user.tenantId!
  if (!tenantId) {
    return jsonError('Sessão inválida.', 401)
  }

  try {
    const db = await getPrismaForTenant(tenantId)

    const anexo = await db.anexo.findFirst({
      where: {
        id: anexoId,
        tenant_id: tenantId,
      },
      select: { id: true },
    })

    if (!anexo) {
      return jsonError('Anexo não encontrado.', 404)
    }

    const { url, expiresAt } = await gerarUrlDownloadAnexo(
      {
        tenantId,
        anexoId,
        downloadExpiresInMinutes: LAUDO_DOWNLOAD_EXPIRES_MINUTES,
      },
      db
    )

    await createAuditLog({
      tenantId,
      userId: session.user.id,
      acao: 'READ_SENSITIVE',
      entidade: 'public_anexo',
      entidadeId: anexoId,
      payloadDepois: { acao: 'visualizacao_laudo' },
    })

    return NextResponse.json({
      url,
      expiresAt: expiresAt.toISOString(),
    })
  } catch (error) {
    if (error instanceof StorageNotFoundError) {
      return jsonError('Anexo não encontrado.', 404)
    }
    if (error instanceof StorageValidationError) {
      return jsonError(error.message, 422)
    }

    console.error('[storage/download] Erro:', {
      tenantId,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    })
    return jsonError('Não foi possível gerar o link de visualização.', 500)
  }
}
