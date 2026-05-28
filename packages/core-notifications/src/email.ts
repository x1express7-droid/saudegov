import nodemailer from 'nodemailer'

import type { SendEmailParams, SmtpConfig } from './types'

type ResolvedTransportConfig = {
  host: string
  port: number
  secure: boolean
  user: string
  password: string
}

function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined) {
    return defaultValue
  }

  const normalized = value.trim().toLowerCase()
  if (normalized === 'true') {
    return true
  }

  if (normalized === 'false') {
    return false
  }

  return defaultValue
}

function parsePort(value: string | undefined, defaultValue: number): number {
  if (!value || value.trim() === '') {
    return defaultValue
  }

  const parsed = Number.parseInt(value.trim(), 10)
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) {
    return defaultValue
  }

  return parsed
}

export function isSmtpTransportConfigured(smtpConfig: SmtpConfig | null): boolean {
  return resolveTransportConfig(smtpConfig) !== null
}

function resolveTransportConfig(smtpConfig: SmtpConfig | null): ResolvedTransportConfig | null {
  if (smtpConfig) {
    return {
      host: smtpConfig.host,
      port: smtpConfig.port,
      secure: smtpConfig.secure,
      user: smtpConfig.user,
      password: smtpConfig.password,
    }
  }

  const host = process.env.SMTP_PLATFORM_HOST?.trim() ?? ''
  if (!host) {
    return null
  }

  return {
    host,
    port: parsePort(process.env.SMTP_PLATFORM_PORT, 587),
    secure: parseBoolean(process.env.SMTP_PLATFORM_SECURE, true),
    user: process.env.SMTP_PLATFORM_USER?.trim() ?? '',
    password: process.env.SMTP_PLATFORM_PASSWORD ?? '',
  }
}

function buildHtmlWrapper(subject: string, htmlBody: string): string {
  return [
    '<!doctype html>',
    '<html lang="pt-BR">',
    '  <head><meta charset="utf-8" /></head>',
    '  <body style="margin:0;padding:24px;font-family:Arial,sans-serif;color:#111827;">',
    `    <h2 style="margin:0 0 16px 0;font-size:18px;">${subject}</h2>`,
    `    <div style="font-size:14px;line-height:1.6;">${htmlBody}</div>`,
    '  </body>',
    '</html>',
  ].join('')
}

/**
 * Envia e-mail com SMTP real (tenant custom ou plataforma).
 * Quando não há SMTP disponível, opera em modo stub sem lançar exceção.
 */
export async function sendEmail(
  params: SendEmailParams,
  smtpConfig: SmtpConfig | null
): Promise<void> {
  const transportConfig = resolveTransportConfig(smtpConfig)

  if (!transportConfig) {
    console.info('[sendEmail] SMTP indisponível; envio ignorado.', {
      evento: 'N/A',
      tenantId: 'N/A',
    })
    return
  }

  const from = params.from.trim()
  if (!from) {
    throw new Error('Remetente de e-mail não configurado.')
  }

  const transporter = nodemailer.createTransport({
    host: transportConfig.host,
    port: transportConfig.port,
    secure: transportConfig.secure,
    auth:
      transportConfig.user && transportConfig.password
        ? {
            user: transportConfig.user,
            pass: transportConfig.password,
          }
        : undefined,
  })

  try {
    await transporter.sendMail({
      from,
      to: params.to.join(', '),
      subject: params.subject,
      text: params.textBody,
      html: buildHtmlWrapper(params.subject, params.htmlBody),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido no envio SMTP.'
    console.error('[sendEmail] Falha no envio SMTP.', {
      evento: 'N/A',
      tenantId: 'N/A',
      message,
    })
    throw error
  }
}
