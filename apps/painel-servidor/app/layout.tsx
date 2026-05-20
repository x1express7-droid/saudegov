import type { Metadata } from 'next'
import type { CSSProperties } from 'react'
import { Geist, Geist_Mono } from 'next/font/google'
import { getTenantContext } from '@saude/core-auth'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

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
  const { theme } = tenant

  const cssVars = {
    '--color-primary': theme.primaryColor ?? '#1a5fa8',
    '--color-header-bg': theme.headerBgColor ?? theme.primaryColor ?? '#1a5fa8',
    '--color-header-text': theme.headerTextColor ?? '#ffffff',
  } as CSSProperties

  return (
    <html lang="pt-BR">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        style={cssVars}
      >
        {children}
      </body>
    </html>
  )
}
