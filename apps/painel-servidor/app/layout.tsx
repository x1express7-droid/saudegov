import type { Metadata } from 'next'
import { getTenantContext } from '@saude/core-auth'
import { themeToCssVarsStyle } from '../lib/theme-to-css-vars'
import './globals.css'

export async function generateMetadata(): Promise<Metadata> {
  const tenant = await getTenantContext()
  const theme = tenant.theme

  return {
    title: theme.municipalityName ?? 'Sistema de Saúde',
    ...(theme.faviconUrl ? { icons: { icon: theme.faviconUrl } } : {}),
  }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const tenant = await getTenantContext()
  const themeCssVars = themeToCssVarsStyle(tenant.theme)

  return (
    <html lang="pt-BR" style={themeCssVars}>
      <body className="antialiased">{children}</body>
    </html>
  )
}
