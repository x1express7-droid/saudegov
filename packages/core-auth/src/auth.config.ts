import type { NextAuthConfig } from 'next-auth'
import type { SaudeMunicSession, UserRole } from './types/session'
import { authUsesSecureCookies } from './auth-env'

export const JWT_EXPIRY_SECONDS = parseInt(process.env.JWT_EXPIRY ?? '28800', 10)

const secureCookies = authUsesSecureCookies()

/** Config compartilhada — compatível com Edge (sem Prisma nem next/headers). */
export const authConfig = {
  basePath: '/api/auth',
  session: {
    strategy: 'jwt' as const,
    maxAge: JWT_EXPIRY_SECONDS,
  },
  jwt: {
    maxAge: JWT_EXPIRY_SECONDS,
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        const authUser = user as {
          id: string
          tenantId: string | null
          role: UserRole
          name: string
          email: string
          setorId?: string
          permissions: Record<string, boolean>
        }
        token.id = authUser.id
        token.tenantId = authUser.tenantId
        token.role = authUser.role
        token.name = authUser.name
        token.email = authUser.email
        token.setorId = authUser.setorId
        token.permissions = authUser.permissions
      }
      return token
    },
    session({ session, token }) {
      const saudeSession: SaudeMunicSession = {
        user: {
          id: token.id as string,
          tenantId: (token.tenantId as string | null | undefined) ?? null,
          role: token.role as UserRole,
          name: token.name as string,
          email: token.email as string,
          permissions: (token.permissions as Record<string, boolean> | undefined) ?? {},
        },
        expires: session.expires,
      }

      if (token.setorId) {
        saudeSession.user.setorId = token.setorId as string
      }

      return {
        ...session,
        user: saudeSession.user,
        expires: saudeSession.expires,
      }
    },
  },
  pages: {
    signIn: '/login',
  },
  trustHost: true,
  cookies: {
    sessionToken: {
      options: { secure: secureCookies },
    },
    callbackUrl: {
      options: { secure: secureCookies },
    },
    csrfToken: {
      options: { secure: secureCookies },
    },
  },
} satisfies Omit<NextAuthConfig, 'providers'>
