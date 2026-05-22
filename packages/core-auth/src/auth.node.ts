import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'

import { authConfig } from './auth.config'
import type { SaudeMunicSession } from './types/session'

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: 'E-mail', type: 'email' },
        password: { label: 'Senha', type: 'password' },
      },
      async authorize(credentials) {
        const { authorizeCredentials } = await import('./auth-authorize')
        return authorizeCredentials(credentials)
      },
    }),
  ],
})

declare module 'next-auth' {
  interface Session {
    user: SaudeMunicSession['user']
    expires: string
  }
}
